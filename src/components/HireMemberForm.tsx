import { useWebSocket } from "../contexts/WebSocketContext";

const CREW_MEMBER_COST = 50000;

export function HireMemberForm() {
  const { hireMember, playerCrew } = useWebSocket();

  const canAffordMember = (playerCrew?.capital || 0) >= CREW_MEMBER_COST;

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-4">
        Hire New Crew Member
      </h2>

      <div className="space-y-4">
        <p className="text-gray-300">
          Cost:{" "}
          <span className="text-white">
            ${CREW_MEMBER_COST.toLocaleString()}
          </span>
        </p>

        <p className="text-gray-300">
          Your Capital:{" "}
          <span className="text-white">
            ${playerCrew?.capital.toLocaleString()}
          </span>
        </p>

        <button
          onClick={() => hireMember()}
          disabled={!canAffordMember}
          className={`w-full py-2 px-4 rounded ${
            canAffordMember
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-gray-600 text-gray-400 cursor-not-allowed"
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        >
          {canAffordMember ? "Hire Member" : "Not Enough Money"}
        </button>

        <div className="text-sm text-gray-400 space-y-2">
          <p>Each crew member:</p>
          <ul className="list-disc list-inside pl-2 space-y-1">
            <li>Gets a random cool name</li>
            <li>Can be equipped with perks</li>
            <li>Can participate in heists</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
