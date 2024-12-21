import { useWebSocket } from "../contexts/WebSocketContext";
import { CrewMemberCard } from "./CrewMemberCard";
import { HireMemberForm } from "./HireMemberForm";
import { JoinGame } from "./JoinGame";
import { TurnSubmission } from "./TurnSubmission";

export function GameInterface() {
  const { connected, playerCrew } = useWebSocket();

  if (!connected) {
    return <JoinGame />;
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
