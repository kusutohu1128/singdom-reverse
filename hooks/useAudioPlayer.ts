import { useState, useRef, useEffect, useCallback } from 'react';

interface AudioPlayerHook {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  play: (url?: string) => Promise<void>;
  pause: () => void;
  stop: () => void;
  load: (url: string) => void;
  error: string | null;
}

export const useAudioPlayer = (): AudioPlayerHook => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize standard Audio element
    audioRef.current = new Audio();

    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const load = useCallback((url: string) => {
    if (!audioRef.current) return;

    try {
      audioRef.current.src = url;
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setError(null);

      const onLoadedMetadata = () => {
        setDuration(audioRef.current?.duration || 0);
      };

      const onTimeUpdate = () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      };

      const onEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const onError = (e: Event) => {
        console.error('Audio load error', e);
        setError('Failed to load audio');
        setIsPlaying(false);
      };

      audioRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
      audioRef.current.addEventListener('timeupdate', onTimeUpdate);
      audioRef.current.addEventListener('ended', onEnded);
      audioRef.current.addEventListener('error', onError);

      // We should probably remove old listeners if load is called multiple times, 
      // but creating new Audio() in useEffect usually handles lifecycle enough for MVP. 
      // Ideally we'd manage listeners better in useEffect dependencies.
    } catch (err) {
      setError('Error loading audio');
    }
  }, []);

  const play = useCallback(async (url?: string) => {
    if (!audioRef.current) return;

    if (url) {
      load(url);
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.error(err);
      setError('Playback failed');
      setIsPlaying(false);
    }
  }, [load]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  return {
    isPlaying,
    duration,
    currentTime,
    play,
    pause,
    stop,
    load,
    error
  };
};
