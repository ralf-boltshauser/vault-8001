import { AttackOutcome, Bank } from "@/game/types/game.types";
import { useState } from "react";

interface BankCardProps {
  bank: Bank;
}

export function BankCard({ bank }: BankCardProps) {
  const [showHistory, setShowHistory] = useState(false);

  // Sort attacks by timestamp, most recent first
  const sortedHistory = [...bank.attackHistory].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{bank.name}</h2>
          <div className="mt-2 space-y-1">
            <p className="text-gray-300">
              Guards: {bank.guardsCurrent} (Min: {bank.guardMin}, Max:{" "}
              {bank.guardMax})
            </p>
            <p className="text-gray-300">
              Loot Potential: ${bank.lootPotential.toLocaleString()}
            </p>
            <p className="text-gray-300">
              Minimum Loot: ${bank.minLootPotential.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-sm font-medium px-3 py-1 rounded-full bg-gray-700 text-gray-300">
            Level {bank.difficultyLevel}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 justify-end">
            {bank.securityFeatures.map((feature) => (
              <span
                key={feature}
                className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center text-blue-400 hover:text-blue-300"
        >
          <span className="material-icons mr-1">
            {showHistory ? "expand_less" : "expand_more"}
          </span>
          {showHistory ? "Hide Attack History" : "Show Attack History"}
        </button>

        {showHistory && (
          <div className="mt-4 space-y-4">
            {sortedHistory.length === 0 ? (
              <p className="text-gray-400">No recorded attacks yet.</p>
            ) : (
              sortedHistory.map((attack) => (
                <div
                  key={attack.id}
                  className={`p-4 rounded ${
                    attack.outcome === AttackOutcome.Success
                      ? "bg-green-900/30"
                      : attack.outcome === AttackOutcome.Failure
                      ? "bg-red-900/30"
                      : "bg-yellow-900/30"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-medium">
                        {new Date(attack.timestamp).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-300 mt-1">
                        Crews:{" "}
                        {attack.attackingCrews
                          .map((ac) => ac.crew.name)
                          .join(", ")}
                      </div>
                      {attack.loot && (
                        <div className="text-sm text-green-400 mt-1">
                          Stolen: ${attack.loot.amount.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div
                      className={`text-sm font-medium px-3 py-1 rounded ${
                        attack.outcome === AttackOutcome.Success
                          ? "bg-green-900 text-green-300"
                          : attack.outcome === AttackOutcome.Failure
                          ? "bg-red-900 text-red-300"
                          : "bg-yellow-900 text-yellow-300"
                      }`}
                    >
                      {attack.outcome}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
