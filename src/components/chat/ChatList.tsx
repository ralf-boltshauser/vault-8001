"use client";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useEffect, useState } from "react";
import ChatThread from "./ChatThread";

export default function ChatList() {
  const { gameState, playerCrew, markThreadAsRead } = useWebSocket();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  useEffect(() => {
    if (selectedThread) {
      markThreadAsRead(selectedThread);
    }
  }, [selectedThread, markThreadAsRead]);

  if (!gameState || !playerCrew) {
    return <div>Loading...</div>;
  }

  const chatThreads = [...gameState.chatThreads.values()]
    .map(([_, thread]) => thread)
    .filter((thread) => thread.participants.includes(playerCrew.id));
  console.log(chatThreads);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-gray-900">
      {/* Chat List */}
      <div className="w-1/4 border-r border-gray-700 overflow-y-auto bg-gray-800">
        {chatThreads.map((thread) => {
          const otherParticipants = thread.participants.filter(
            (p) => p !== playerCrew.id
          );
          const otherCrews = [...gameState.crews.values()]
            .filter(([_, crew]) => otherParticipants.includes(crew.id))
            .map(([_, crew]) => crew);

          return (
            <div
              key={thread.id}
              className={`p-4 cursor-pointer hover:bg-gray-700 transition-colors duration-200 ${
                selectedThread === thread.id ? "bg-gray-700" : ""
              }`}
              onClick={() => setSelectedThread(thread.id)}
            >
              <h3 className="font-semibold text-gray-100">
                {otherCrews.map((crew) => crew.name).join(", ") || "Unknown"}
              </h3>
              {thread.messages.length > 0 && (
                <p className="text-sm text-gray-400 truncate">
                  {thread.messages[thread.messages.length - 1].content}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Chat Window */}
      <div className="flex-1 bg-gray-900">
        {selectedThread ? (
          <ChatThread threadId={selectedThread} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
