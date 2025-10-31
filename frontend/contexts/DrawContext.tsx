import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, VersionedTransaction } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN, Idl } from '@project-serum/anchor';
import { useConnection, useWallet, WalletContextState } from '@solana/wallet-adapter-react';
import type { Draw, CreateDrawData, JoinDrawData } from '@/types/draw';
import { PROGRAM_ID, config } from '@/config';
// @ts-ignore - We know the shape of the IDL
import idl from '../idl/veridraws.json';

// Ensure Buffer is available in the browser
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = require('buffer/').Buffer;
}

interface DrawContextType {
  draws: Draw[];
  isLoading: boolean;
  error: string | null;
  createDraw: (data: CreateDrawData) => Promise<void>;
  joinDraw: (data: JoinDrawData) => Promise<void>;
  pickWinner: (drawAddress: string) => Promise<void>;
  fetchDraws: () => Promise<void>;
}

const DrawContext = createContext<DrawContextType | undefined>(undefined);

export const DrawProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { publicKey, sendTransaction, wallet } = useWallet();

  // Initialize connection with better timeout settings
  const { connection } = useConnection();
  
  // Initialize provider
  const provider = useMemo(() => {
    if (!connection || !publicKey) return null;
    
    // Create a wrapper that implements the Signer interface
    const signer = {
      publicKey,
      signTransaction: async (transaction: Transaction) => {
        if (!wallet?.adapter) {
          throw new Error('Wallet not connected');
        }
        // Use the wallet's signTransaction method directly if available
        if ('signTransaction' in wallet.adapter && typeof wallet.adapter.signTransaction === 'function') {
          return wallet.adapter.signTransaction(transaction);
        }
        // Fallback to using sendTransaction
        if ('sendTransaction' in wallet.adapter && typeof wallet.adapter.sendTransaction === 'function') {
          const signature = await wallet.adapter.sendTransaction(transaction, connection);
          const signatureBuffer = Buffer.from(signature, 'base64');
          transaction.addSignature(publicKey, signatureBuffer);
          return transaction;
        }
        throw new Error('Wallet does not support transaction signing');
      },
      signAllTransactions: async (transactions: Transaction[]) => {
        if (!wallet?.adapter) {
          throw new Error('Wallet not connected');
        }
        // Use the wallet's signAllTransactions method if available
        if ('signAllTransactions' in wallet.adapter && typeof wallet.adapter.signAllTransactions === 'function') {
          return wallet.adapter.signAllTransactions(transactions);
        }
        // Fallback to signing one by one
        const signedTransactions: Transaction[] = [];
        for (const tx of transactions) {
          if ('sendTransaction' in wallet.adapter && typeof wallet.adapter.sendTransaction === 'function') {
            const signature = await wallet.adapter.sendTransaction(tx, connection);
            const signatureBuffer = Buffer.from(signature, 'base64');
            tx.addSignature(publicKey, signatureBuffer);
            signedTransactions.push(tx);
          } else {
            throw new Error('Wallet does not support batch transaction signing');
          }
        }
        return signedTransactions;
      },
    };
    
    return new AnchorProvider(
      connection, 
      signer as any, // Type assertion needed due to type mismatch
      {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      }
    );
  }, [connection, wallet?.adapter, publicKey]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(idl as any, PROGRAM_ID, provider);
  }, [provider]);

  const fetchDraws = useCallback(async () => {
    if (!program || !publicKey) {
      console.log('Program or public key not available');
      return;
    }
    
    // Reset error state at the start of fetch
    setError(null);
    setIsLoading(true);
    
    // Add a timeout to prevent hanging
    const timeout = setTimeout(() => {
      setError('Request timed out. Please check your connection and try again.');
      setIsLoading(false);
      console.error('Fetch draws request timed out');
    }, 30000); // 30 second timeout

    try {
      console.log('Fetching draws with program ID:', PROGRAM_ID.toString());
      
      // Try to fetch using the program's account method first
      let drawAccounts;
      try {
        console.log('Attempting to fetch draws using program.account...');
        drawAccounts = await program.account.drawAccount.all();
        console.log('Successfully fetched', drawAccounts.length, 'draws using program.account');
      } catch (programError) {
        console.warn('Error using program.account, falling back to getProgramAccounts:', programError);
        
        // Fallback to getProgramAccounts if the first method fails
        console.log('Attempting fallback method using getProgramAccounts...');
        const accounts = await connection.getProgramAccounts(
          new PublicKey(PROGRAM_ID),
          {
            filters: [
              {
                dataSize: 165 // Adjust this size based on your account structure
              }
            ]
          }
        );
        
        if (!program.coder) {
          throw new Error('Program coder not available');
        }
        
        // Decode the accounts manually
        drawAccounts = accounts.map(account => {
          try {
            const decoded = program.coder.accounts.decode('drawAccount', account.account.data);
            return {
              publicKey: account.pubkey,
              account: {
                ...decoded,
                // Handle BN conversion for numeric fields
                ticketPrice: typeof decoded.ticketPrice === 'object' && 'toNumber' in decoded.ticketPrice 
                  ? decoded.ticketPrice.toNumber() 
                  : Number(decoded.ticketPrice || 0),
                maxParticipants: typeof decoded.maxParticipants === 'object' && 'toNumber' in decoded.maxParticipants
                  ? decoded.maxParticipants.toNumber()
                  : Number(decoded.maxParticipants || 0),
                participants: (decoded.participants || []).map((p: any) => new PublicKey(p)),
                winner: decoded.winner ? new PublicKey(decoded.winner) : null,
                isActive: Boolean(decoded.isActive),
                createdAt: typeof decoded.createdAt === 'object' && 'toNumber' in decoded.createdAt
                  ? decoded.createdAt.toNumber()
                  : Number(decoded.createdAt || 0),
              }
            };
          } catch (decodeError) {
            console.error('Error decoding account:', decodeError);
            return null;
          }
        }).filter(Boolean); // Remove any null entries from failed decodes
        
        console.log('Successfully fetched', drawAccounts.length, 'draws using getProgramAccounts');
      }
      
      if (!drawAccounts || drawAccounts.length === 0) {
        console.log('No draw accounts found');
        setDraws([]);
        return;
      }
      
      // Process and format the fetched draws
      const formattedDraws = drawAccounts
        .filter((draw): draw is { publicKey: PublicKey; account: any } => draw !== null)
        .map(draw => ({
          ...draw.account,
          publicKey: draw.publicKey.toString(),
        }));
      
      setDraws(formattedDraws);
      console.log('Successfully processed', formattedDraws.length, 'draws');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch draws';
      console.error('Error in fetchDraws:', errorMessage, err);
      setError(`Error: ${errorMessage}. Please check the console for more details.`);
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  }, [program, publicKey, connection, setError, setIsLoading, setDraws]);

  const createDraw = useCallback(async (data: CreateDrawData) => {
    if (!publicKey || !connection) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement create draw transaction
      // This is a placeholder - replace with actual program interaction
      console.log('Creating draw:', data);
      
      // After successful creation, refresh the draws list
      await fetchDraws();
    } catch (err) {
      console.error('Failed to create draw:', err);
      setError('Failed to create draw');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey, fetchDraws]);

  const joinDraw = useCallback(async (data: JoinDrawData) => {
    if (!publicKey || !connection) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement join draw transaction
      console.log('Joining draw:', data);
      
      // After successful join, refresh the draws list
      await fetchDraws();
    } catch (err) {
      console.error('Failed to join draw:', err);
      setError('Failed to join draw');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey, fetchDraws]);

  const pickWinner = useCallback(async (drawAddress: string) => {
    if (!publicKey || !connection) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement pick winner transaction
      console.log('Picking winner for draw:', drawAddress);
      
      // After picking winner, refresh the draws list
      await fetchDraws();
    } catch (err) {
      console.error('Failed to pick winner:', err);
      setError('Failed to pick winner');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey, fetchDraws]);

  return (
    <DrawContext.Provider
      value={{
        draws,
        isLoading,
        error,
        createDraw,
        joinDraw,
        pickWinner,
        fetchDraws,
      }}
    >
      {children}
    </DrawContext.Provider>
  );
};

export const useDraw = (): DrawContextType => {
  const context = useContext(DrawContext);
  if (context === undefined) {
    throw new Error('useDraw must be used within a DrawProvider');
  }
  return context;
};
