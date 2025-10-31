import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import type { AppProps } from 'next/app';
import { FC, useMemo } from 'react';
import { DrawProvider } from '@/contexts/DrawContext';
import '@solana/wallet-adapter-react-ui/styles.css';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// Extend the theme with custom styles
const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: 'gray.50',
        color: 'gray.800',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'bold',
        borderRadius: 'md',
      },
      variants: {
        solid: {
          bg: 'blue.500',
          color: 'white',
          _hover: {
            bg: 'blue.600',
          },
        },
      },
    },
  },
});

const App: FC<AppProps> = ({ Component, pageProps }) => {
  // Use devnet for development
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  // Initialize wallets with proper configuration for localhost
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter({
        network,
        // @ts-ignore
        config: {
          // @ts-ignore
          base58PublicKey: null,
          // @ts-ignore
          onDisconnect: () => {},
          // @ts-ignore
          onConnect: () => {}
        }
      }),
      new SolflareWalletAdapter({
        network,
        // @ts-ignore
        config: {
          // @ts-ignore
          commitment: 'confirmed',
          // @ts-ignore
          endpoint: endpoint,
          // @ts-ignore
          wsEndpoint: endpoint.replace('https://', 'wss://')
        }
      }),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ChakraProvider theme={theme}>
            <DrawProvider>
              <Component {...pageProps} />
            </DrawProvider>
          </ChakraProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;
