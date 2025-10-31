# 🎟️ VeriDraws

VeriDraws is a decentralized application (DApp) built on the Solana blockchain that enables users to create and participate in transparent and verifiable prize draws. Each draw is secured by smart contracts, ensuring fairness and transparency.

## ✨ Features

- 🏗️ Create custom prize draws with your own parameters
- 🔗 Connect with popular Solana wallets (Phantom, Solflare, etc.)
- 🎰 Join existing draws with SOL
- 🏆 Automatic winner selection using on-chain randomness
- 🔍 Transparent history of all draws and winners
- 💰 Secure prize distribution through smart contracts

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Rust (latest stable)
- Solana CLI (for smart contract deployment)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Diksha08112004/VeriDraws.git
   cd VeriDraws
   ```

2. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   ```

3. **Set up the Solana program**
   ```bash
   cd ../contracts
   cargo build-bpf
   ```

4. **Configure environment variables**
   Create a `.env.local` file in the frontend directory:
   ```
   NEXT_PUBLIC_SOLANA_NETWORK=devnet
   NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
   ```

### Running the Application

1. **Start the development server**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open in your browser**
   Visit [http://localhost:3000](http://localhost:3000) in your browser

## 📚 Documentation

### Smart Contract

The VeriDraws smart contract is written in Rust and handles:
- Creating new draws
- Joining draws
- Selecting winners
- Managing prize distribution

### Frontend

The frontend is built with Next.js and includes:
- Wallet connection
- Draw creation interface
- Draw listing and details
- Transaction handling

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch for your feature
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Solana for the amazing blockchain platform
- Anchor framework for Solana development
- All the open-source libraries used in this project

## 📧 Contact

For any questions or feedback, please open an issue on GitHub.
