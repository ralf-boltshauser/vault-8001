import process from "process";
import { WebSocket, WebSocketServer } from "ws";
import { GameService } from "../game/services/GameService.js";
import { PerkType, PlannedAction } from "../game/types/game.types.js";

type MessageType =
  | "join"
  | "joinPublic"
  | "reconnect"
  | "reconnectPublic"
  | "hireMember"
  | "buyPerk"
  | "assignAction"
  | "readyForNextPhase"
  | "error"
  | "joined"
  | "reconnected"
  | "hireResult"
  | "buyPerkResult"
  | "actionResult"
  | "gameState";

interface BaseMessage {
  type: MessageType;
  data: unknown;
}

interface JoinMessage extends BaseMessage {
  type: "join";
  data: {
    playerName: string;
  };
}

interface ReconnectMessage extends BaseMessage {
  type: "reconnect";
  data: {
    playerName: string;
    playerId: string;
  };
}

interface HireMemberMessage extends BaseMessage {
  type: "hireMember";
  data: Record<string, never>;
}

interface BuyPerkMessage extends BaseMessage {
  type: "buyPerk";
  data: {
    memberId: string;
    perkType: PerkType;
  };
}

interface AssignActionMessage extends BaseMessage {
  type: "assignAction";
  data: {
    memberId: string;
    action: PlannedAction;
  };
}

interface ReadyMessage extends BaseMessage {
  type: "readyForNextPhase";
  data: Record<string, never>;
}

interface JoinPublicMessage extends BaseMessage {
  type: "joinPublic";
  data: Record<string, never>;
}

interface ReconnectPublicMessage extends BaseMessage {
  type: "reconnectPublic";
  data: Record<string, never>;
}

type GameMessage =
  | JoinMessage
  | ReconnectMessage
  | HireMemberMessage
  | BuyPerkMessage
  | AssignActionMessage
  | ReadyMessage
  | JoinPublicMessage
  | ReconnectPublicMessage;

const wss = new WebSocketServer({ port: 8001 });
const gameService = GameService.getInstance();

console.log("Game server is running on ws://localhost:8001");

wss.on("connection", (ws: WebSocket) => {
  console.log("Player connected");
  let playerId: string;

  ws.on("message", (message: string) => {
    try {
      const msg = JSON.parse(message.toString()) as GameMessage;

      switch (msg.type) {
        case "join":
          playerId = gameService.addPlayer(ws, msg.data.playerName);
          ws.send(JSON.stringify({ type: "joined", data: { playerId } }));
          gameService.broadcastGameState();
          break;

        case "reconnect":
          const existingCrew = gameService.getCrew(msg.data.playerId);
          if (existingCrew) {
            playerId = msg.data.playerId;
            gameService.reconnectPlayer(playerId, ws);
            ws.send(
              JSON.stringify({ type: "reconnected", data: { playerId } })
            );
            gameService.broadcastGameState();
          } else {
            ws.send(
              JSON.stringify({
                type: "error",
                data: { message: "Invalid player ID" },
              })
            );
          }
          break;

        case "joinPublic":
          gameService.addPublicViewer(ws);
          gameService.broadcastGameState();
          break;

        case "reconnectPublic":
          gameService.reconnectPublicViewer(ws);
          gameService.broadcastGameState();
          break;

        case "hireMember":
          if (playerId) {
            const success = gameService.hireCrewMember(playerId);
            ws.send(
              JSON.stringify({
                type: "hireResult",
                data: { success },
              })
            );
            if (success) gameService.broadcastGameState();
          }
          break;

        case "buyPerk":
          if (playerId) {
            const success = gameService.buyPerk(
              playerId,
              msg.data.memberId,
              msg.data.perkType
            );
            ws.send(
              JSON.stringify({
                type: "buyPerkResult",
                data: { success },
              })
            );
            if (success) gameService.broadcastGameState();
          }
          break;

        case "assignAction":
          if (playerId) {
            try {
              gameService.assignAction(
                playerId,
                msg.data.memberId,
                msg.data.action
              );
              ws.send(
                JSON.stringify({
                  type: "actionResult",
                  data: { success: true },
                })
              );
              gameService.broadcastGameState();
            } catch (err) {
              const error = err as Error;
              ws.send(
                JSON.stringify({
                  type: "error",
                  data: { message: error.message },
                })
              );
            }
          }
          break;

        case "readyForNextPhase":
          if (playerId) {
            try {
              gameService.markCrewReady(playerId);
              gameService.broadcastGameState();
            } catch (err) {
              const error = err as Error;
              ws.send(
                JSON.stringify({
                  type: "error",
                  data: { message: error.message },
                })
              );
            }
          }
          break;

        default:
          ws.send(
            JSON.stringify({
              type: "error",
              data: { message: "Unknown message type" },
            })
          );
      }
    } catch (err) {
      const error = err as Error;
      console.error("Error processing message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "Invalid message format" },
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("Player disconnected");
    if (playerId) {
      gameService.disconnectPlayer(playerId);
      gameService.broadcastGameState();
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    if (playerId) {
      gameService.disconnectPlayer(playerId);
      gameService.broadcastGameState();
    }
  });
});

// Handle server shutdown
process.on("SIGINT", () => {
  wss.close(() => {
    console.log("Server shutting down");
    process.exit(0);
  });
});
