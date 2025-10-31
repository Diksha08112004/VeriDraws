@echo off
echo Installing Rust...
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

setx PATH "%USERPROFILE%\.cargo\bin;%PATH%" /M

rustup component add rustfmt
rustup component add clippy

echo Installing Solana CLI...
cmd /c "curl -sSfL https://release.solana.com/v1.16.0/solana-install-init-x86_64-pc-windows-msvc.exe --output C:\solana-install-tmp\solana-install-init.exe --create-dirs"
C:\solana-install-tmp\solana-install-init.exe v1.16.0
setx PATH "%USERPROFILE%\AppData\Local\solana\install\releases\1.16.0\solana-release\x86_64-pc-windows-msvc\;%PATH%" /M

solana config set --url devnet

cd contracts\programs\veridraws
cargo build-bpf

cd ..\..\..\frontend
npm install @project-serum/anchor @solana/spl-token @solana/wallet-adapter-wallets @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/web3.js

cd ..
echo Setup complete! Please restart your terminal and run 'solana config get' to verify the installation.
pause
