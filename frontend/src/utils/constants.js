// ─── Chain configuration ──────────────────────────────────────────────────────
export const SUPPORTED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 31337);

export const CHAIN_CONFIG = {
  31337: {
    name: "Hardhat Local",
    rpcUrl: "http://127.0.0.1:8545",
    currency: "ETH",
    blockExplorer: null,
  },
  11155111: {
    name: "Sepolia Testnet",
    rpcUrl: `https://sepolia.infura.io/v3/${import.meta.env.VITE_INFURA_KEY ?? ""}`,
    currency: "ETH",
    blockExplorer: "https://sepolia.etherscan.io",
  },
};

// ─── Contract addresses (from .env) ──────────────────────────────────────────
export const KIDSAFE_ADDRESS  = import.meta.env.VITE_KIDSAFE_CONTRACT_ADDRESS ?? "";
export const TOKEN_ADDRESS    = import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS ?? "";

// ─── Token config ─────────────────────────────────────────────────────────────
export const TOKEN_DECIMALS   = 6;
export const TOKEN_SYMBOL     = "mUSDC";

// ─── Demo mode flag ───────────────────────────────────────────────────────────
// Set VITE_DEMO_MODE=true in .env to force mock data regardless of wallet state.
export const IS_DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === "true" ||
  !KIDSAFE_ADDRESS ||
  !TOKEN_ADDRESS;

// ─── Request status enum (mirrors the Solidity enum) ─────────────────────────
export const RequestStatus = {
  Pending:  0,
  Approved: 1,
  Rejected: 2,
};

export const REQUEST_STATUS_LABEL = {
  [RequestStatus.Pending]:  "Pending",
  [RequestStatus.Approved]: "Approved",
  [RequestStatus.Rejected]: "Rejected",
};

// ─── Transaction type labels ──────────────────────────────────────────────────
export const TxType = {
  DirectPayment: "Direct Payment",
  ApprovedRequest: "Approved Request",
  AllowanceDeposit: "Allowance Deposit",
  AllowanceWithdraw: "Allowance Withdrawal",
};

// ─── Misc UI constants ────────────────────────────────────────────────────────
export const TRUNCATE_LENGTH = 6; // chars shown on each side of address

// Max memo length for spending requests
export const MAX_MEMO_LENGTH = 100;

// Number of transactions to show per page
export const TX_PAGE_SIZE = 20;

// How long (ms) to poll for balance/state updates when no event listener
export const POLL_INTERVAL_MS = 8000;
