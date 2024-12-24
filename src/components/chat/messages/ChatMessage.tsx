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
            ? "bg-blue-600 text-gray-100"
            : "bg-gray-800 text-gray-100"
        }`}
      >
        <p>{message.content}</p>
        <p className="text-xs mt-1 text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
