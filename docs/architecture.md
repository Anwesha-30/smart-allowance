# KidSafe — Architecture Overview

## High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  ┌──────────────┐    ┌─────────────────────────────────┐   │
│  │   MetaMask   │◄──►│   React + Vite Frontend          │   │
│  │  (Signer)    │    │   Tailwind CSS / Lucide / Recharts│   │
│  └──────────────┘    └──────────────┬──────────────────┘   │
│                                     │ viem                  │
└─────────────────────────────────────┼─────────────────────┘
                                      │ JSON-RPC
                    ┌─────────────────▼─────────────────┐
                    │      Hardhat Local Node            │
                    │      (or EVM Testnet)              │
                    │                                    │
                    │  ┌───────────────────────────┐    │
                    │  │       KidSafe.sol          │    │
                    │  │  - registerChild()         │    │
                    │  │  - depositAllowance()      │    │
                    │  │  - setDailyLimit()         │    │
                    │  │  - addApprovedRecipient()  │    │
                    │  │  - makePayment()           │    │
                    │  │  - requestPayment()        │    │
                    │  │  - approveRequest()        │    │
                    │  │  - rejectRequest()         │    │
                    │  └───────────────┬───────────┘    │
                    │                  │ ERC-20 calls    │
                    │  ┌───────────────▼───────────┐    │
                    │  │       MockUSDC.sol         │    │
                    │  │  ERC-20, 6 decimals        │    │
                    │  │  Public faucet mint()      │    │
                    │  └───────────────────────────┘    │
                    └───────────────────────────────────┘
```

---

## Frontend Architecture

### Directory Layout

```
frontend/src/
├── context/
│   └── WalletContext.jsx     Global wallet state; MetaMask event listeners
├── hooks/
│   ├── useWallet.js          Re-exports WalletContext + shortAddress
│   ├── useKidSafe.js         All contract write actions with loading/toast
│   └── useAllowance.js       Contract reads + polling; demo-mode fallback
├── services/
│   ├── wallet.js             viem client factories, MetaMask helpers
│   ├── contract.js           ABI definitions + read/write wrappers
│   └── mockData.js           Demo-mode static data (clearly labelled)
├── utils/
│   ├── constants.js          Env vars, chain config, enums, UI constants
│   ├── formatCurrency.js     BigInt ↔ human converters, formatToken, dates
│   └── formatAddress.js      shortenAddress, isValidAddress, txUrl
├── components/               Reusable UI components (no business logic)
└── pages/                    Route-level page components
```

### Data Flow

```
MetaMask
  └─► WalletContext (account, chainId, connect/disconnect/switchChain)
        └─► useWallet (shortAddress)
              └─► useKidSafe (write actions → contract.js → MetaMask sign)
              └─► useAllowance (reads → contract.js → viem publicClient)
                    └─► Page components → UI components → rendered UI
```

### Demo Mode

`IS_DEMO_MODE` is `true` when either:
- `VITE_KIDSAFE_CONTRACT_ADDRESS` is empty, or
- `VITE_DEMO_MODE=true` in `.env`, or
- No MetaMask account is connected.

In demo mode:
- `useAllowance` returns data from `mockData.js` — no RPC calls are made.
- `useKidSafe` write actions are no-ops that show a toast explaining demo mode.
- Every page shows a yellow "Demo Mode" banner.
- Mock transactions are never displayed as verified on-chain.

---

## Smart Contract Architecture

### Storage Model

```
KidSafe contract storage:
  token                              IERC20 (MockUSDC address, immutable)
  children[childAddress]             Child struct
  approvedRecipients[child][addr]    bool
  _recipientList[child]              address[] (for iteration)
  requests[requestId]                SpendingRequest struct
  _childRequests[child]              uint256[] (request IDs)
  nextRequestId                      uint256 (auto-increment)
```

### Child Struct

```solidity
struct Child {
    address parent;           // who registered this child
    uint256 allowanceBalance; // tokens held in contract for this child
    uint256 dailyLimit;       // max spend per UTC day (0 = no limit)
    uint256 dailySpent;       // running total for current day
    uint256 lastSpendDay;     // Unix day index (timestamp / 86400)
    bool    registered;
}
```

### Payment Flows

**Direct Payment (makePayment)**
```
Child calls makePayment(recipient, amount)
  → onlyRegisteredChild guard
  → RecipientNotApproved if not whitelisted
  → _checkAndUpdateLimits()
      → InsufficientAllowance if amount > balance
      → Reset dailySpent if new day
      → DailyLimitExceeded if dailySpent + amount > dailyLimit
      → update dailySpent, decrement allowanceBalance
  → token.safeTransfer(recipient, amount)
  → emit PaymentMade
```

**Request-Based Payment (requestPayment → approveRequest)**
```
Child calls requestPayment(recipient, amount, memo)
  → onlyRegisteredChild guard
  → RecipientNotApproved if not whitelisted
  → InsufficientAllowance if amount > balance
  → Store SpendingRequest{status: Pending}
  → emit RequestCreated

Parent calls approveRequest(requestId)
  → RequestNotPending if already resolved
  → NotParent if caller ≠ child's parent
  → _checkAndUpdateLimits() ← enforces limits at approval time
  → token.safeTransfer(recipient, amount)
  → emit RequestApproved + PaymentMade

Parent calls rejectRequest(requestId)
  → RequestNotPending if already resolved
  → NotParent if caller ≠ child's parent
  → status = Rejected, no token transfer
  → emit RequestRejected
```

### Daily Limit Reset

The contract uses a UTC-day-index approach:
```solidity
function _today() internal view returns (uint256) {
    return block.timestamp / 1 days;
}
```
If `child.lastSpendDay < _today()`, the daily counter resets to zero before checking. This means the limit resets automatically at midnight UTC without any cron job or keeper.

---

## Security Considerations (MVP Scope)

| Concern | Mitigation |
|---|---|
| Reentrancy on payments | `ReentrancyGuard` on `makePayment`, `approveRequest`, `withdrawAllowance` |
| Token transfer safety | `SafeERC20` (reverts on false-returning tokens) |
| Authorization | `onlyParentOf` and `onlyRegisteredChild` modifiers; custom errors |
| Frontend bypass | Contract validates all rules independently of frontend |
| Private keys in frontend | Only public addresses and contract ABIs in env vars |

**MVP Limitation:** KidSafe only controls tokens deposited into the contract itself. A child with an independently funded wallet can still make direct transfers outside KidSafe. This is documented in the UI and README.

---

## Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_KIDSAFE_CONTRACT_ADDRESS` | Frontend | Deployed KidSafe address |
| `VITE_TOKEN_CONTRACT_ADDRESS` | Frontend | Deployed MockUSDC address |
| `VITE_CHAIN_ID` | Frontend | Expected chain ID (31337 for local) |
| `VITE_RPC_URL` | Frontend | RPC endpoint for read-only client |
| `VITE_DEMO_MODE` | Frontend | Force demo mode even if connected |

---

## Technology Decisions

| Decision | Rationale |
|---|---|
| viem over ethers.js | TypeScript-first, tree-shakeable, modern API, no BigNumber wrapper needed |
| Inline ABI (no JSON import) | Avoids file-system dependency during Vite builds; keeps ABI next to the code that uses it |
| Polling over websocket events | Simpler for MVP; websocket subscriptions add complexity with reconnect logic |
| MockUSDC (not ETH) | ERC-20 mirrors real-world token usage; cleaner accounting than native ETH |
| Demo mode fallback | Allows UI demonstration even if the blockchain is not running |
| Hardhat local network | Zero-cost, instant finality, full EVM, no testnet faucet required |
