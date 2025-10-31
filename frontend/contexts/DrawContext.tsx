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

// Extend the Draw type to include the raw account data for type safety
type DrawAccountType = {
  publicKey: PublicKey;
  account: {
    isInitialized: boolean;
    creator: PublicKey;
    name: string;
    description: string;
    ticketPrice: BN;
    maxParticipants: number;
    participants: PublicKey[];
    winner: PublicKey | null;
    isActive: boolean;
    createdAt: BN;
    [key: string]: any; // For any additional properties that might come from the chain
  };
};

interface DrawContextType {
  draws: DrawAccountType[];
  myDraws: DrawAccountType[];
  joinedDraws: DrawAccountType[];
  availableDraws: DrawAccountType[];
  isLoading: boolean;
  error: string | null;
  createDraw: (data: CreateDrawData) => Promise<string>;
  joinDraw: (data: JoinDrawData) => Promise<void>;
  pickWinner: (drawAddress: string) => Promise<void>;
  fetchDraws: () => Promise<void>;
  refreshDraws: () => Promise<void>;
}

const DrawContext = createContext<DrawContextType | undefined>(undefined);

export const DrawProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [draws, setDraws] = useState<DrawAccountType[]>([]);
  const [myDraws, setMyDraws] = useState<DrawAccountType[]>([]);
  const [joinedDraws, setJoinedDraws] = useState<DrawAccountType[]>([]);
  const [availableDraws, setAvailableDraws] = useState<DrawAccountType[]>([]);
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

  // Categorize draws based on user's relationship to them
  const refreshDraws = useCallback(async () => {
    if (!program || !publicKey) return;
    
    setIsLoading(true);
    setError(null);
    
    const withRetry = async <T,>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
      try {
        return await fn();
      } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return withRetry(fn, retries - 1, delay * 2);
      }
    };

    try {
      // First try the program account method
      const fetchDraws = async (): Promise<DrawAccountType[]> => {
        try {
          const drawAccounts = await program.account.drawAccount.all();
          return drawAccounts.map(draw => ({
            publicKey: draw.publicKey,
            account: {
              ...draw.account,
              // Ensure we have all required fields with defaults if missing
              isInitialized: draw.account.isInitialized ?? true,
              creator: draw.account.creator ?? PublicKey.default,
              name: draw.account.name ?? '',
              description: draw.account.description ?? '',
              ticketPrice: draw.account.ticketPrice ?? new BN(0),
              maxParticipants: draw.account.maxParticipants ?? 0,
              participants: draw.account.participants ?? [],
              winner: draw.account.winner ?? null,
              isActive: draw.account.isActive ?? true,
              createdAt: draw.account.createdAt ?? new BN(0)
            }
          }));
        } catch (error) {
          console.warn('Failed to fetch draws using program account, falling back to getProgramAccounts');
          // Fallback to getProgramAccounts if the first method fails
          const accounts = await connection.getProgramAccounts(program.programId, {
            filters: [
              {
                dataSize: 200, // Adjust the size according to your account size
              },
            ],
          });

          return accounts.map(({ pubkey, account }) => ({
            publicKey: pubkey,
            account: program.coder.accounts.decode('drawAccount', account.data)
          }));
        }
      };

      const formattedDraws = await withRetry(fetchDraws);
      
      setDraws(formattedDraws);
      
      // Categorize draws
      const myDrawsList = formattedDraws.filter(draw => 
        draw.account.creator && draw.account.creator.equals(publicKey)
      );
      
      const joinedDrawsList = formattedDraws.filter(draw => 
        draw.account.creator && 
        !draw.account.creator.equals(publicKey) && 
        draw.account.participants?.some((p: PublicKey) => p.equals(publicKey))
      );
      
      const availableDrawsList = formattedDraws.filter(draw => {
        const isMyDraw = draw.account.creator && draw.account.creator.equals(publicKey);
        const hasJoined = draw.account.participants?.some((p: PublicKey) => p.equals(publicKey));
        return !isMyDraw && !hasJoined && draw.account.isActive === true;
      });
      
      setMyDraws(myDrawsList);
      setJoinedDraws(joinedDrawsList);
      setAvailableDraws(availableDrawsList);
      
    } catch (err) {
      console.error('Error fetching draws:', err);
      setError('Failed to fetch draws. The Solana network might be experiencing high traffic. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [program, publicKey, connection]);

  // Define createDraw
  const createDraw = useCallback(async (data: CreateDrawData): Promise<string> => {
    if (!program || !publicKey || !wallet || !sendTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Generate a new keypair for the draw account
      const drawAccount = Keypair.generate();
      
      // Convert SOL to lamports
      const ticketPriceInLamports = Math.floor(data.ticketPrice * 1e9);
      
      // Get the latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      
      // Create the instruction to initialize the draw account
      const tx = await program.methods
        .initialize(
          data.name || 'Untitled Draw',
          data.description || '',
          new BN(ticketPriceInLamports),
          new BN(data.maxParticipants || 100) // Default to 100 if not provided
        )
        .accounts({
          drawAccount: drawAccount.publicKey,
          user: publicKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([drawAccount])
        .transaction();
      
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      
      // Sign and send the transaction
      const signedTx = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      // Confirm the transaction
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });
      
      // Refresh the draws list
      await refreshDraws();
      
      return signature;
      
    } catch (err) {
      console.error('Error creating draw:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create draw';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [program, publicKey, wallet, sendTransaction, connection, refreshDraws]);

  const joinDraw = useCallback(async (data: JoinDrawData) => {
    if (!program || !publicKey || !wallet || !sendTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const drawPubkey = new PublicKey(data.drawAddress);
      
      // Get the latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      
      // Create the transaction
      const tx = await program.methods
        .join()
        .accounts({
          drawAccount: drawPubkey,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      
      // Sign and send the transaction
      const signedTx = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      // Confirm the transaction
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });
      
      // Refresh the draws list
      await refreshDraws();
      
    } catch (err) {
      console.error('Error joining draw:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to join draw';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [program, publicKey, wallet, sendTransaction, connection, refreshDraws]);

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
      await refreshDraws();
    } catch (err) {
      console.error('Failed to pick winner:', err);
      setError('Failed to pick winner');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey, refreshDraws]);

  // Alias refreshDraws as fetchDraws for backward compatibility
  const fetchDraws = useCallback(async () => {
    return refreshDraws();
  }, [refreshDraws]);

  return (
    <DrawContext.Provider
      value={{
        draws,
        myDraws,
        joinedDraws,
        availableDraws,
        isLoading,
        error,
        createDraw,
        joinDraw,
        pickWinner,
        fetchDraws,
        refreshDraws,
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
