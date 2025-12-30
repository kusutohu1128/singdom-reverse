'use client';

import { useState } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { reverseAudio } from '@/lib/audio';
import { cn } from '@/lib/cn';
import { motion, AnimatePresence } from 'framer-motion';

interface TopicCreationProps {
  onTopicSubmit: (data: { originalUrl: string; reversedUrl: string; answerText: string }) => void;
}

export function TopicCreation({ onTopicSubmit }: TopicCreationProps) {
  const {
    isRecording,
    startRecording,
    stopRecording,
    audioUrl,
    audioBlob,
    resetRecording,
    volumeLevel,
    error: recordError
  } = useAudioRecorder();

  const [answerText, setAnswerText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!audioBlob || !answerText.trim()) return;

    setIsProcessing(true);
    try {
      // 1. Upload original
      const originalFormData = new FormData();
      originalFormData.append('file', audioBlob, 'original.webm');

      const uploadRes1 = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/upload`, {
        method: 'POST',
        body: originalFormData,
      });
      const originalJson = await uploadRes1.json();
      const originalUrl = originalJson.url;

      // 2. Reverse audio
      const reversedBlob = await reverseAudio(audioBlob);

      // 3. Upload reversed
      const reversedFormData = new FormData();
      reversedFormData.append('file', reversedBlob, 'reversed.wav');

      const uploadRes2 = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/upload`, {
        method: 'POST',
        body: reversedFormData,
      });
      const reversedJson = await uploadRes2.json();
      const reversedUrl = reversedJson.url;

      // 4. Submit
      onTopicSubmit({
        originalUrl,
        reversedUrl,
        answerText
      });

    } catch (e) {
      console.error(e);
      alert('Failed to process/upload audio');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">

      <div className="relative group">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!!audioUrl || isProcessing}
          className={cn(
            "w-32 h-32 rounded-full flex flex-col items-center justify-center text-white font-black text-xl shadow-2xl transition-all border-8 border-transparent hover:border-white/20",
            isRecording ? "bg-red-500 scale-110" : "bg-orange-500 hover:bg-orange-600 active:scale-95",
            audioUrl && "bg-gray-400 cursor-not-allowed"
          )}
        >
          {isRecording ? "停止" : audioUrl ? "完了" : "録音"}
        </button>

        {/* Animated Rings when recording */}
        {isRecording && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute inset-0 rounded-full border-4 border-red-400 -z-10"
          />
        )}
      </div>

      {isRecording && (
        <div className="w-full max-w-xs space-y-2">
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden border-2 border-gray-300">
            <motion.div
              className={cn("h-full transition-colors", volumeLevel < 20 ? "bg-yellow-400" : "bg-green-500")}
              animate={{ width: `${volumeLevel}%` }}
              transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
            />
          </div>
          <p className={cn("text-xs font-bold text-center", volumeLevel < 20 ? "text-orange-500" : "text-green-600")}>
            {volumeLevel < 20 ? "声が小さいです！もう少し大きく！" : "いい感じです！"}
          </p>
        </div>
      )}

      {recordError && <p className="text-red-500 text-xs font-bold">{recordError}</p>}

      {audioUrl && (
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <audio src={audioUrl} controls className="w-full" />
          <button
            onClick={resetRecording}
            className="text-red-500 text-sm font-bold underline"
            disabled={isProcessing}
          >
            録音しなおす
          </button>
        </div>
      )}

      {/* Answer Text */}
      <div className="w-full max-w-xs">
        <label className="block text-sm font-bold text-gray-600 mb-1">正解のワード</label>
        <input
          type="text"
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="例: リンゴ"
          className="w-full p-3 rounded-lg border-2 border-gray-300 focus:border-orange-500 outline-none"
          disabled={isProcessing}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!audioBlob || !answerText.trim() || isProcessing}
        className="w-full max-w-xs bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-black py-4 rounded-xl shadow-[0_6px_0_rgb(22,101,52)] hover:translate-y-[2px] hover:shadow-[0_4px_0_rgb(22,101,52)] active:translate-y-[6px] active:shadow-none transition-all"
      >
        {isProcessing ? "魔法をかけています...🪄" : "✨ これでお題をだす！"}
      </button>
    </div>
  );
}
