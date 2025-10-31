# Install frontend dependencies
Write-Host "Installing frontend dependencies..."
npm install

# Install additional required packages
npm install @project-serum/anchor @solana/spl-token @solana/wallet-adapter-wallets @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/web3.js

# Install TypeScript types
npm install --save-dev @types/node @types/react @types/react-dom

# Install development dependencies
npm install --save-dev typescript @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier eslint-plugin-prettier

Write-Host "Frontend dependencies installed successfully!"
