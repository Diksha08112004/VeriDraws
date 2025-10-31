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

# Install Solana program dependencies
Write-Host "Installing Solana program dependencies..."
cd programs/veridraws
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
cargo install --git https://github.com/coral-xyz/anchor --tag v0.28.0 anchor-cli --locked --force

# Build the program
Write-Host "Building the Solana program..."
cargo build-bpf

Write-Host "Rust and Solana setup complete!"
