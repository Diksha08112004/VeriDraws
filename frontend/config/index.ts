import { PublicKey } from '@solana/web3.js';

// Development program ID - replace with your actual program ID after deployment
export const PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

// You can add more configuration options here as needed
export const config = {
  // Default RPC endpoint - using a more reliable provider
  rpcEndpoint: process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com',
  
  // Program-derived address (PDA) seeds
  pda: {
    // Add any PDA seeds your program uses
    draw: Buffer.from('draw'),
  },
};

// Re-export commonly used constants
export const DRAW_ACCOUNT_SIZE = 200; // Adjust based on your program's account size
