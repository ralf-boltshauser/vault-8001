"use client";

import { GameState } from "../models/GameState";

export enum CommandType {
  SendMoney = "send_money",
  // Extensible for future commands
}

export interface CommandParams {
  amount?: number;
  target?: string;
  [key: string]: any;
}

export interface CommandContext {
  threadId: string;
  senderId: string;
  participants: string[];
  gameState: GameState;
}

export interface CommandPattern {
  pattern: RegExp;
  type: CommandType;
  extractParams: (match: RegExpMatchArray) => CommandParams;
}

export interface CommandResult {
  type: CommandType;
  params: CommandParams;
}

const COMMAND_PATTERNS: CommandPattern[] = [
  {
    pattern: /^send (\d+)k?$/i,
    type: CommandType.SendMoney,
    extractParams: (match) => ({
      amount:
        parseInt(match[1]) * (match[0].toLowerCase().endsWith("k") ? 1000 : 1),
    }),
  },
  // Add more patterns here
];

export class CommandService {
  private static instance: CommandService;
  private gameState: GameState;

  private constructor() {
    this.gameState = GameState.getInstance();
  }

  static getInstance(): CommandService {
    if (!CommandService.instance) {
      CommandService.instance = new CommandService();
    }
    return CommandService.instance;
  }

  public parseCommand(content: string): CommandResult | null {
    for (const pattern of COMMAND_PATTERNS) {
      const match = content.match(pattern.pattern);
      if (match) {
        return {
          type: pattern.type,
          params: pattern.extractParams(match),
        };
      }
    }
    return null;
  }

  public getOtherParticipant(
    participants: string[],
    senderId: string
  ): string | null {
    return participants.find((id) => id !== senderId) || null;
  }
}
