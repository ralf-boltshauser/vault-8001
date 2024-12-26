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
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-white">Current Perks</h3>
      <div className="grid gap-1">
        {member.perks.length > 0 ? (
          member.perks.map((perk) => (
            <div
              key={perk.type}
              className="flex items-center bg-gray-700 px-2 py-1 rounded text-xs"
            >
              <span className="material-icons text-gray-300 mr-1.5 text-sm">
                {perk.icon}
              </span>
              <div>
                <p className="text-white">{perk.title}</p>
                <p className="text-gray-400">{perk.description}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-400">No perks yet</p>
        )}
      </div>

      {availablePerks.length > 0 && (
        <>
          <h3 className="text-xs font-semibold text-white mt-2">
            Available Perks
          </h3>
          <div className="grid gap-1">
            {availablePerks.map((perk) => (
              <div
                key={perk.type}
                className="flex items-center justify-between bg-gray-700 px-2 py-1 rounded text-xs"
              >
                <div className="flex items-center">
                  <span className="material-icons text-gray-300 mr-1.5 text-sm">
                    {perk.icon}
                  </span>
                  <div>
                    <p className="text-white">{perk.title}</p>
                    <p className="text-gray-400">{perk.description}</p>
                    <p className="text-gray-300">
                      ${perk.cost.toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleBuyPerk(perk.type)}
                  disabled={!canAffordPerk(perk.cost)}
                  className={`ml-2 px-2 py-0.5 rounded text-xs ${
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
