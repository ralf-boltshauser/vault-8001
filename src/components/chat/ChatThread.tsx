"use client";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useEffect, useRef, useState } from "react";
import { ProposeMoneyTransfer } from "./ProposeMoneyTransfer";
import { InformationPieceRenderer } from "./information-pieces/InformationPieceRenderer";
import { ChatMessage } from "./messages/ChatMessage";

interface ChatThreadProps {
  threadId: string;
}

export default function ChatThread({ threadId }: ChatThreadProps) {
  const { gameState, playerCrew, sendMessage } = useWebSocket();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const thread = gameState?.chatThreads.find(([id]) => id === threadId)?.[1];

  const otherParticipants =
    thread?.participants.filter((p) => p !== playerCrew?.id) || [];

  const otherCrews =
    gameState?.crews
      .filter(([_, crew]) => otherParticipants.includes(crew.id))
      .map(([_, crew]) => crew) || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages, thread?.information]);

  if (!thread || !gameState || !playerCrew) {
    return <div>Loading...</div>;
  }

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage = {
      content: message,
    };

    sendMessage({
      threadId,
      message: newMessage,
    });

    setMessage("");
  };

  // Combine messages and information pieces, sort by timestamp
  const allItems = [
    ...thread.messages.map((msg) => ({ type: "message", data: msg })),
    ...thread.information.map((info) => ({ type: "information", data: info })),
  ].sort((a, b) => a.data.timestamp - b.data.timestamp);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="font-semibold text-gray-100">
          {otherCrews.map((crew) => crew.name).join(", ") || "Unknown"}
        </h2>
      </div>

      {/* Messages and Information Pieces */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
        {allItems.map((item) => {
          const isOwnMessage = item.data.senderId === playerCrew.id;

          if (item.type === "message") {
            return (
              <ChatMessage
                key={item.data.id}
                message={item.data}
                isOwnMessage={isOwnMessage}
              />
            );
          }

          return (
            <InformationPieceRenderer
              key={item.data.id}
              piece={item.data}
              isOwnMessage={isOwnMessage}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 p-2 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 placeholder-gray-400"
            autoFocus
          />
          <Button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-blue-600 text-gray-100 rounded-lg hover:bg-blue-700 focus:outline-none transition-colors duration-200"
          >
            Send
          </Button>
          {otherCrews[0] && (
            <ProposeMoneyTransfer recipientId={otherCrews[0].id} />
          )}
        </div>
      </div>
    </div>
  );
}
