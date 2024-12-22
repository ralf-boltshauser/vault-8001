"use client";

import { GameInterface } from "@/components/GameInterface";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { BellIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
export default function Home() {
  const { gameState, playerCrew } = useWebSocket();
  const unreadChatMessagesLength = useMemo(() => {
    if (!gameState?.chatThreads) return 0;
    return Array.from(gameState.chatThreads.values())
      .filter(([id, thread]) => thread.participants.includes(playerCrew?.id))
      .filter(([id, thread]) =>
        thread.messages.some(
          (message) => !message.read && message.senderId !== playerCrew?.id
        )
      ).length;
  }, [gameState, playerCrew]);
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-100">Vault 8001</h1>
        <Link
          href="/chat"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-100 rounded flex items-center gap-2 transition-colors duration-200"
        >
          <BellIcon className="w-5 h-5" />
          {unreadChatMessagesLength > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadChatMessagesLength}
            </span>
          )}
        </Link>
      </div>
      <GameInterface />
    </main>
  );
}
