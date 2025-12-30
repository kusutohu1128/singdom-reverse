'use client';

import { useState } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { processAudio, reverseAudio } from '@/lib/audio';
import { cn } from '@/lib/cn';
import { motion, AnimatePresence } from 'framer-motion';

interface GameplayProps {
  assignment: { reversedUrl: string; originalUrl: string; answerText: string };
  onAnswerSubmit: (data: { audioUrl: string; reversedAudioUrl: string; effect: string }) => void;
}

export function Gameplay({ assignment, onAnswerSubmit }: GameplayProps) {
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

  const [selectedEffect, setSelectedEffect] = useState('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string | null>(null);

  const handleProcessPreview = async () => {
    if (!audioBlob) return;
    if (selectedEffect === 'none') {
      setProcessedPreviewUrl(audioUrl);
      return;
    }

    setIsProcessing(true);
    try {
      const processedBlob = await processAudio(audioBlob, selectedEffect);
      const url = URL.createObjectURL(processedBlob);
      setProcessedPreviewUrl(url);
    } catch (e) {
      console.error(e);
      alert('Effect processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    try {
      // If effect is selected, we need to upload the PROCESSED audio.
      // If we already previewed it, we have the blob? 
      // processAudio returns blob. We should store it.

      let finalBlob = audioBlob;
      if (selectedEffect !== 'none') {
        // Re-process to be sure or use cached if we stored it?
        // Let's re-process or just process if not previewed.
        finalBlob = await processAudio(audioBlob, selectedEffect);
      }

      // 2. Generate reversed version of the final answer
      // This allows us to hear the "recovered" normal sound in the result screen
      const reversedFinalBlob = await reverseAudio(finalBlob);

      // 3. Upload both
      const formData1 = new FormData();
      formData1.append('file', finalBlob, 'answer.wav');

      const uploadRes1 = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/upload`, {
        method: 'POST',
        body: formData1,
      });
      const json1 = await uploadRes1.json();
      const audioUrl = json1.url;

      const formData2 = new FormData();
      formData2.append('file', reversedFinalBlob, 'answer_reversed.wav');
      const uploadRes2 = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/upload`, {
        method: 'POST',
        body: formData2,
      });
      const json2 = await uploadRes2.json();
      const reversedAudioUrl = json2.url;

      onAnswerSubmit({
        audioUrl: audioUrl,
        reversedAudioUrl: reversedAudioUrl,
        effect: selectedEffect
      });

    } catch (e) {
      console.error(e);
      alert('Submission failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Hint Section */}
      <div className="w-full bg-orange-50 p-6 rounded-2xl border-2 border-orange-200 text-center">
        <h4 className="font-black text-orange-400 mb-2 uppercase tracking-widest">お題の音（逆再生）</h4>
        <audio src={assignment.reversedUrl} controls className="w-full" />
        <p className="text-xs text-gray-400 mt-2">よく聴いて、この逆再生音を真似してみよう！</p>
      </div>

      <div className="relative group">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!!audioUrl || isProcessing}
          className={cn(
            "w-32 h-32 rounded-full flex flex-col items-center justify-center text-white font-black text-xl shadow-2xl transition-all border-8 border-transparent hover:border-white/20",
            isRecording ? "bg-red-500 scale-110" : "bg-purple-500 hover:bg-purple-600 active:scale-95",
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
        <div className="flex flex-col items-center gap-4 w-full">

          <div className="flex items-center gap-2">
            <label className="font-bold text-gray-600">ボイスチェンジャー:</label>
            <select
              value={selectedEffect}
              onChange={(e) => {
                setSelectedEffect(e.target.value);
                setProcessedPreviewUrl(null); // Reset preview on change
              }}
              className="p-3 border-2 border-purple-100 rounded-xl bg-purple-50 font-bold outline-none focus:border-purple-300"
              disabled={isProcessing}
            >
              <option value="none">なし（そのまま勝負！）</option>
              <option value="robot">🤖 ロボット</option>
              <option value="pitch_up">🎈 ヘリウム（高い声）</option>
              <option value="pitch_down">👹 モンスター（低い声）</option>
            </select>
          </div>

          {selectedEffect !== 'none' && !processedPreviewUrl && (
            <button
              onClick={handleProcessPreview}
              disabled={isProcessing}
              className="text-purple-500 font-black italic underline text-sm"
            >
              ▶️ エフェクトを試聴する
            </button>
          )}

          <audio src={processedPreviewUrl || audioUrl} controls className="w-full" />

          <button
            onClick={() => {
              resetRecording();
              setProcessedPreviewUrl(null);
            }}
            className="text-red-400 text-sm font-black italic underline"
            disabled={isProcessing}
          >
            録音しなおす
          </button>

          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl shadow-[0_6px_0_rgb(22,101,52)] hover:translate-y-[2px] hover:shadow-[0_4px_0_rgb(22,101,52)] active:translate-y-[6px] active:shadow-none transition-all"
          >
            {isProcessing ? "アップロード中...🚀" : "✨ これで提出する！"}
          </button>
        </div>
      )}
    </div>
  );
}
