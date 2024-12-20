import { useWebSocket } from "../contexts/WebSocketContext";
import { CrewMember, PERKS, PerkType } from "../game/types/game.types";

interface PerkManagerProps {
  member: CrewMember;
}

export function PerkManager({ member }: PerkManagerProps) {
  const { playerCrew, buyPerk } = useWebSocket();
  const availablePerks = Object.values(PERKS).filter(
    (perk) => !member.perks.some((memberPerk) => memberPerk.type === perk.type)
  );

  const canAffordPerk = (cost: number) => {
    return (playerCrew?.capital || 0) >= cost;
  };

  const handleBuyPerk = (perkType: PerkType) => {
    buyPerk(member.id, perkType);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Current Perks</h3>
      <div className="grid gap-2">
        {member.perks.length > 0 ? (
          member.perks.map((perk) => (
            <div
              key={perk.type}
              className="flex items-center bg-gray-700 p-2 rounded"
            >
              <span className="material-icons text-gray-300 mr-2">
                {perk.icon}
              </span>
              <div>
                <p className="text-white font-medium">{perk.title}</p>
                <p className="text-sm text-gray-400">{perk.description}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No perks yet</p>
        )}
      </div>

      {availablePerks.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-white mt-6">
            Available Perks
          </h3>
          <div className="grid gap-2">
            {availablePerks.map((perk) => (
              <div
                key={perk.type}
                className="flex items-center justify-between bg-gray-700 p-3 rounded"
              >
                <div className="flex items-center">
                  <span className="material-icons text-gray-300 mr-3">
                    {perk.icon}
                  </span>
                  <div>
                    <p className="text-white font-medium">{perk.title}</p>
                    <p className="text-sm text-gray-400">{perk.description}</p>
                    <p className="text-sm text-gray-300">
                      Cost: ${perk.cost.toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleBuyPerk(perk.type)}
                  disabled={!canAffordPerk(perk.cost)}
                  className={`ml-4 px-4 py-2 rounded ${
                    canAffordPerk(perk.cost)
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Buy
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
