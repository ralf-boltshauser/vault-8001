"use client";

import { ChatMessagePiece } from "@/game/types/game.types";
interface ChatMessageProps {
  message: ChatMessagePiece;
  isOwnMessage: boolean;
}

export function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  return (
    <div
      className={`mb-4 flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[70%] rounded-lg p-3 ${
          isOwnMessage
            ? message.isRead
              ? "bg-blue-600 text-gray-100 border-white border"
              : "bg-blue-600 text-gray-100"
            : "bg-gray-800 text-gray-100"
        }`}
      >
        <p>{message.content}</p>
        <div className="flex justify-between items-center mt-1 text-xs text-gray-400">
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
