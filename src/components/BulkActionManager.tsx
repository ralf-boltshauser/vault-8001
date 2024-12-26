import { useWebSocket } from "../contexts/WebSocketContext";
import { Action, AttackType, Bank, GamePhase } from "../game/types/game.types";

interface BulkActionManagerProps {
  selectedMembers: string[];
  onClose: () => void;
}

interface BankWithId extends Bank {
  id: string;
}

export function BulkActionManager({
  selectedMembers,
  onClose,
}: BulkActionManagerProps) {
  const { gameState, assignAction, playerCrew } = useWebSocket();

  if (gameState?.phase !== GamePhase.Planning || !playerCrew) {
    return null;
  }

  // Get selected crew members
  const members = playerCrew.crewMembers.filter((m) =>
    selectedMembers.includes(m.id)
  );

  // Convert Map entries to Bank array with IDs
  const banks: BankWithId[] = gameState
    ? // eslint-disable-next-line
      Array.from(gameState.banks.values()).map(([_, bank]) => bank)
    : [];

  const handleActionChange = (action: Action) => {
    members.forEach((member) => {
      assignAction(member.id, {
        type: action,
        attackType: AttackType.Hostile, // Default, not used for work/none
      });
    });
    onClose();
  };

  const handleAttackSelect = (bankId: string, attackType: AttackType) => {
    members.forEach((member) => {
      assignAction(member.id, {
        type: Action.Attack,
        targetId: bankId,
        attackType: attackType,
      });
    });
    onClose();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white">
          {selectedMembers.length > 0
            ? `Set Action (${members.length})`
            : "Select crew members to assign actions"}
        </h3>
      </div>

      <div className="flex gap-1">
        <button
          onClick={() => handleActionChange(Action.Work)}
          className="px-2 py-0.5 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300"
        >
          Work
        </button>
        <button
          onClick={() => handleActionChange(Action.None)}
          className="px-2 py-0.5 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300"
        >
          None
        </button>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-medium text-gray-400">Banks:</h4>
        {banks.map((bank) => (
          <div
            key={`bank-${bank.id}`}
            className="flex items-center gap-1 text-xs"
          >
            <div className="flex-1">
              <div className="text-white">{bank.name}</div>
              <div className="text-gray-400">
                Guards: {bank.guardMin || 0}-{bank.guardMax || 0} | $
                {(bank.lootPotential || 0).toLocaleString()}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() =>
                  handleAttackSelect(bank.id, AttackType.Cooperative)
                }
                className="px-2 py-0.5 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300"
                title="Work together with other crews"
              >
                Co-op
              </button>
              <button
                onClick={() => handleAttackSelect(bank.id, AttackType.Hostile)}
                className="px-2 py-0.5 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300"
                title="Fight other crews for the loot"
              >
                Hostile
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
