'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = () => {
    if (!username.trim()) {
      alert('Please enter a nickname');
      return;
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    // Save username to local storage or URL query to pass to room page?
    // Passing via URL query param is simplest for MVP.
    router.push(`/room/${code}?username=${encodeURIComponent(username)}&isCreator=true`);
  };

  const handleJoinRoom = () => {
    if (!username.trim() || !roomCode.trim()) {
      alert('Please enter nickname and room code');
      return;
    }
    router.push(`/room/${roomCode}?username=${encodeURIComponent(username)}&isCreator=false`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-yellow-50 text-gray-900 font-sans">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 border-8 border-orange-500 transform hover:scale-[1.01] transition-transform">
        <h1 className="text-5xl font-black text-center mb-10 text-orange-500 tracking-tighter transform -rotate-3 select-none">
          歌王国<br />
          <span className="text-3xl text-orange-400">REVERSE</span>
        </h1>

        <div className="space-y-8">
          <div>
            <label className="block text-sm font-black text-gray-400 mb-2 ml-2 italic uppercase">あなたのなまえ</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ニックネームを入力してね"
              className="w-full p-5 rounded-2xl border-4 border-gray-100 focus:border-orange-500 focus:outline-none text-xl font-black transition-all placeholder:text-gray-200"
            />
          </div>

          <div className="pt-4">
            <button
              onClick={handleCreateRoom}
              className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white p-6 rounded-[24px] font-black text-2xl shadow-[0_8px_0_rgb(194,65,12)] hover:shadow-[0_4px_0_rgb(194,65,12)] hover:translate-y-[4px] active:shadow-none active:translate-y-[8px] transition-all animate-bounce-subtle"
            >
              🚀 新しい部屋を作る
            </button>
          </div>

          <div className="relative flex items-center gap-4 py-4">
            <div className="h-1 bg-gray-100 flex-1 rounded-full"></div>
            <span className="text-gray-300 font-black text-sm italic uppercase tracking-widest">または</span>
            <div className="h-1 bg-gray-100 flex-1 rounded-full"></div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-black text-gray-400 mb-2 ml-2 italic uppercase">部屋コード</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="コードを入力"
                className="w-full p-5 rounded-2xl border-4 border-gray-100 focus:border-blue-500 focus:outline-none text-xl font-black uppercase tracking-[0.3em] transition-all placeholder:text-gray-200 text-center"
              />
            </div>
            <button
              onClick={handleJoinRoom}
              className="w-full bg-blue-500 hover:bg-blue-600 active:scale-95 text-white p-6 rounded-[24px] font-black text-2xl shadow-[0_8px_0_rgb(29,78,216)] hover:shadow-[0_4px_0_rgb(29,78,216)] hover:translate-y-[4px] active:shadow-none active:translate-y-[8px] transition-all"
            >
              ✨ 遊びにいく！
            </button>
          </div>
        </div>
      </div>

      <p className="mt-12 text-gray-300 font-black italic uppercase tracking-tighter text-sm">
        Produced by Utakingdom Team 🎤
      </p>
    </main>
  );
}

