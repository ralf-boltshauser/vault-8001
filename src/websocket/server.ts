import process from "process";
import { WebSocket, WebSocketServer } from "ws";
import { ChatService } from "../game/services/ChatService.js";
import { GameService } from "../game/services/GameService.js";
import {
  AdminAction,
  InteractionType,
  PerkType,
  PlannedAction,
} from "../game/types/game.types.js";

type MessageType =
  | "join"
  | "joinPublic"
  | "reconnect"
  | "reconnectPublic"
  | "hireMember"
  | "buyPerk"
  | "assignAction"
  | "readyForNextPhase"
  | "chat"
  | "error"
  | "joined"
  | "reconnected"
  | "hireResult"
  | "buyPerkResult"
  | "actionResult"
  | "gameState"
  | "markThreadAsRead"
  | "interaction"
  | "admin";

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

interface ChatMessage extends BaseMessage {
  type: "chat";
  data: {
    threadId: string;
    message: {
      content: string;
    };
  };
}

interface InteractionMessage extends BaseMessage {
  type: "interaction";
  data: {
    recipientId: string;
    interactionType: InteractionType;
    payload: {
      amount?: number;
      transferId?: string;
    };
  };
}

interface AdminMessage extends BaseMessage {
  type: "admin";
  data: {
    action: AdminAction;
    payload?: {
      minPlayers?: number;
      maxPlayers?: number;
      playerId?: string;
      // Extensible for more action-specific payloads
    };
  };
}

type GameMessage =
  | { type: "join"; data: { playerName: string; playerId?: string } }
  | { type: "reconnect"; data: { playerName: string; playerId: string } }
  | { type: "joinPublic"; data: { playerId?: string } }
  | { type: "reconnectPublic"; data: { playerId?: string } }
  | { type: "hireMember"; data: {} }
  | {
      type: "buyPerk";
      data: { memberId: string; perkType: PerkType };
    }
  | {
      type: "assignAction";
      data: { memberId: string; action: PlannedAction };
    }
  | { type: "readyForNextPhase"; data: {} }
  | {
      type: "chat";
      data: { threadId: string; message: { content: string } };
    }
  | {
      type: "markThreadAsRead";
      data: { threadId: string; readerId: string };
    }
  | {
      type: "interaction";
      data: {
        recipientId: string;
        interactionType: InteractionType;
        payload: {
          amount?: number;
          transferId?: string;
        };
      };
    }
  | {
      type: "admin";
      data: {
        action: AdminAction;
        payload?: {
          minPlayers?: number;
          maxPlayers?: number;
          playerId?: string;
        };
      };
    };

const wss = new WebSocketServer({ port: 8001 });
const gameService = GameService.getInstance();
const chatService = ChatService.getInstance();

console.log("Game server is running on ws://localhost:8001");

wss.on("connection", (ws: WebSocket) => {
  console.log("Player connected");
  let playerId: string;
  let isAdmin = false;

  ws.on("message", (message: string) => {
    try {
      const msg = JSON.parse(message.toString()) as GameMessage;
      switch (msg.type) {
        case "join":
          playerId = gameService.addPlayer(ws, msg.data.playerName);
          isAdmin = gameService.getCurrentPlayerCount() === 1;
          ws.send(
            JSON.stringify({
              type: "joined",
              data: {
                playerId,
                isAdmin,
              },
            })
          );
          if (isAdmin) {
            console.log("First player joined - granted admin status");
          }
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

        case "chat":
          if (playerId) {
            const threadId = msg.data.threadId;
            chatService.sendChatMessage(
              playerId,
              threadId,
              msg.data.message.content
            );
            gameService.broadcastGameState();
          }
          break;

        case "interaction":
          if (playerId) {
            try {
              switch (msg.data.interactionType) {
                case InteractionType.MoneyTransfer:
                  if (!msg.data.payload.amount) {
                    throw new Error("Amount is required for money transfer");
                  }
                  chatService.proposeMoneyTransfer(
                    playerId,
                    msg.data.recipientId,
                    msg.data.payload.amount
                  );
                  gameService.broadcastGameState();
                  break;
                case InteractionType.AcceptMoneyTransfer:
                  if (!msg.data.payload.transferId) {
                    throw new Error(
                      "Transfer ID is required for accepting money"
                    );
                  }
                  chatService.acceptMoneyTransfer(
                    playerId,
                    msg.data.payload.transferId
                  );
                  gameService.broadcastGameState();
                  break;
                case InteractionType.RejectMoneyTransfer:
                  if (!msg.data.payload.transferId) {
                    throw new Error(
                      "Transfer ID is required for rejecting money"
                    );
                  }
                  chatService.rejectMoneyTransfer(
                    playerId,
                    msg.data.payload.transferId
                  );
                  gameService.broadcastGameState();
                  break;
                default:
                  throw new Error("Unknown interaction type");
              }
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

        case "markThreadAsRead":
          if (playerId) {
            chatService.markThreadAsRead(msg.data.threadId, playerId);
            gameService.broadcastGameState();
          }
          break;

        case "admin":
          // if (!isAdmin) {
          //   ws.send(
          //     JSON.stringify({
          //       type: "error",
          //       data: { message: "Unauthorized: Admin access required" },
          //     })
          //   );
          //   return;
          // }

          try {
            switch (msg.data.action) {
              case AdminAction.StartGame:
                if (gameService.startGame()) {
                  gameService.broadcastGameState();
                } else {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      data: {
                        message: "Cannot start game: minimum players not met",
                      },
                    })
                  );
                }
                break;

              case AdminAction.ResetGame:
                // Implementation pending
                break;

              case AdminAction.SetMinPlayers:
                if (msg.data.payload?.minPlayers !== undefined) {
                  gameService.setMinPlayersToStart(msg.data.payload.minPlayers);
                  gameService.broadcastGameState();
                }
                break;

              case AdminAction.SetMaxPlayers:
                if (msg.data.payload?.maxPlayers !== undefined) {
                  gameService.setMaxPlayers(msg.data.payload.maxPlayers);
                  gameService.broadcastGameState();
                }
                break;

              case AdminAction.KickPlayer:
                if (msg.data.payload?.playerId) {
                  gameService.removeCrew(msg.data.payload.playerId);
                  gameService.broadcastGameState();
                }
                break;

              default:
                ws.send(
                  JSON.stringify({
                    type: "error",
                    data: { message: "Unknown admin action" },
                  })
                );
            }
          } catch (err) {
            const error = err as Error;
            ws.send(
              JSON.stringify({
                type: "error",
                data: { message: error.message },
              })
            );
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
