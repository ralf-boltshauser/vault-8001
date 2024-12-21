import { useState } from "react";
import { useWebSocket } from "../contexts/WebSocketContext";

export function JoinGame() {
  const { connecting, connect } = useWebSocket();
  const [playerName, setPlayerName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      connect(playerName.trim());
    }
  };

  if (connecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white animate-pulse">Connecting...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-6">Join the Heist</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="playerName" className="block text-gray-300 mb-2">
              Crew Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your crew name"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!playerName.trim() || connecting}
            className={`w-full py-3 px-4 rounded font-medium ${
              playerName.trim() && !connecting
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
          >
            Join Game
          </button>
        </form>
      </div>
    </div>
  );
}
