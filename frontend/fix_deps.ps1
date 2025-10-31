# Install missing dependencies
Write-Host "Installing missing dependencies..."

# Install required dependencies
npm install @chakra-ui/react @emotion/react @emotion/styled framer-motion
npm install @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-wallets @solana/wallet-adapter-react-ui
npm install @solana/web3.js @project-serum/anchor @solana/spl-token

# Install TypeScript types
npm install --save-dev @types/node @types/react @types/react-dom
npm install --save-dev typescript @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Install Next.js and React
npm install next@latest react@latest react-dom@latest

# Create TypeScript config if it doesn't exist
if (-not (Test-Path tsconfig.json)) {
    npx tsc --init
}

Write-Host "Dependencies installed successfully!"
Write-Host "Run 'npm run dev' to start the development server."
