# KidSafe — Smart Allowance. Safer Spending.

KidSafe is a blockchain-based allowance management platform where parents can set spending limits, whitelist approved recipients, and monitor their child's crypto spending — all enforced by a smart contract.

> **Hackathon MVP** — Built for demonstration on a local Hardhat network with test tokens only. Do not use real funds.

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- MetaMask browser extension

### 1. Install dependencies

```bash
# Install contract dependencies
cd contracts
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Compile contracts

```bash
cd contracts
npx hardhat compile
```

### 3. Run contract tests

```bash
cd contracts
npx hardhat test
```

### 4. Start local blockchain

Open a new terminal and keep it running:

```bash
cd contracts
npx hardhat node
```

### 5. Deploy contracts

In a second terminal:

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

Copy the printed contract addresses into `frontend/.env`.

### 6. Seed demo data (optional)

```bash
cd contracts
npx hardhat run scripts/seedDemo.js --network localhost
```

### 7. Configure frontend environment

```bash
cd frontend
cp .env.example .env
# Edit .env and paste the contract addresses from step 5
```

### 8. Start the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## MetaMask Setup for Local Demo

1. Open MetaMask → Add Network → Localhost 8545
   - Network Name: Hardhat Local
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
2. Import one of the private keys printed by `npx hardhat node` as the **parent** account.
3. Import a second key as the **child** account.

---

## Project Structure

```
kidsafe/
├── contracts/          Solidity contracts, tests, deploy scripts
│   ├── contracts/      KidSafe.sol, MockUSDC.sol
│   ├── scripts/        deploy.js, seedDemo.js
│   └── test/           KidSafe.test.js
├── frontend/           React + Vite application
│   └── src/
│       ├── components/ Reusable UI components
│       ├── pages/      Route-level page components
│       ├── hooks/      Custom React hooks
│       ├── context/    WalletContext
│       ├── services/   Contract and wallet helpers
│       └── utils/      Formatters and constants
└── docs/               Architecture and demo documentation
```

---

## Features

| Role | Feature |
|---|---|
| Parent | Connect wallet, register child wallet |
| Parent | Set monthly allowance and daily spending limit |
| Parent | Whitelist approved recipient addresses |
| Parent | Approve or reject spending requests |
| Parent | Monitor transaction history |
| Child | View available allowance and daily limit |
| Child | Request or send payments to approved recipients |
| Child | Track spending history |

---

## Demo Mode

If the blockchain is not connected, the app falls back to clearly-labeled **Demo Mode** using mock data. Mock transactions are never displayed as on-chain transactions.

---

## Important Notes

- All amounts use a mock ERC-20 token (MockUSDC) with 6 decimals.
- Spending rules are enforced by the smart contract, not only the frontend.
- This MVP does not implement account abstraction or session keys — the child's wallet signs transactions directly through MetaMask.
- See `docs/architecture.md` for a full technical overview.
