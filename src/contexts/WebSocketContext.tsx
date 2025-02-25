"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AdminAction,
  Bank,
  ChatThread,
  Crew,
  GamePhase,
  InteractionType,
  PerkType,
  PlannedAction,
} from "../game/types/game.types";

interface GameState {
  phase: GamePhase;
  crews: [string, Crew][];
  banks: [string, Bank][];
  chatThreads: [string, ChatThread][];
  turnNumber: number;
}

interface Message {
  threadId: string;
  message: {
    content: string;
  };
}

interface InteractionPayload {
  amount?: number;
  transferId?: string;
  // Add other payload types here as needed
}

interface WebSocketContextType {
  connected: boolean;
  connecting: boolean;
  playerId?: string;
  playerCrew?: Crew;
  gameState?: GameState;
  connect: (playerName?: string) => void;
  hireMember: () => void;
  buyPerk: (memberId: string, perkType: PerkType) => void;
  assignAction: (memberId: string, action: PlannedAction) => void;
  submitTurn: () => void;
  sendMessage: (message: Message) => void;
  markThreadAsRead: (threadId: string) => void;
  sendInteraction: (
    recipientId: string,
    interactionType: InteractionType,
    payload: InteractionPayload
  ) => void;
  unreadMessagesLength: number;
  isAdmin: boolean;
  startGame: () => void;
}

export const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
  connecting: false,
  playerId: undefined,
  playerCrew: undefined,
  gameState: undefined,
  unreadMessagesLength: 0,
  connect: () => {},
  hireMember: () => {},
  buyPerk: () => {},
  assignAction: () => {},
  submitTurn: () => {},
  sendMessage: () => {},
  sendInteraction: () => {},
  markThreadAsRead: () => {},
  isAdmin: false,
  startGame: () => {},
});

const STORAGE_KEYS = {
  PLAYER_ID: "heist_game_player_id",
  PLAYER_NAME: "heist_game_player_name",
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [playerId, setPlayerId] = useState<string>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEYS.PLAYER_ID) || undefined
      : undefined
  );
  const [gameState, setGameState] = useState<GameState>();
  const [isAdmin, setIsAdmin] = useState(false);

  console.log(gameState);
  // Attempt to reconnect with stored credentials
  useEffect(() => {
    const storedPlayerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
    const storedPlayerName = localStorage.getItem(STORAGE_KEYS.PLAYER_NAME);

    if (storedPlayerId && storedPlayerName && !connected && !connecting) {
      connect(storedPlayerName);
    }
  }, [connected, connecting]);

  // Reconnection logic
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !connected && !connecting) {
        const storedPlayerName = localStorage.getItem(STORAGE_KEYS.PLAYER_NAME);
        if (storedPlayerName) {
          connect(storedPlayerName);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [connected, connecting]);

  const connect = (playerName?: string) => {
    if (connecting) return;
    setConnecting(true);

    const ws = new WebSocket("ws://localhost:8001");

    ws.onopen = () => {
      setConnected(true);
      setSocket(ws);
      // Store player name for reconnection
      if (playerName) {
        localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, playerName);
      }

      // If we have a stored playerId, try to reconnect, otherwise join as new player
      const storedPlayerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
      ws.send(
        JSON.stringify({
          type: storedPlayerId
            ? playerName
              ? "reconnect"
              : "reconnectPublic"
            : playerName
            ? "join"
            : "joinPublic",
          data: playerName
            ? {
                playerName,
                playerId: storedPlayerId,
              }
            : {
                playerId: storedPlayerId,
              },
        })
      );
      setConnecting(false);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "joined":
        case "reconnected":
          setPlayerId(message.data.playerId);
          localStorage.setItem(STORAGE_KEYS.PLAYER_ID, message.data.playerId);
          setIsAdmin(message.data.isAdmin);
          break;
        case "gameState":
          const state = JSON.parse(message.data);
          setGameState(state);
          break;
        case "error":
          console.error("Server error:", message.data.message);
          if (message.data.message === "Invalid player ID") {
            // Clear stored data if the server doesn't recognize our ID
            localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
            localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
            setPlayerId(undefined);
          }
          break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setSocket(null);
      setConnecting(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnected(false);
      setConnecting(false);
    };
  };

  const hireMember = () => {
    if (socket && connected && playerId) {
      socket.send(
        JSON.stringify({
          type: "hireMember",
          data: {},
        })
      );
    }
  };

  const buyPerk = (memberId: string, perkType: PerkType) => {
    if (socket && connected && playerId) {
      socket.send(
        JSON.stringify({
          type: "buyPerk",
          data: {
            memberId,
            perkType,
          },
        })
      );
    }
  };

  const assignAction = (memberId: string, action: PlannedAction) => {
    if (socket && connected && playerId) {
      socket.send(
        JSON.stringify({
          type: "assignAction",
          data: {
            memberId,
            action,
          },
        })
      );
    }
  };

  const submitTurn = () => {
    if (socket && connected && playerId) {
      socket.send(
        JSON.stringify({
          type: "readyForNextPhase",
          data: {},
        })
      );
    }
  };

  const sendMessage = (message: Message) => {
    console.log(message);
    if (socket && connected && playerId) {
      socket.send(
        JSON.stringify({
          type: "chat",
          data: {
            threadId: message.threadId,
            message: message.message,
          },
        })
      );
    }
  };

  const sendInteraction = useCallback(
    (
      recipientId: string,
      interactionType: InteractionType,
      payload: InteractionPayload
    ) => {
      if (socket && connected && playerId) {
        socket.send(
          JSON.stringify({
            type: "interaction",
            data: {
              recipientId,
              interactionType,
              payload,
            },
          })
        );
      }
    },
    [socket, connected, playerId]
  );

  const markThreadAsRead = useCallback(
    (threadId: string) => {
      if (socket && connected && playerId) {
        socket.send(
          JSON.stringify({
            type: "markThreadAsRead",
            data: {
              threadId,
              readerId: playerId,
            },
          })
        );
      }
    },
    [socket, connected, playerId]
  );

  const unreadMessagesLength = useMemo(() => {
    if (!gameState?.chatThreads) return 0;
    return Array.from(gameState.chatThreads.values())
      .filter(([id, thread]) => thread.participants.includes(playerId))
      .filter(([id, thread]) =>
        thread.messages.some(
          (message) => !message.isRead && message.senderId !== playerId
        )
      ).length;
  }, [gameState, playerId]);

  const playerCrew =
    playerId && gameState
      ? gameState.crews.find(([id]) => id === playerId)?.[1]
      : undefined;

  const startGame = useCallback(() => {
    if (socket && connected && playerId) {
      socket.send(
        JSON.stringify({
          type: "admin",
          data: {
            action: AdminAction.StartGame,
          },
        })
      );
    }
  }, [socket, connected, playerId]);

  const value = useMemo(
    () => ({
      connected,
      connecting,
      playerId,
      playerCrew,
      gameState,
      unreadMessagesLength,
      connect,
      hireMember,
      buyPerk,
      assignAction,
      submitTurn,
      sendMessage,
      sendInteraction,
      markThreadAsRead,
      isAdmin,
      startGame,
    }),
    [
      connected,
      connecting,
      playerId,
      playerCrew,
      gameState,
      unreadMessagesLength,
      connect,
      hireMember,
      buyPerk,
      assignAction,
      submitTurn,
      sendMessage,
      sendInteraction,
      markThreadAsRead,
      isAdmin,
      startGame,
    ]
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
