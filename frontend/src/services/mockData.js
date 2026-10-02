/**
 * mockData.js
 * -----------
 * Clearly-labelled DEMO MODE data used when:
 *   - MetaMask is not connected, or
 *   - VITE_DEMO_MODE=true in .env, or
 *   - Contract addresses are not configured.
 *
 * IMPORTANT: Mock data is never passed off as real on-chain transactions.
 * Every mock value is explicitly typed so components can show a "Demo" badge.
 */

import { RequestStatus } from "@/utils/constants";

// ─── Addresses ────────────────────────────────────────────────────────────────
export const MOCK_PARENT_ADDRESS  = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
export const MOCK_CHILD_ADDRESS   = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
export const MOCK_RECIPIENT_1     = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc";
export const MOCK_RECIPIENT_2     = "0x90f79bf6eb2c4f870365e785982e1f101e93b906";
export const MOCK_RECIPIENT_3     = "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65";

// ─── Child profile ────────────────────────────────────────────────────────────
export const MOCK_CHILD_DETAILS = {
  parent:           MOCK_PARENT_ADDRESS,
  allowanceBalance: 465_000_000n,   // $465.00 remaining
  dailyLimit:       50_000_000n,    // $50.00/day
  dailySpent:       35_000_000n,    // $35.00 spent today
  registered:       true,
};

// ─── Approved recipients ──────────────────────────────────────────────────────
export const MOCK_APPROVED_RECIPIENTS = [
  { address: MOCK_RECIPIENT_1, label: "School Store" },
  { address: MOCK_RECIPIENT_2, label: "Bookshop" },
  { address: MOCK_RECIPIENT_3, label: "Lunch Canteen" },
];

// ─── Token balances ───────────────────────────────────────────────────────────
export const MOCK_PARENT_TOKEN_BALANCE = 1_500_000_000n;  // $1,500
export const MOCK_CHILD_TOKEN_BALANCE  =   465_000_000n;  // $465

// ─── Transactions ─────────────────────────────────────────────────────────────
const now = Math.floor(Date.now() / 1000);
const DAY = 86_400;

export const MOCK_TRANSACTIONS = [
  {
    txHash:    "0xabc1230000000000000000000000000000000000000000000000000000000001",
    child:     MOCK_CHILD_ADDRESS,
    recipient: MOCK_RECIPIENT_3,
    amount:    8_000_000n,
    requestId: 0n,
    timestamp: BigInt(now - 3600),
    blockNumber: 42,
    type:      "Direct Payment",
    status:    "success",
    label:     "Lunch Canteen",
  },
  {
    txHash:    "0xabc1230000000000000000000000000000000000000000000000000000000002",
    child:     MOCK_CHILD_ADDRESS,
    recipient: MOCK_RECIPIENT_1,
    amount:    12_000_000n,
    requestId: 0n,
    timestamp: BigInt(now - 7200),
    blockNumber: 41,
    type:      "Direct Payment",
    status:    "success",
    label:     "School Store",
  },
  {
    txHash:    "0xabc1230000000000000000000000000000000000000000000000000000000003",
    child:     MOCK_CHILD_ADDRESS,
    recipient: MOCK_RECIPIENT_2,
    amount:    15_000_000n,
    requestId: 1n,
    timestamp: BigInt(now - DAY),
    blockNumber: 38,
    type:      "Approved Request",
    status:    "success",
    label:     "Bookshop",
  },
  {
    txHash:    "0xabc1230000000000000000000000000000000000000000000000000000000004",
    child:     MOCK_CHILD_ADDRESS,
    recipient: MOCK_RECIPIENT_1,
    amount:    20_000_000n,
    requestId: 2n,
    timestamp: BigInt(now - DAY * 2),
    blockNumber: 35,
    type:      "Approved Request",
    status:    "success",
    label:     "School Store",
  },
  {
    txHash:    null,
    child:     MOCK_CHILD_ADDRESS,
    recipient: MOCK_RECIPIENT_3,
    amount:    60_000_000n,
    requestId: 3n,
    timestamp: BigInt(now - DAY * 2 - 3600),
    blockNumber: null,
    type:      "Direct Payment",
    status:    "rejected",
    label:     "Lunch Canteen",
    rejectReason: "Daily limit exceeded",
  },
];

// ─── Spending requests ────────────────────────────────────────────────────────
export const MOCK_REQUESTS = [
  {
    id:         BigInt(4),
    child:      MOCK_CHILD_ADDRESS,
    recipient:  MOCK_RECIPIENT_1,
    amount:     25_000_000n,
    memo:       "New school supplies",
    status:     RequestStatus.Pending,
    createdAt:  BigInt(now - 1800),
    resolvedAt: 0n,
    label:      "School Store",
  },
  {
    id:         BigInt(3),
    child:      MOCK_CHILD_ADDRESS,
    recipient:  MOCK_RECIPIENT_3,
    amount:     60_000_000n,
    memo:       "Lunch for the week",
    status:     RequestStatus.Rejected,
    createdAt:  BigInt(now - DAY * 2 - 3600),
    resolvedAt: BigInt(now - DAY * 2),
    label:      "Lunch Canteen",
  },
  {
    id:         BigInt(2),
    child:      MOCK_CHILD_ADDRESS,
    recipient:  MOCK_RECIPIENT_1,
    amount:     20_000_000n,
    memo:       "Art class materials",
    status:     RequestStatus.Approved,
    createdAt:  BigInt(now - DAY * 2 - 7200),
    resolvedAt: BigInt(now - DAY * 2),
    label:      "School Store",
  },
  {
    id:         BigInt(1),
    child:      MOCK_CHILD_ADDRESS,
    recipient:  MOCK_RECIPIENT_2,
    amount:     15_000_000n,
    memo:       "Science textbook",
    status:     RequestStatus.Approved,
    createdAt:  BigInt(now - DAY - 3600),
    resolvedAt: BigInt(now - DAY),
    label:      "Bookshop",
  },
];

// ─── Spending chart data (for the parent dashboard bar chart) ─────────────────
export const MOCK_WEEKLY_SPENDING = [
  { day: "Mon", amount: 12 },
  { day: "Tue", amount: 0  },
  { day: "Wed", amount: 8  },
  { day: "Thu", amount: 15 },
  { day: "Fri", amount: 35 },
  { day: "Sat", amount: 0  },
  { day: "Sun", amount: 0  },
];

// ─── Parent summary stats ─────────────────────────────────────────────────────
export const MOCK_PARENT_STATS = {
  totalAllocated:  500_000_000n,   // $500 allocated this month
  childBalance:    465_000_000n,   // $465 remaining
  todaySpending:    35_000_000n,   // $35 spent today
  pendingRequests: 1,
};
