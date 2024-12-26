import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { GamePhase } from "@/game/types/game.types";

export function AdminControls() {
  const { gameState, startGame } = useWebSocket();

  return (
    <div className="space-y-6">
      {gameState?.phase === GamePhase.Initialization && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Game Controls</h2>
          <Button onClick={startGame} className="w-full md:w-auto">
            Start Game
          </Button>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Game Status</h2>
        <div className="grid gap-2">
          <p>Current Phase: {gameState?.phase}</p>
          <p>Players: {gameState?.crews.length || 0}</p>
          <p>Turn: {gameState?.turnNumber}</p>
        </div>
      </div>
    </div>
  );
}
