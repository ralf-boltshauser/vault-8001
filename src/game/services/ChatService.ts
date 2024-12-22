import { GameState } from "../models/GameState";
import {
  ChatMessagePiece,
  ChatThread,
  InformationPiece,
  InformationPieceType,
} from "../types/game.types";
import { generateId } from "../utils/helpers";

export class ChatService {
  private static instance: ChatService;
  private gameState: GameState;

  private constructor() {
    this.gameState = GameState.getInstance();
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  // Thread Management
  public getOrCreateThread(
    participant1Id: string,
    participant2Id: string
  ): ChatThread {
    const threadId = this.generateThreadId(participant1Id, participant2Id);
    const existingThread = this.gameState.getChatThread(threadId);

    if (existingThread) {
      return existingThread;
    }

    const newThread: ChatThread = {
      id: threadId,
      participants: [participant1Id, participant2Id],
      messages: [],
      information: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.gameState.addChatThread(newThread);
    return newThread;
  }

  public getThreadsForParticipant(participantId: string): ChatThread[] {
    return this.gameState.getChatThreadsForCrew(participantId);
  }

  // Message Management
  public sendChatMessage(
    senderId: string,
    threadId: string,
    content: string
  ): ChatMessagePiece | undefined {
    const thread = this.gameState.getChatThread(threadId);
    if (!thread) return;
    const message: ChatMessagePiece = {
      id: generateId(),
      type: "chat_message",
      senderId,
      content,
      timestamp: Date.now(),
      isRead: false,
    };

    thread.messages.push(message);
    thread.lastActivity = Date.now();

    this.gameState.updateChatThread(thread);
    return message;
  }

  public sendInformation<T extends InformationPiece>(
    senderId: string,
    recipientId: string,
    information: Omit<T, "id" | "timestamp" | "isRead">
  ): T {
    const thread = this.getOrCreateThread(senderId, recipientId);

    const completeInformation = {
      ...information,
      id: generateId(),
      timestamp: Date.now(),
      isRead: false,
    } as T;

    thread.information.push(completeInformation);
    thread.lastActivity = Date.now();

    this.gameState.updateChatThread(thread);
    return completeInformation;
  }

  // Message Reading
  public markAsRead(threadId: string, messageId: string): void {
    const thread = this.gameState.getChatThread(threadId);
    if (!thread) return;

    const message = thread.information.find((m) => m.id === messageId);
    if (message) {
      message.isRead = true;
      this.gameState.updateChatThread(thread);
    }
  }

  public markThreadAsRead(threadId: string, participantId: string): void {
    const thread = this.gameState.getChatThread(threadId);
    if (!thread) return;

    thread.information.forEach((message) => {
      if (message.senderId !== participantId) {
        message.isRead = true;
      }
    });

    this.gameState.updateChatThread(thread);
  }

  // Evidence Management
  public getEvidenceByType(type: InformationPieceType): InformationPiece[] {
    return this.gameState
      .getAllChatThreads()
      .flatMap((thread) => thread.information)
      .filter((info) => info.type === type);
  }

  public getEvidenceAboutBank(bankId: string): InformationPiece[] {
    return this.gameState
      .getAllChatThreads()
      .flatMap((thread) => thread.information)
      .filter(
        (info) =>
          info.type === "bank_evidence" &&
          "bankId" in info &&
          info.bankId === bankId
      );
  }

  public getEvidenceAboutCrew(crewId: string): InformationPiece[] {
    return this.gameState
      .getAllChatThreads()
      .flatMap((thread) => thread.information)
      .filter(
        (info) =>
          info.type === "crew_evidence" &&
          "targetCrewId" in info &&
          info.targetCrewId === crewId
      );
  }

  // Helper Methods
  private generateThreadId(
    participant1Id: string,
    participant2Id: string
  ): string {
    return [participant1Id, participant2Id].sort().join(":");
  }
}
