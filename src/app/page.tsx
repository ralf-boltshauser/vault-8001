"use client";

import { GameInterface } from "@/components/GameInterface";
import { WebSocketProvider } from "../contexts/WebSocketContext";

export default function Home() {
  return (
    <WebSocketProvider>
      <main className="min-h-screen bg-gray-900 text-white">
        <GameInterface />
      </main>
    </WebSocketProvider>
  );
}
