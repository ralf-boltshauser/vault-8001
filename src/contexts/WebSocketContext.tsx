import React, { createContext, useContext, useEffect, useState } from "react";
import {
  Bank,
  Crew,
  GamePhase,
  PerkType,
  PlannedAction,
} from "../game/types/game.types";

interface GameState {
  phase: GamePhase;
  crews: [string, Crew][];
  banks: [string, Bank][];
  turnNumber: number;
}

interface WebSocketContextType {
  connected: boolean;
  connecting: boolean;
  playerId?: string;
  playerCrew?: Crew;
  gameState?: GameState;
  connect: (playerName: string) => void;
  hireMember: () => void;
  buyPerk: (memberId: string, perkType: PerkType) => void;
  assignAction: (memberId: string, action: PlannedAction) => void;
  submitTurn: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

const STORAGE_KEYS = {
  PLAYER_ID: "heist_game_player_id",
  PLAYER_NAME: "heist_game_player_name",
};

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [playerId, setPlayerId] = useState<string>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEYS.PLAYER_ID) || undefined
      : undefined
  );
  const [gameState, setGameState] = useState<GameState>();

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

  const connect = (playerName: string) => {
    if (connecting) return;
    setConnecting(true);

    const ws = new WebSocket("ws://localhost:8001");

    ws.onopen = () => {
      setConnected(true);
      setSocket(ws);
      // Store player name for reconnection
      localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, playerName);

      // If we have a stored playerId, try to reconnect, otherwise join as new player
      const storedPlayerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
      ws.send(
        JSON.stringify({
          type: storedPlayerId ? "reconnect" : "join",
          data: {
            playerName,
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

  const playerCrew =
    playerId && gameState
      ? gameState.crews.find(([id]) => id === playerId)?.[1]
      : undefined;

  return (
    <WebSocketContext.Provider
      value={{
        connected,
        connecting,
        playerId,
        playerCrew,
        gameState,
        connect,
        hireMember,
        buyPerk,
        assignAction,
        submitTurn,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
