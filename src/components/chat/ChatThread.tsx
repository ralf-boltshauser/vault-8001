"use client";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useEffect, useRef, useState } from "react";

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
  }, [thread?.messages]);

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

  console.log(thread);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="font-semibold text-gray-100">
          {otherCrews.map((crew) => crew.name).join(", ") || "Unknown"}
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
        {thread.messages.map((msg, index) => {
          const isOwnMessage = msg.senderId === playerCrew.id;
          const isFirstUnread =
            index ===
            thread.messages.findIndex(
              (m) => !m.isRead && m.senderId !== playerCrew.id
            );
          const isLastRead =
            !msg.isRead &&
            index > 0 &&
            thread.messages[index - 1].isRead &&
            msg.senderId !== playerCrew.id;

          return (
            <div key={msg.id}>
              {isFirstUnread && (
                <div className="flex items-center my-4" key={msg.id + "unread"}>
                  <div className="flex-1 border-t border-gray-700"></div>
                  <span className="px-3 text-sm text-gray-500">
                    Unread messages
                  </span>
                  <div className="flex-1 border-t border-gray-700"></div>
                </div>
              )}
              {isLastRead && (
                <div className="flex items-center my-4" key={msg.id + "read"}>
                  <div className="flex-1 border-t border-gray-700"></div>
                  <span className="px-3 text-sm text-gray-500">Last read</span>
                  <div className="flex-1 border-t border-gray-700"></div>
                </div>
              )}
              <div
                key={msg.id}
                className={`mb-4 flex ${
                  isOwnMessage ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isOwnMessage
                      ? "bg-blue-600 text-gray-100"
                      : "bg-gray-800 text-gray-100"
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className="text-xs mt-1 text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} key={thread.id + "end"} />
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
          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-blue-600 text-gray-100 rounded-lg hover:bg-blue-700 focus:outline-none transition-colors duration-200"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
