'use client';

import dynamic from 'next/dynamic';
import { WalletMultiButton as BaseWalletMultiButton } from '@solana/wallet-adapter-react-ui';

// Dynamically import the WalletMultiButton with SSR disabled
const WalletMultiButton = dynamic(
  () =>
    import('@solana/wallet-adapter-react-ui').then(
      (mod) => mod.WalletMultiButton
    ),
  {
    ssr: false,
  }
);

export default function WalletMultiButtonWrapper() {
  return <WalletMultiButton className="wallet-adapter-button-trigger" />;
}
