import { GAME_CONFIG } from "@/game/config/gameConfig";
import { Crew } from "@/game/types/game.types";
import { useEffect, useState } from "react";

interface CrewRankingProps {
  crews: Crew[];
}

export function CrewRanking({ crews }: CrewRankingProps) {
  const [winner, setWinner] = useState<Crew | null>(null);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    const potentialWinner = crews.find(
      (crew) => crew.capital >= GAME_CONFIG.WINNING_CAPITAL
    );
    if (potentialWinner) {
      setWinner(potentialWinner);
    }
  }, [crews]);

  // If there's no winner, don't show anything
  if (!winner) return null;

  // Sort crews by capital in descending order
  const sortedCrews = [...crews].sort((a, b) => b.capital - a.capital);

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-8">
      <h2 className="text-2xl font-bold text-white mb-6">Game Over!</h2>

      <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-6">
        <h3 className="text-xl font-bold text-yellow-400 mb-2">
          🏆 Winner: {winner.name}
        </h3>
        <p className="text-white">
          Victory achieved with {formatMoney(winner.capital)}!
        </p>
      </div>

      <h3 className="text-xl font-bold text-white mb-4">Final Rankings</h3>
      <div className="space-y-2">
        {sortedCrews.map((crew, index) => (
          <div
            key={crew.id}
            className={`flex justify-between items-center p-2 rounded ${
              crew === winner
                ? "bg-yellow-500/20 border border-yellow-500"
                : "bg-gray-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-400">#{index + 1}</span>
              <span className="text-white">{crew.name}</span>
            </div>
            <span className="text-white">{formatMoney(crew.capital)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
