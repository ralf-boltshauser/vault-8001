"use client";

import { BankList } from "@/components/public/BankList";
import { CrewRanking } from "@/components/public/CrewRanking";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Crew } from "@/game/types/game.types";
import { useEffect } from "react";

export default function PublicPage() {
  const { connected, connect, gameState } = useWebSocket();

  useEffect(() => {
    if (!connected) {
      connect();
    }
  }, [connected, connect]);

  if (!gameState) {
    return (
      <div className="text-gray-400 text-center py-8">
        Connecting to game server...
      </div>
    );
  }

  // Get all crews from the game state
  const crews: Crew[] = [];
  gameState.crews.forEach((value: [string, Crew]) => {
    crews.push(value[1]);
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Public Dashboard</h1>
      <CrewRanking crews={crews} />
      <BankList />
    </div>
  );
}
