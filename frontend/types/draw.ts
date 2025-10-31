import { PublicKey } from '@solana/web3.js';

export interface Draw {
  publicKey: PublicKey;
  account: {
    isInitialized: boolean;
    creator: PublicKey;
    name: string;
    description: string;
    ticketPrice: number; // in lamports
    maxParticipants: number;
    participants: PublicKey[];
    winner: PublicKey | null;
    isActive: boolean;
    createdAt: number;
  };
}

export interface CreateDrawData {
  name: string;
  description: string;
  ticketPrice: number;
  maxParticipants: number;
}

export interface JoinDrawData {
  drawAddress: string;
  ticketPrice: number;
}

export interface DrawState {
  draws: Draw[];
  isLoading: boolean;
  error: string | null;
  createDraw: (data: CreateDrawData) => Promise<void>;
  joinDraw: (data: JoinDrawData) => Promise<void>;
  pickWinner: (drawAddress: string) => Promise<void>;
  fetchDraws: () => Promise<void>;
}
