"use client";

import { CrewMemberCard } from "../components/CrewMemberCard";
import { HireMemberForm } from "../components/HireMemberForm";
import { TurnSubmission } from "../components/TurnSubmission";
import { useWebSocket, WebSocketProvider } from "../contexts/WebSocketContext";

function GameInterface() {
  const { connected, connecting, playerCrew, connect } = useWebSocket();

  if (!connected) {
    if (connecting) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Connecting...</div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <button
          onClick={() => connect("Player-" + Math.floor(Math.random() * 1000))}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg"
        >
          Join Game
        </button>
      </div>
    );
  }

  if (!playerCrew) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-6">
        <TurnSubmission />

        <div className="grid gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Your Crew</h2>
            <div className="text-gray-300">
              Capital:{" "}
              <span className="text-white">
                ${playerCrew.capital.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {playerCrew.crewMembers.map((member) => (
              <CrewMemberCard key={member.id} member={member} />
            ))}
          </div>

          <HireMemberForm />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <WebSocketProvider>
      <main className="min-h-screen bg-gray-900 text-white">
        <GameInterface />
      </main>
    </WebSocketProvider>
  );
}
