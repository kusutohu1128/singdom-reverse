'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useGameRoom, GamePhase } from '@/hooks/useGameRoom';
import { TopicCreation } from '@/components/game/TopicCreation';
import { Gameplay } from '@/components/game/Gameplay';
import { LOBBY_MESSAGES, TOPIC_WAITING_MESSAGES, SHUFFLE_MESSAGES, RECORDING_WAITING_MESSAGES } from '@/lib/messages';
import { cn } from '@/lib/cn';
import { motion, AnimatePresence } from 'framer-motion';

export default function RoomPage() {
  const { roomId } = useParams();
  const searchParams = useSearchParams();
  const username = searchParams.get('username') || 'Anonymous';

  const {
    roomCode,
    players,
    gameState,
    joinRoom,
    startGame,
    updatePhase,
    myId,
    isHost,
    broadcastSubmission,
    broadcastRaw,
    submissions,
    assignments,
    answers
  } = useGameRoom();

  const isCreator = searchParams.get('isCreator') === 'true';

  // Join Room
  useEffect(() => {
    if (typeof roomId === 'string' && myId) {
      joinRoom(roomId, username, isCreator);
    }
  }, [roomId, username, myId, isCreator, joinRoom]);

  // Random Messages (Set after mount to avoid hydration mismatch)
  const [msgLobby, setMsgLobby] = useState('');
  const [msgTopicWait, setMsgTopicWait] = useState('');
  const [msgShuffle, setMsgShuffle] = useState('');
  const [msgRecordingWait, setMsgRecordingWait] = useState('');

  useEffect(() => {
    setMsgLobby(LOBBY_MESSAGES[Math.floor(Math.random() * LOBBY_MESSAGES.length)]);
    setMsgTopicWait(TOPIC_WAITING_MESSAGES[Math.floor(Math.random() * TOPIC_WAITING_MESSAGES.length)]);
    setMsgShuffle(SHUFFLE_MESSAGES[Math.floor(Math.random() * SHUFFLE_MESSAGES.length)]);
    setMsgRecordingWait(RECORDING_WAITING_MESSAGES[Math.floor(Math.random() * RECORDING_WAITING_MESSAGES.length)]);
  }, []);

  // Host Logic: Monitor State
  // CRITICAL: Only run if we are definitively the host (gameState.hostId matches myId)
  useEffect(() => {
    // Guard: Skip if hostId is not yet set or we are not the host
    if (!gameState.hostId || gameState.hostId !== myId) return;

    console.log('[Host Log] Phase:', gameState.phase);
    console.log('[Host Log] Submissions:', Object.keys(submissions).length, '/', players.length);
    console.log('[Host Log] Answers:', Object.keys(answers).length, '/', players.length);

    // 1. Topic Creation -> Shuffle
    if (gameState.phase === 'TOPIC_CREATION') {
      const allPlayersSubmitted = players.length > 0 && players.every(p => !!submissions[p.id]);

      if (allPlayersSubmitted) {
        console.log('[Host Log] All active players submitted! Shuffling...');
        updatePhase('SHUFFLE');

        const playerIds = players.map(p => p.id);
        const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

        const mapping: Record<string, any> = {};
        // Ensure everyone gets someone else's topic by shifting the shuffled array
        for (let i = 0; i < shuffled.length; i++) {
          const receiverId = shuffled[i];
          const giverId = shuffled[(i + 1) % shuffled.length];
          mapping[receiverId] = submissions[giverId];
        }

        broadcastSubmission('assignments', mapping);
        setTimeout(() => {
          updatePhase('RECORDING');
        }, 3000);
      }
    }

    // 2. Recording -> Result
    if (gameState.phase === 'RECORDING') {
      const allPlayersAnswered = players.length > 0 && players.every(p => !!answers[p.id]);
      if (allPlayersAnswered) {
        updatePhase('RESULT');
      }
    }

  }, [gameState.hostId, myId, gameState.phase, submissions, answers, players, updatePhase, broadcastRaw]);

  const handleTopicSubmit = (data: any) => {
    broadcastSubmission('topicSubmitted', data);
  };

  const handleAnswerSubmit = (data: any) => {
    broadcastSubmission('answerSubmitted', data);
  };

  const myAssignment = myId ? assignments[myId] : null;

  return (
    <main className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 min-h-[600px] border-8 border-orange-500 relative overflow-hidden">
        <header className="flex justify-between items-start mb-10 pb-6 border-b-4 border-orange-50">
          <div className="flex flex-col">
            <h2 className="font-black text-3xl text-orange-500 tracking-tighter uppercase italic">ROOM: {roomCode}</h2>
            <span className="text-[10px] text-gray-400 font-mono mt-1 opacity-50">ID: {myId?.substring(0, 8)}</span>
          </div>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-end"
          >
            <span className="bg-orange-500 text-white px-4 py-2 rounded-2xl font-black text-sm shadow-lg whitespace-nowrap uppercase tracking-widest">
              {gameState.phase}
            </span>
          </motion.div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={gameState.phase}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 1.1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="w-full"
          >
            {/* LOBBY */}
            {gameState.phase === 'LOBBY' && (
              <div className="space-y-8">
                <h3 className="text-3xl font-black text-center text-gray-800 uppercase italic underline decoration-orange-200 decoration-8 underline-offset-4">待機室（現在 {players.length}人）</h3>
                <div className="grid grid-cols-2 gap-4">
                  {players.map((p, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.05, rotate: i % 2 === 0 ? 1 : -1 }}
                      className="bg-white border-4 border-orange-100 p-5 rounded-3xl flex items-center gap-4 shadow-xl relative overflow-hidden group"
                    >
                      <div className={`w-4 h-4 rounded-full ${p.isHost ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
                      <span className="font-black text-xl text-gray-900 truncate">{p.name} {p.id === myId && '(あなた)'}</span>
                      {p.isHost && (
                        <span className="absolute -right-2 -top-2 bg-yellow-400 text-yellow-900 text-[10px] font-black px-4 py-1 rotate-12 shadow-md uppercase tracking-tighter">
                          HOST
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>

                {isHost ? (
                  <div className="flex flex-col items-center gap-4 mt-12 pb-10">
                    <button
                      onClick={startGame}
                      disabled={players.length < 2}
                      className="group relative bg-orange-500 text-white px-14 py-8 rounded-[40px] font-black text-3xl shadow-[0_12px_0_rgb(194,65,12)] hover:shadow-[0_6px_0_rgb(194,65,12)] hover:translate-y-[6px] active:shadow-none active:translate-y-[12px] transition-all"
                    >
                      {players.length < 2 ? "誰かが来るのを待機中..." : "🚀 ゲームをはじめる！"}
                    </button>
                    <p className="text-sm text-orange-400 font-black animate-bounce mt-4 uppercase italic">あなたがリーダーです！</p>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-2xl font-black text-orange-200 animate-pulse italic tracking-tighter uppercase">{msgLobby}</div>
                    <p className="text-[10px] text-gray-300 mt-6 font-mono opacity-50 italic">Room ID: {roomCode}</p>
                  </div>
                )}
              </div>
            )}

            {/* TOPIC CREATION */}
            {gameState.phase === 'TOPIC_CREATION' && (
              <div className="text-center py-4">
                <h3 className="text-3xl font-black mb-10 italic text-gray-800 uppercase underline decoration-orange-500 decoration-4">録音する曲を決めてね！</h3>
                {submissions[myId!] ? (
                  <div className="text-orange-500 font-black p-14 bg-orange-50 rounded-[40px] border-4 border-orange-200 text-2xl shadow-inner flex flex-col items-center gap-4">
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                      準備完了！ ✨
                    </motion.div>
                    <div className="text-sm text-orange-300 font-black uppercase tracking-widest text-center">
                      {msgTopicWait} ({Object.keys(submissions).length} / {players.length})
                    </div>
                  </div>
                ) : (
                  <TopicCreation onTopicSubmit={handleTopicSubmit} />
                )}
              </div>
            )}

            {/* SHUFFLE */}
            {gameState.phase === 'SHUFFLE' && (
              <div className="flex flex-col items-center justify-center h-80 gap-8">
                <motion.div
                  animate={{ rotate: 360, scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="text-9xl filter drop-shadow-2xl"
                >
                  🌪️
                </motion.div>
                <h2 className="text-6xl font-black text-orange-500 italic tracking-tighter uppercase">{msgShuffle}</h2>
                <p className="mt-4 text-gray-400 font-black italic uppercase tracking-widest text-center">しばらくお待ちください... 🙏</p>
              </div>
            )}

            {/* RECORDING */}
            {gameState.phase === 'RECORDING' && (
              <div className="text-center py-4">
                <h3 className="text-3xl font-black mb-10 italic text-gray-800 uppercase underline decoration-orange-500 decoration-4 text-center">きいて、真似して！</h3>
                {answers[myId!] ? (
                  <div className="text-green-500 font-black p-14 bg-green-50 rounded-[40px] border-4 border-green-200 text-2xl shadow-inner flex flex-col items-center gap-4">
                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                      テシュツ完了！ ✅
                    </motion.div>
                    <p className="text-sm text-green-300 font-black italic uppercase tracking-widest text-center">{msgRecordingWait}</p>
                  </div>
                ) : myAssignment ? (
                  <Gameplay
                    assignment={myAssignment}
                    onAnswerSubmit={handleAnswerSubmit}
                  />
                ) : (
                  <div className="text-gray-200 animate-pulse italic text-2xl font-black uppercase tracking-tighter py-20">お題を読み込み中...</div>
                )}
              </div>
            )}

            {/* RESULT */}
            {gameState.phase === 'RESULT' && (
              <ResultsView
                submissions={submissions}
                assignments={assignments}
                answers={answers}
                players={players}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Debug Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 text-green-400 p-2 font-mono text-[10px] flex gap-4 overflow-x-auto whitespace-nowrap z-50">
        <span>ID: {myId}</span>
        <span>Host: {gameState.hostId} ({isHost ? 'ME' : 'OTHER'})</span>
        <span>Players: {players.length}</span>
        <span>Subs: {Object.keys(submissions).length}</span>
        <span>Answers: {Object.keys(answers).length}</span>
        <button onClick={() => console.log({ players, submissions, assignments, answers })} className="underline text-blue-400 hover:text-blue-300">Log State</button>
      </div>
    </main>
  );
}

function ResultsView({ submissions, assignments, answers, players }: any) {
  return (
    <div className="text-center py-4">
      <h3 className="text-4xl font-black mb-14 italic text-gray-800 uppercase underline decoration-orange-500 decoration-[12px] underline-offset-8">結果発表！</h3>
      <div className="space-y-16 pb-20">
        {Object.keys(submissions).map((uid, index) => {
          const topic = submissions[uid];
          const answererId = Object.keys(assignments).find(aid => assignments[aid].originalUrl === topic.originalUrl);
          const answerData = answererId ? answers[answererId] : null;
          return <ResultCard key={uid} index={index} topic={topic} answerData={answerData} players={players} uid={uid} answererId={answererId} />;
        })}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="mt-10">
        <button
          onClick={() => window.location.reload()}
          className="bg-gray-100 hover:bg-orange-500 hover:text-white text-gray-400 px-10 py-5 rounded-3xl font-black italic transition-all uppercase tracking-[0.2em] shadow-lg hover:shadow-orange-200"
        >
          🏠 ロビーに戻る
        </button>
      </motion.div>
    </div>
  );
}

function ResultCard({ index, topic, answerData, players, uid, answererId }: any) {
  const [origMode, setOrigMode] = useState<'normal' | 'reverse'>('normal');
  const [coverMode, setCoverMode] = useState<'normal' | 'reverse'>('reverse');

  const creator = players.find((p: any) => p.id === uid)?.name || uid.substring(0, 4);
  const answerer = players.find((p: any) => p.id === answererId)?.name || answererId?.substring(0, 4) || '誰かさん';

  return (
    <motion.div
      initial={{ x: index % 2 === 0 ? -100 : 100, opacity: 0, rotate: index % 2 === 0 ? -2 : 2 }}
      animate={{ x: 0, opacity: 1, rotate: 0 }}
      transition={{ delay: index * 0.3, type: 'spring' }}
      className="border-8 border-orange-50 p-10 rounded-[50px] bg-white shadow-2xl relative"
    >
      <div className="absolute -top-6 -left-6 bg-orange-500 text-white font-black text-2xl w-16 h-16 flex items-center justify-center rounded-3xl shadow-xl rotate-[-10deg]">
        {index + 1}
      </div>

      {/* ORIGINAL SECTION */}
      <div className="mb-10 text-left pl-4">
        <p className="font-black text-orange-400 text-xs italic mb-2 uppercase tracking-widest">お題を作成した人: {creator}</p>
        <div className="font-black text-4xl mb-6 text-gray-900 tracking-tighter uppercase leading-none">{topic.answerText}</div>

        <div className="bg-orange-50 p-6 rounded-[30px] border-4 border-orange-100">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOrigMode('normal')}
              className={cn("flex-1 py-3 rounded-2xl font-black text-xs transition-all", origMode === 'normal' ? "bg-orange-500 text-white shadow-lg scale-105" : "bg-white text-orange-200")}
            >
              正解の音
            </button>
            <button
              onClick={() => setOrigMode('reverse')}
              className={cn("flex-1 py-3 rounded-2xl font-black text-xs transition-all", origMode === 'reverse' ? "bg-orange-500 text-white shadow-lg scale-105" : "bg-white text-orange-200")}
            >
              逆再生
            </button>
          </div>
          <audio key={`orig-${uid}-${origMode}`} src={origMode === 'normal' ? topic.originalUrl : topic.reversedUrl} controls className="w-full h-10" />
        </div>
      </div>

      <div className="flex justify-center my-10">
        <div className="w-full h-1 bg-orange-50 rounded-full flex items-center justify-center">
          <span className="bg-white px-4 text-orange-100 font-black text-xs italic uppercase tracking-[0.5em]">VS</span>
        </div>
      </div>

      {/* COVER SECTION */}
      <div className="text-left pl-4 text-purple-900">
        <p className="font-black text-purple-400 text-xs italic mb-2 uppercase tracking-widest">マネした人: {answerer}</p>
        {answerData ? (
          <div className="space-y-4">
            {answerData.effect !== 'none' && (
              <span className="inline-block bg-purple-600 text-white font-black text-[10px] px-6 py-1.5 rounded-full uppercase italic shadow-md">
                エフェクト: {answerData.effect}
              </span>
            )}
            <div className="bg-purple-50 p-6 rounded-[30px] border-4 border-purple-100">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setCoverMode('normal')}
                  className={cn("flex-1 py-3 rounded-2xl font-black text-xs transition-all", coverMode === 'normal' ? "bg-purple-600 text-white shadow-lg scale-105" : "bg-white text-purple-200")}
                >
                  復活再生
                </button>
                <button
                  onClick={() => setCoverMode('reverse')}
                  className={cn("flex-1 py-3 rounded-2xl font-black text-xs transition-all", coverMode === 'reverse' ? "bg-purple-600 text-white shadow-lg scale-105" : "bg-white text-purple-200")}
                >
                  録音した音
                </button>
              </div>
              <audio key={`cover-${uid}-${coverMode}`} src={coverMode === 'reverse' ? answerData.audioUrl : answerData.reversedAudioUrl} controls className="w-full h-10" />
            </div>
          </div>
        ) : (
          <div className="py-12 bg-red-50 rounded-[40px] border-4 border-red-100 text-center shadow-inner">
            <p className="text-red-500 font-black italic uppercase text-lg animate-pulse">提出されていません 😱</p>
          </div>
        )}
      </div>
    </motion.div >
  );
}
