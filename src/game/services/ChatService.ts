import { GameState } from "../models/GameState";
import {
  ChatMessagePiece,
  ChatThread,
  InformationPiece,
  InformationPieceType,
  InteractionStatus,
  InteractionType,
  MoneyTransferPiece,
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

    const otherThreadId = this.generateThreadId(participant2Id, participant1Id);
    const otherThread = this.gameState.getChatThread(otherThreadId);
    if (otherThread) {
      return otherThread;
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

  public proposeMoneyTransfer(
    senderId: string,
    recipientId: string,
    amount: number
  ): MoneyTransferPiece {
    if (amount <= 0) {
      throw new Error("Transfer amount must be positive");
    }

    const senderCrew = this.gameState.getCrew(senderId);
    if (!senderCrew) {
      throw new Error("Sender crew not found");
    }

    if (senderCrew.capital < amount) {
      throw new Error("Insufficient funds for transfer");
    }

    const transfer: Omit<MoneyTransferPiece, "id" | "timestamp" | "isRead"> = {
      type: "interaction",
      interactionType: InteractionType.MoneyTransfer,
      senderId,
      recipientId,
      amount,
      status: InteractionStatus.Pending,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours expiry
    };

    return this.sendInformation<MoneyTransferPiece>(
      senderId,
      recipientId,
      transfer
    );
  }

  public acceptMoneyTransfer(recipientId: string, transferId: string): void {
    const transfer = this.findMoneyTransfer(transferId);
    if (!transfer) {
      throw new Error("Transfer not found");
    }

    if (transfer.recipientId !== recipientId) {
      throw new Error("Not authorized to accept this transfer");
    }

    if (transfer.status !== InteractionStatus.Pending) {
      throw new Error("Transfer is not pending");
    }

    const senderCrew = this.gameState.getCrew(transfer.senderId);
    const recipientCrew = this.gameState.getCrew(recipientId);

    if (!senderCrew || !recipientCrew) {
      throw new Error("Crew not found");
    }

    if (senderCrew.capital < transfer.amount) {
      transfer.status = InteractionStatus.Failed;
      throw new Error("Sender has insufficient funds");
    }

    // Process the transfer
    senderCrew.capital -= transfer.amount;
    recipientCrew.capital += transfer.amount;
    transfer.status = InteractionStatus.Accepted;

    // Update game state
    this.gameState.updateCrew(senderCrew);
    this.gameState.updateCrew(recipientCrew);
  }

  public rejectMoneyTransfer(recipientId: string, transferId: string): void {
    const transfer = this.findMoneyTransfer(transferId);
    if (!transfer) {
      throw new Error("Transfer not found");
    }

    if (transfer.recipientId !== recipientId) {
      throw new Error("Not authorized to reject this transfer");
    }

    if (transfer.status !== InteractionStatus.Pending) {
      throw new Error("Transfer is not pending");
    }

    transfer.status = InteractionStatus.Rejected;
  }

  private findMoneyTransfer(
    transferId: string
  ): MoneyTransferPiece | undefined {
    for (const thread of this.gameState.getAllChatThreads()) {
      const transfer = thread.information.find(
        (info): info is MoneyTransferPiece =>
          info.type === "interaction" &&
          info.interactionType === InteractionType.MoneyTransfer &&
          info.id === transferId
      );
      if (transfer) return transfer;
    }
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

    thread.messages.forEach((message) => {
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
  public generateThreadId(
    participant1Id: string,
    participant2Id: string
  ): string {
    return [participant1Id, participant2Id].sort().join(":");
  }
}
