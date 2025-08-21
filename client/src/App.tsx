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
      forceNew: true,
      timeout: 20000,
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
        socket.emit('join', { room: urlRoom, nickname });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setConnected(false);
      setIsJoined(false); // 연결 끊어지면 입장 상태도 초기화
      setLogs((prev) => [...prev, `[시스템] 서버 연결이 끊어졌습니다. (${reason})`]);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setLogs((prev) => [...prev, `[오류] 연결 실패: ${error.message}`]);
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
    <div style={{ maxWidth: 680, margin: '24px auto', fontFamily: 'system-ui' }}>
      <h1>WS Chat (Nest + React)</h1>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <span>
          상태: <b style={{ color: connected ? 'green' : 'crimson' }}>{connected ? '연결됨' : '끊김'}</b>
        </span>
        <span>
          입장: <b style={{ color: isJoined ? 'blue' : 'gray' }}>{isJoined ? '입장됨' : '미입장'}</b>
        </span>
        {socketRef.current?.id && <span style={{ fontSize: '12px', color: '#666' }}>ID: {socketRef.current.id}</span>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <input placeholder="채널(방)" value={room} onChange={(e) => setRoom(e.target.value)} />
        <button onClick={join} disabled={!connected}>
          {isJoined ? '재입장' : '입장'}
        </button>
      </div>

      <div
        style={{
          border: '1px solid #ccc',
          borderRadius: 8,
          padding: 12,
          height: 360,
          overflow: 'auto',
          background: '#111',
          color: '#eee',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}
      >
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
        <div ref={logsEndRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          style={{ flex: 1 }}
          placeholder={isJoined ? "메시지 입력 후 Enter" : "먼저 채널에 입장해주세요"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onKeyPress={onKeyPress}
          disabled={!connected || !isJoined}
        />
        <button onClick={send} disabled={!connected || !isJoined}>보내기</button>
      </div>
    </div>
  );
}

export default App;
