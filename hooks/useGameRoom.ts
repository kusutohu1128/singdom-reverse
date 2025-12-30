import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type GamePhase = 'LOBBY' | 'TOPIC_CREATION' | 'SHUFFLE' | 'RECORDING' | 'RESULT';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  ready: boolean;
  online_at?: string;
}

export interface GameState {
  phase: GamePhase;
  round: number;
  hostId: string | null;
}

interface UseGameRoomReturn {
  roomCode: string;
  players: Player[];
  gameState: GameState;
  myId: string | null;
  submissions: Record<string, any>;
  assignments: Record<string, any>;
  answers: Record<string, any>;
  joinRoom: (code: string, username: string, isCreator: boolean) => void;
  leaveRoom: () => void;
  startGame: () => void;
  updatePhase: (phase: GamePhase) => void;
  broadcastSubmission: (event: string, data: any) => void;
  broadcastRaw: (event: string, payload: any) => void;
  isHost: boolean;
}

export const useGameRoom = (): UseGameRoomReturn => {
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>({ phase: 'LOBBY', round: 1, hostId: null });
  const [myId, setMyId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Track if this client was the creator (used for initial state broadcast)
  const isCreatorRef = useRef(false);

  // Initialize ID from localStorage immediately (before render)
  useEffect(() => {
    let id = localStorage.getItem('utakingdom_user_id');
    if (!id) {
      id = Math.random().toString(36).substring(7);
      localStorage.setItem('utakingdom_user_id', id);
    }
    setMyId(id);
  }, []);

  const broadcast = useCallback((event: string, payload: any) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: event,
      payload: payload,
    });
  }, []);

  const joinRoom = useCallback((code: string, username: string, isCreator: boolean) => {
    if (channelRef.current || !myId) return;

    isCreatorRef.current = isCreator;
    setRoomCode(code);

    // If creator, set initial state IMMEDIATELY before channel subscription
    // This ensures gameState.hostId is set before any sync events
    const initialGameState: GameState = {
      phase: 'LOBBY',
      round: 1,
      hostId: isCreator ? myId : null
    };

    if (isCreator) {
      setGameState(initialGameState);
    }

    const channel = supabase.channel(`game:${code}`, {
      config: {
        presence: { key: username },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const playerList: Player[] = [];

        for (const key in state) {
          const presences = state[key] as any[];
          presences.forEach(p => {
            playerList.push({
              id: p.id,
              name: p.name || key,
              isHost: false, // Will be updated based on gameState in render
              ready: false,
              online_at: p.online_at
            });
          });
        }
        setPlayers(playerList);
      })
      .on('broadcast', { event: 'gameStateUpdate' }, (payload) => {
        console.log('[Broadcast] gameStateUpdate received', payload.payload);
        setGameState(payload.payload);
      })
      .on('broadcast', { event: 'topicSubmitted' }, (payload) => {
        const { userId, data, senderId } = payload.payload;
        // Skip if it's our own broadcast (we update optimistically)
        if (senderId === myId) return;
        console.log('[Broadcast] topicSubmitted from', userId);
        setSubmissions(prev => ({ ...prev, [userId]: data }));
      })
      .on('broadcast', { event: 'assignments' }, (payload) => {
        setAssignments(payload.payload.data);
      })
      .on('broadcast', { event: 'answerSubmitted' }, (payload) => {
        const { userId, data, senderId } = payload.payload;
        if (senderId === myId) return;
        setAnswers(prev => ({ ...prev, [userId]: data }));
      })
      .on('broadcast', { event: 'requestSync' }, (payload) => {
        // Only respond if we are the creator (definitively the host)
        if (!isCreatorRef.current) return;

        console.log('[Sync] Host responding to sync request');
        // Send current state to the requester
        // Note: We read directly from React state via closure, but this might be stale.
        // To fix this, we'll send the sync response with a small delay to ensure state is committed.
        setTimeout(() => {
          channel.send({
            type: 'broadcast',
            event: 'sync_all_data',
            payload: {
              // Use initialGameState if we're still in initial setup
              gameState: initialGameState,
              submissions: {},  // Initially empty
              assignments: {},
              answers: {}
            }
          });
        }, 100);
      })
      .on('broadcast', { event: 'sync_all_data' }, (payload) => {
        console.log('[Sync] Received full state from host', payload.payload);
        setGameState(payload.payload.gameState);
        setSubmissions(payload.payload.submissions || {});
        setAssignments(payload.payload.assignments || {});
        setAnswers(payload.payload.answers || {});
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Sync] Subscribed as', myId, 'isCreator:', isCreator);

          await channel.track({
            id: myId,
            name: username,
            online_at: new Date().toISOString(),
          });

          if (isCreator) {
            // Creator broadcasts initial state
            console.log('[Sync] Creator broadcasting initial state');
            channel.send({ type: 'broadcast', event: 'gameStateUpdate', payload: initialGameState });
          } else {
            // Joiner requests state from host after a delay
            setTimeout(() => {
              console.log('[Sync] Joiner requesting sync');
              channel.send({ type: 'broadcast', event: 'requestSync', payload: { requesterId: myId } });
            }, 500);
          }
        }
      });

    channelRef.current = channel;
  }, [myId]);

  const leaveRoom = useCallback(() => {
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    isCreatorRef.current = false;
    setPlayers([]);
    setRoomCode('');
    setGameState({ phase: 'LOBBY', round: 1, hostId: null });
    setSubmissions({});
    setAssignments({});
    setAnswers({});
  }, []);

  const updatePhase = useCallback((phase: GamePhase) => {
    setGameState(prev => {
      const newState = { ...prev, phase };
      // Broadcast the new state
      broadcast('gameStateUpdate', newState);
      return newState;
    });
  }, [broadcast]);

  const startGame = useCallback(() => {
    updatePhase('TOPIC_CREATION');
  }, [updatePhase]);

  // CRITICAL: isHost is computed from STATE, not ref, so it triggers re-render
  const isHost = !!(myId && gameState.hostId && myId === gameState.hostId);

  // Update players' isHost flag based on current gameState.hostId
  const playersWithHostFlag = players.map(p => ({
    ...p,
    isHost: p.id === gameState.hostId
  }));

  // Unified helper for game data broadcasts with optimistic local updates
  const broadcastGameData = useCallback((event: string, data: any) => {
    if (!myId) return;

    if (event === 'topicSubmitted') {
      setSubmissions(prev => ({ ...prev, [myId]: data }));
      broadcast(event, { userId: myId, data, senderId: myId });
    } else if (event === 'answerSubmitted') {
      setAnswers(prev => ({ ...prev, [myId]: data }));
      broadcast(event, { userId: myId, data, senderId: myId });
    } else if (event === 'assignments') {
      setAssignments(data);
      broadcast(event, { data, senderId: myId });
    }
  }, [broadcast, myId]);

  return {
    roomCode,
    players: playersWithHostFlag,
    gameState,
    myId,
    submissions,
    assignments,
    answers,
    joinRoom,
    leaveRoom,
    startGame,
    updatePhase,
    broadcastSubmission: broadcastGameData,
    broadcastRaw: broadcast,
    isHost,
  };
};
