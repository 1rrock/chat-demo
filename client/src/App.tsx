import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type ChatMsg = { nickname: string; text: string; ts: number };

// URL 파라미터에서 ROOMIDX 값을 가져오는 함수
const getRoomFromURL = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('ROOMIDX') || null; // null을 반환하도록 수정
};

// 환경에 따른 서버 URL 설정
const getServerUrl = () => {
  const isProd = typeof import.meta !== 'undefined' &&
    (import.meta.env?.MODE === 'production' || import.meta.env?.PROD === true);

  if (isProd) {
    return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVER_URL) ||
           'https://chat-demo-production-83c1.up.railway.app';
  }
  return 'http://localhost:3000';
};

function App() {
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(getRoomFromURL() || 'general');
  const [nickname, setNickname] = useState('1rrock');
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isJoined, setIsJoined] = useState(false); // 입장 상태를 명확히 관리
  const socketRef = useRef<Socket | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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
      const time = new Date(msg.ts).toLocaleTimeString();
      setLogs((prev) => [...prev, `${time} <${msg.nickname}> ${msg.text}`]);
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

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const onKeyPress: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
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
        gap: '8px',
        paddingTop: '12px',
        paddingBottom: '12px'
      }}>
        {logs.map((log, i) => {
          // 시스템 메시지 파싱
          if (log.includes('[시스템]') || log.includes('[입장]') || log.includes('[오류]')) {
            const isError = log.includes('[오류]');
            return (
              <div key={i} style={{
                textAlign: 'center',
                margin: '8px 0'
              }}>
                <span style={{
                  background: isError ? '#fee' : '#f0f0f0',
                  color: isError ? '#d32f2f' : '#666',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  display: 'inline-block'
                }}>
                  {log.replace(/\[(시스템|입장|오류)\]/, '')}
                </span>
              </div>
            );
          }

          // 채팅 메시지 파싱
          const chatMatch = log.match(/^(\d{1,2}:\d{2}:\d{2})\s+<(.+?)>\s+(.+)$/);
          if (chatMatch) {
            const [, time, nick, message] = chatMatch;
            const isMyMessage = nick === nickname;

            return (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMyMessage ? 'flex-end' : 'flex-start',
                marginBottom: '4px'
              }}>
                {!isMyMessage && (
                  <div style={{
                    fontSize: '12px',
                    color: '#8b95a1',
                    marginBottom: '4px',
                    marginLeft: '8px'
                  }}>
                    {nick}
                  </div>
                )}

                <div style={{
                  maxWidth: '70%',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '6px',
                  flexDirection: isMyMessage ? 'row-reverse' : 'row'
                }}>
                  <div style={{
                    background: isMyMessage ? '#3182f6' : '#ffffff',
                    color: isMyMessage ? 'white' : '#191f28',
                    padding: '12px 16px',
                    borderRadius: isMyMessage ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    fontSize: '15px',
                    lineHeight: '1.4',
                    border: isMyMessage ? 'none' : '1px solid #e5e8eb',
                    wordBreak: 'break-word'
                  }}>
                    {message}
                  </div>

                  <div style={{
                    fontSize: '11px',
                    color: '#8b95a1',
                    whiteSpace: 'nowrap'
                  }}>
                    {time}
                  </div>
                </div>
              </div>
            );
          }

          // 기타 메시지
          return (
            <div key={i} style={{
              textAlign: 'center',
              fontSize: '12px',
              color: '#8b95a1',
              margin: '4px 0'
            }}>
              {log}
            </div>
          );
        })}
        <div ref={logsEndRef} />
      </div>

      {/* 입력창 영역 */}
      {isJoined && (
        <div style={{
          background: '#ffffff',
          padding: '12px 16px 20px',
          borderTop: '1px solid #e5e8eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
            background: '#f2f4f6',
            borderRadius: '24px',
            padding: '8px 12px'
          }}>
            <input
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '16px',
                padding: '8px 4px',
                color: '#191f28',
                minHeight: '20px',
                resize: 'none'
              }}
              placeholder="메시지를 입력하세요..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              onKeyPress={onKeyPress}
              disabled={!connected}
            />

            <button
              onClick={send}
              disabled={!connected || !input.trim()}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: 'none',
                background: (!connected || !input.trim()) ? '#e5e8eb' : '#3182f6',
                color: 'white',
                cursor: (!connected || !input.trim()) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                transition: 'all 0.2s'
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
