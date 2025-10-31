# Install Node.js if not already installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Node.js..."
    winget install OpenJS.NodeJS.LTS
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Install Rust if not already installed
if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Rust..."
    winget install Rustlang.Rustup
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    rustup update
    rustup component add rustfmt
    rustup component add clippy
}

# Install Solana CLI if not already installed
if (-not (Get-Command solana -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Solana CLI..."
    winget install Solana.SolanaCLI
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    solana config set --url devnet
}

# Install dependencies for the frontend
Set-Location frontend
Write-Host "Installing frontend dependencies..."
npm install

# Install additional required packages
npm install @project-serum/anchor @solana/spl-token @solana/wallet-adapter-wallets @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/web3.js

# Set up Solana keypair
Write-Host "Setting up Solana keypair..."
if (-not (Test-Path ~/.config/solana/id.json)) {
    solana-keygen new --no-bip39-passphrase
}

# Build the project
Write-Host "Building the project..."
npm run build

Write-Host "Setup complete! Run 'npm run dev' to start the development server."
