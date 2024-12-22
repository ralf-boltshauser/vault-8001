import { useWebSocket } from "../contexts/WebSocketContext";
import {
  Action,
  AttackType,
  Bank,
  CrewMember,
  GamePhase,
} from "../game/types/game.types";

interface ActionManagerProps {
  member: CrewMember;
}

interface BankWithId extends Bank {
  id: string;
}

export function ActionManager({ member }: ActionManagerProps) {
  const { gameState, assignAction } = useWebSocket();

  if (gameState?.phase !== GamePhase.Planning) {
    return null;
  }

  // Convert Map entries to Bank array with IDs
  const banks: BankWithId[] = gameState
    ? // eslint-disable-next-line
      Array.from(gameState.banks.values()).map(([_, bank]) => bank)
    : [];

  const handleActionChange = (action: Action) => {
    if (action === Action.Work) {
      assignAction(member.id, {
        type: Action.Work,
        attackType: AttackType.Hostile, // Default, not used for work
      });
    } else if (action === Action.None) {
      assignAction(member.id, {
        type: Action.None,
        attackType: AttackType.Hostile, // Default, not used for none
      });
    }
  };

  const handleAttackSelect = (bankId: string, attackType: AttackType) => {
    assignAction(member.id, {
      type: Action.Attack,
      targetId: bankId,
      attackType: attackType,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => handleActionChange(Action.Work)}
          className={`px-3 py-1 rounded ${
            member.plannedAction?.type === Action.Work
              ? "bg-green-600 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-gray-300"
          }`}
        >
          Work
        </button>
        <button
          onClick={() => handleActionChange(Action.None)}
          className={`px-3 py-1 rounded ${
            !member.plannedAction || member.plannedAction.type === Action.None
              ? "bg-gray-600 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-gray-300"
          }`}
        >
          None
        </button>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-400">Available Banks:</h4>
        {banks.map((bank) => {
          const isAttackingThisBank =
            member.plannedAction?.type === Action.Attack &&
            member.plannedAction.targetId === bank.id;

          const isCooperative =
            isAttackingThisBank &&
            member.plannedAction?.attackType === AttackType.Cooperative;

          const isHostile =
            isAttackingThisBank &&
            member.plannedAction?.attackType === AttackType.Hostile;

          return (
            <div key={`bank-${bank.id}`} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-white">{bank.name}</div>
                <div className="text-sm text-gray-400">
                  Guards: {bank.guardMin || 0} to {bank.guardMax || 0} |
                  Potential: ${(bank.lootPotential || 0).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleAttackSelect(bank.id, AttackType.Cooperative)
                  }
                  className={`px-3 py-1 rounded ${
                    isCooperative
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  }`}
                  title="Work together with other crews"
                >
                  Co-op
                </button>
                <button
                  onClick={() =>
                    handleAttackSelect(bank.id, AttackType.Hostile)
                  }
                  className={`px-3 py-1 rounded ${
                    isHostile
                      ? "bg-red-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  }`}
                  title="Fight other crews for the loot"
                >
                  Hostile
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
