import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type ChatMsg = { nickname: string; text: string; ts: number };

function App() {
  // URL 파라미터에서 ROOMIDX 또는 room 값을 읽어 방 이름 반환
  const getRoomFromURL = (): string | null => {
    try {
      const params = new URLSearchParams(window.location.search);
      const val = params.get('ROOMIDX') || params.get('room') || params.get('channel');
      return val && val.trim() ? val.trim() : null;
    } catch {
      return null;
    }
  };

  // 실행 환경에 맞는 서버 URL 결정
  const getServerUrl = (): string => {
    const env: any = (import.meta as any)?.env || {};
    const explicit = env?.VITE_SERVER_URL;
    if (explicit && typeof explicit === 'string' && explicit.trim()) return explicit.trim();
    // 프로덕션이면 동일 오리진, 개발이면 localhost:3000
    const isProd = !!(env?.MODE === 'production' || env?.PROD);
    return isProd ? window.location.origin : 'http://localhost:3000';
  };

  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(getRoomFromURL() || 'general');
  const [nickname, setNickname] = useState('1rrock');
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]); // chat payload 보관
  const [isJoined, setIsJoined] = useState(false); // 입장 상태를 명확히 관리
  const socketRef = useRef<Socket | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);
  // messages 변경 시에도 스크롤 하단 고정
  const msgsEndRef = logsEndRef; // 동일 ref 재사용
  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    console.log('Creating socket connection...');
    const serverUrl = getServerUrl();
    console.log('Server URL:', serverUrl);

    const socket = io(serverUrl, {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      autoConnect: true,
      forceNew: false, // Railway에서 연결 재사용
      timeout: 30000, // 타임아웃 증가
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to server:', socket.id);
      setConnected(true);
      setLogs((prev) => [...prev, `[시스템] 서버에 연결되었습니다. (${socket.id})`]);

      // URL에 ROOMIDX 파라미터가 있으면 자동으로 입장
      const urlRoom = getRoomFromURL();
      if (urlRoom && !isJoined) {
        console.log('🚪 Auto joining room from URL:', urlRoom);
        setRoom(urlRoom);
        // 연결 후 약간의 지연을 두고 입장 시도
        setTimeout(() => {
          socket.emit('join', { room: urlRoom, nickname });
        }, 500);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setConnected(false);
      setIsJoined(false);
      setLogs((prev) => [...prev, `[시스템] 서버 연결이 끊어졌습니다. (${reason})`]);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setConnected(false);
      setLogs((prev) => [...prev, `[오류] 연결 실패: ${error.message || '서버 연결 실패'}`]);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      setLogs((prev) => [...prev, `[시스템] 서버에 재연결되었습니다.`]);
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection failed:', error);
      setLogs((prev) => [...prev, `[오류] 재연결 실패`]);
    });

    socket.on('joined', (data: { room: string }) => {
      console.log('✅ Joined room:', data);
      setIsJoined(true); // 입장 성공 시 상태 업데이트
      setLogs((prev) => [...prev, `[입장] 방: ${data.room}에 입장했습니다.`]);
    });

    socket.on('system', (text: string) => {
      console.log('📢 System message:', text);
      setLogs((prev) => [...prev, `[시스템] ${text}`]);
    });

    socket.on('chat', (msg: ChatMsg) => {
      console.log('💬 Chat message:', msg);
      setMessages((prev) => [...prev, msg]); // payload로 직접 렌더
      // 로그 문자열은 더 이상 추가하지 않음 (중앙 정렬 이슈 방지)
    });

    return () => {
      console.log('Cleaning up socket connection...');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('joined');
      socket.off('system');
      socket.off('chat');
      socket.disconnect();
    };
  }, []); // 의존성 배열을 비워서 무한 재연결 방지

  const join = () => {
    if (!nickname || !room) {
      setLogs((prev) => [...prev, `[오류] 닉네임과 방 이름을 입력해주세요.`]);
      return;
    }
    if (!connected || !socketRef.current) {
      setLogs((prev) => [...prev, `[오류] 서버에 연결되지 않았습니다.`]);
      return;
    }

    console.log('🚪 Joining room:', { room, nickname });
    socketRef.current.emit('join', { room, nickname });
    setLogs((prev) => [...prev, `[시도] ${room} 방에 입장을 시도합니다...`]);
  };

  const send = () => {
    if (!input.trim()) {
      setLogs((prev) => [...prev, `[오류] 메시지를 입력해주세요.`]);
      return;
    }

    // 메시지 길이 제한 (Railway 비용 절약)
    if (input.length > 1000) {
      setLogs((prev) => [...prev, `[오류] 메시지가 너무 깁니다. (최대 1000자)`]);
      return;
    }

    if (!connected || !socketRef.current) {
      setLogs((prev) => [...prev, `[오류] 서버에 연결되지 않았습니다.`]);
      return;
    }
    if (!isJoined) {
      setLogs((prev) => [...prev, `[오류] 먼저 채널에 입장해주세요.`]);
      return;
    }

    console.log('💬 Sending chat:', { room, text: input });
    socketRef.current.emit('chat', { room, text: input });
    setInput('');
  };

  // Enter 키 처리 (onKeyPress 제거)
  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{
      maxWidth: 390,
      margin: '0 auto',
      height: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#f8f9fa',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 토스 스타일 헤더 */}
      <div style={{
        background: '#ffffff',
        padding: '12px 20px',
        borderBottom: '1px solid #e5e8eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3182f6, #1b64da)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {room.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '16px', color: '#191f28' }}>
              {room}
            </div>
            <div style={{ fontSize: '12px', color: '#8b95a1' }}>
              {connected ? '온라인' : '오프라인'} • {isJoined ? '참여중' : '미참여'}
            </div>
          </div>
        </div>

        {/* 설정 버튼 */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: '#f2f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}>
          <span style={{ fontSize: '16px' }}>⚙️</span>
        </div>
      </div>

      {/* 입장 영역 - 미입장시에만 표시 */}
      {!isJoined && (
        <div style={{
          background: '#ffffff',
          margin: '12px 16px',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid #e5e8eb'
        }}>
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#191f28', marginBottom: '8px' }}>
              채팅방 입장
            </div>
            <div style={{ fontSize: '14px', color: '#8b95a1' }}>
              닉네임을 입력하고 채팅을 시작하세요
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              style={{
                padding: '16px',
                border: '1px solid #e5e8eb',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s',
                background: '#ffffff'
              }}
              placeholder="닉네임 입력"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = '#3182f6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e8eb'}
            />

            <input
              style={{
                padding: '16px',
                border: '1px solid #e5e8eb',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s',
                background: '#ffffff'
              }}
              placeholder="채팅방 이름"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = '#3182f6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e8eb'}
            />

            <button
              onClick={join}
              disabled={!connected || !nickname.trim() || !room.trim()}
              style={{
                padding: '16px',
                background: (!connected || !nickname.trim() || !room.trim()) ? '#e5e8eb' : '#3182f6',
                color: (!connected || !nickname.trim() || !room.trim()) ? '#8b95a1' : 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: (!connected || !nickname.trim() || !room.trim()) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              입장하기
            </button>
          </div>
        </div>
      )}

      {/* 채팅 메시지 영역 */}
      <div style={{
        flex: 1,
        padding: '0 16px',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '12px',
        paddingBottom: '12px',
        background: '#f8f9fa'
      }}>
        {/* 시스템 배지들 (순서 보장은 안되지만 시안 유지) */}
        {logs.filter(l => l.includes('[시스템]') || l.includes('[입장]') || l.includes('[오류]') || l.includes('[시도]')).map((log, i) => {
          const isError = log.includes('[오류]');
          return (
            <div key={`sys-${i}`} style={{ textAlign: 'center', margin: '10px 0' }}>
              <span style={{
                background: isError ? '#fee2e2' : '#f3f4f6',
                color: isError ? '#dc2626' : '#6b7280',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                display: 'inline-block',
                fontWeight: 500
              }}>
                {log.replace(/\[(시스템|입장|오류|시도)\]/, '').trim()}
              </span>
            </div>
          );
        })}

        {/* 채팅 말풍선 (payload 기반) */}
        {messages.map((m, i) => {
          const isMine = m.nickname.trim().toLowerCase() === nickname.trim().toLowerCase();
          const time = new Date(m.ts).toLocaleTimeString();
          return (
            <div key={`msg-${i}`} style={{
              display: 'flex',
              justifyContent: isMine ? 'flex-end' : 'flex-start',
              marginBottom: 12,
              width: '100%',
              alignItems: 'flex-end'
            }}>
              <div style={{
                maxWidth: '75%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start'
              }}>
                {!isMine && (
                  <div style={{ fontSize: 12, color: '#8b95a1', margin: '0 0 4px 8px' }}>{m.nickname}</div>
                )}
                <div style={{
                  display: 'flex',
                  gap: 6,
                  alignItems: 'flex-end',
                  flexDirection: isMine ? 'row-reverse' : 'row'
                }}>
                  <div style={{
                    background: isMine ? '#3182f6' : '#f1f3f4',
                    color: isMine ? '#ffffff' : '#191f28',
                    padding: '10px 14px',
                    borderRadius: isMine ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                    boxShadow: isMine ? '0 1px 2px rgba(49,130,246,.25)' : '0 1px 2px rgba(0,0,0,.06)',
                    wordBreak: 'break-word',
                    lineHeight: 1.45,
                    fontSize: 15,
                  }}>
                    {m.text}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', marginBottom: 2 }}>{time}</div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={logsEndRef} />
      </div>

      {/* 입력창 영역 */}
      {isJoined && (
        <div style={{ background: '#ffffff', padding: '12px 16px 20px', borderTop: '1px solid #e5e8eb' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: '#f2f4f6', borderRadius: 24, padding: '8px 12px' }}>
            <input
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, padding: '8px 4px', color: '#191f28' }}
              placeholder="메시지를 입력하세요..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={!connected}
            />
            <button onClick={send} disabled={!connected || !input.trim()} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: (!connected || !input.trim()) ? '#e5e8eb' : '#3182f6', color: '#fff', cursor: (!connected || !input.trim()) ? 'not-allowed' : 'pointer' }}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
