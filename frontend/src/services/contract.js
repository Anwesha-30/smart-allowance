/**
 * contract.js
 * -----------
 * All blockchain read/write operations for KidSafe and MockUSDC.
 *
 * Separation of concerns:
 *  - This file owns ABI definitions and contract call wrappers.
 *  - WalletContext/hooks call these functions and manage React state.
 *  - wallet.js owns the viem client factories.
 */

import { getPublicClient, getWalletClient } from "./wallet";
import { KIDSAFE_ADDRESS, TOKEN_ADDRESS, SUPPORTED_CHAIN_ID } from "@/utils/constants";

// ─── ABIs ─────────────────────────────────────────────────────────────────────
// Minimal ABIs — only the functions the frontend actually calls.

export const KIDSAFE_ABI = [
  // ── Registration ──
  {
    name: "registerChild",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "childAddress", type: "address" }],
    outputs: [],
  },
  // ── Allowance ──
  {
    name: "setAllowance",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "childAddress", type: "address" },
      { name: "amount",       type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "depositAllowance",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "childAddress", type: "address" },
      { name: "amount",       type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "withdrawAllowance",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "childAddress", type: "address" },
      { name: "amount",       type: "uint256" },
    ],
    outputs: [],
  },
  // ── Limits & Whitelist ──
  {
    name: "setDailyLimit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "childAddress", type: "address" },
      { name: "limit",        type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "addApprovedRecipient",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "childAddress",     type: "address" },
      { name: "recipientAddress", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "removeApprovedRecipient",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "childAddress",     type: "address" },
      { name: "recipientAddress", type: "address" },
    ],
    outputs: [],
  },
  // ── Payments ──
  {
    name: "makePayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount",    type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "requestPayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount",    type: "uint256" },
      { name: "memo",      type: "string"  },
    ],
    outputs: [{ name: "requestId", type: "uint256" }],
  },
  {
    name: "approveRequest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "rejectRequest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [],
  },
  // ── Views ──
  {
    name: "getChildDetails",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "childAddress", type: "address" }],
    outputs: [
      { name: "parent",           type: "address" },
      { name: "allowanceBalance", type: "uint256" },
      { name: "dailyLimit",       type: "uint256" },
      { name: "dailySpent",       type: "uint256" },
      { name: "registered",       type: "bool"    },
    ],
  },
  {
    name: "getDailySpending",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "childAddress", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getRemainingAllowance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "childAddress", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getApprovedRecipients",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "childAddress", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "getChildRequests",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "childAddress", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getRequest",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id",         type: "uint256" },
          { name: "child",      type: "address" },
          { name: "recipient",  type: "address" },
          { name: "amount",     type: "uint256" },
          { name: "memo",       type: "string"  },
          { name: "status",     type: "uint8"   },
          { name: "createdAt",  type: "uint256" },
          { name: "resolvedAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "nextRequestId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // ── Events ──
  {
    name: "ChildRegistered",
    type: "event",
    inputs: [
      { name: "parent", type: "address", indexed: true },
      { name: "child",  type: "address", indexed: true },
    ],
  },
  {
    name: "PaymentMade",
    type: "event",
    inputs: [
      { name: "child",     type: "address", indexed: true  },
      { name: "recipient", type: "address", indexed: true  },
      { name: "amount",    type: "uint256", indexed: false },
      { name: "requestId", type: "uint256", indexed: false },
    ],
  },
  {
    name: "RequestCreated",
    type: "event",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true  },
      { name: "child",     type: "address", indexed: true  },
      { name: "recipient", type: "address", indexed: true  },
      { name: "amount",    type: "uint256", indexed: false },
    ],
  },
  {
    name: "RequestApproved",
    type: "event",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "parent",    type: "address", indexed: true },
    ],
  },
  {
    name: "RequestRejected",
    type: "event",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "parent",    type: "address", indexed: true },
    ],
  },
  {
    name: "AllowanceDeposited",
    type: "event",
    inputs: [
      { name: "child",  type: "address", indexed: true  },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
];

export const TOKEN_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "account", type: "address" }],
    outputs: [{ name: "",        type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs:  [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs:  [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "string" }],
  },
];

// ─── Convenience accessors ────────────────────────────────────────────────────
const publicClient = () => getPublicClient(SUPPORTED_CHAIN_ID);

// ─── READ functions ───────────────────────────────────────────────────────────

/** Fetch full child details from the contract. */
export async function fetchChildDetails(childAddress) {
  const result = await publicClient().readContract({
    address:      KIDSAFE_ADDRESS,
    abi:          KIDSAFE_ABI,
    functionName: "getChildDetails",
    args:         [childAddress],
  });
  return {
    parent:           result[0],
    allowanceBalance: result[1],
    dailyLimit:       result[2],
    dailySpent:       result[3],
    registered:       result[4],
  };
}

/** Return the child's remaining allowance. */
export async function fetchRemainingAllowance(childAddress) {
  return publicClient().readContract({
    address:      KIDSAFE_ADDRESS,
    abi:          KIDSAFE_ABI,
    functionName: "getRemainingAllowance",
    args:         [childAddress],
  });
}

/** Return the child's total spend today. */
export async function fetchDailySpending(childAddress) {
  return publicClient().readContract({
    address:      KIDSAFE_ADDRESS,
    abi:          KIDSAFE_ABI,
    functionName: "getDailySpending",
    args:         [childAddress],
  });
}

/** Return the approved recipient address list for a child. */
export async function fetchApprovedRecipients(childAddress) {
  return publicClient().readContract({
    address:      KIDSAFE_ADDRESS,
    abi:          KIDSAFE_ABI,
    functionName: "getApprovedRecipients",
    args:         [childAddress],
  });
}

/** Return all request IDs for a child. */
export async function fetchChildRequestIds(childAddress) {
  return publicClient().readContract({
    address:      KIDSAFE_ADDRESS,
    abi:          KIDSAFE_ABI,
    functionName: "getChildRequests",
    args:         [childAddress],
  });
}

/** Return a single spending request by ID. */
export async function fetchRequest(requestId) {
  const r = await publicClient().readContract({
    address:      KIDSAFE_ADDRESS,
    abi:          KIDSAFE_ABI,
    functionName: "getRequest",
    args:         [BigInt(requestId)],
  });
  return {
    id:         r.id,
    child:      r.child,
    recipient:  r.recipient,
    amount:     r.amount,
    memo:       r.memo,
    status:     Number(r.status),
    createdAt:  r.createdAt,
    resolvedAt: r.resolvedAt,
  };
}

/** Return all requests for a child (fetches IDs then each request). */
export async function fetchAllChildRequests(childAddress) {
  const ids = await fetchChildRequestIds(childAddress);
  if (!ids.length) return [];
  const requests = await Promise.all(ids.map((id) => fetchRequest(id)));
  return requests.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}

/** Return the MockUSDC token balance of an address. */
export async function fetchTokenBalance(address) {
  return publicClient().readContract({
    address:      TOKEN_ADDRESS,
    abi:          TOKEN_ABI,
    functionName: "balanceOf",
    args:         [address],
  });
}

/** Return how much KidSafe is already approved to spend on behalf of address. */
export async function fetchTokenAllowance(ownerAddress) {
  return publicClient().readContract({
    address:      TOKEN_ADDRESS,
    abi:          TOKEN_ABI,
    functionName: "allowance",
    args:         [ownerAddress, KIDSAFE_ADDRESS],
  });
}

// ─── WRITE helpers ────────────────────────────────────────────────────────────

/**
 * Generic write helper — simulates, sends, and waits for the receipt.
 * Returns the transaction receipt.
 *
 * @param {string}   account      Connected wallet address (signer)
 * @param {string}   address      Contract address
 * @param {Array}    abi          Contract ABI
 * @param {string}   functionName
 * @param {Array}    args
 */
async function writeContract(account, address, abi, functionName, args = []) {
  const walletClient = getWalletClient(SUPPORTED_CHAIN_ID);
  const pubClient    = publicClient();

  // Simulate first to surface revert reasons before sending
  await pubClient.simulateContract({ account, address, abi, functionName, args });

  const hash = await walletClient.writeContract({ account, address, abi, functionName, args });
  const receipt = await pubClient.waitForTransactionReceipt({ hash });
  return receipt;
}

// ─── WRITE functions ──────────────────────────────────────────────────────────

/** Approve KidSafe to spend `amount` of MockUSDC from `account`. */
export async function approveToken(account, amount) {
  return writeContract(account, TOKEN_ADDRESS, TOKEN_ABI, "approve", [
    KIDSAFE_ADDRESS,
    amount,
  ]);
}

/** Mint MockUSDC faucet tokens (up to 10,000). */
export async function mintTestTokens(account, amount) {
  return writeContract(account, TOKEN_ADDRESS, TOKEN_ABI, "mint", [
    account,
    amount,
  ]);
}

/** Register a child wallet under the calling parent. */
export async function registerChild(account, childAddress) {
  return writeContract(account, KIDSAFE_ADDRESS, KIDSAFE_ABI, "registerChild", [
    childAddress,
  ]);
}

/** Deposit allowance (parent must have approved token first). */
export async function depositAllowance(account, childAddress, amount) {
  return writeContract(account, KIDSAFE_ADDRESS, KIDSAFE_ABI, "depositAllowance", [
    childAddress,
    amount,
  ]);
}

/** Set allowance (parent must have approved token first). */
export async function setAllowance(account, childAddress, amount) {
  return writeContract(account, KIDSAFE_ADDRESS, KIDSAFE_ABI, "setAllowance", [
    childAddress,
    amount,
  ]);
}

/** Set the child's daily spending limit. */
export async function setDailyLimit(account, childAddress, limit) {
  return writeContract(account, KIDSAFE_ADDRESS, KIDSAFE_ABI, "setDailyLimit", [
    childAddress,
    limit,
  ]);
}

/** Add a whitelisted recipient for a child. */
export async function addApprovedRecipient(account, childAddress, recipientAddress) {
  return writeContract(account, KIDSAFE_ADDRESS, KIDSAFE_ABI, "addApprovedRecipient", [
    childAddress,
    recipientAddress,
  ]);
}

/** Remove a whitelisted recipient for a child. */
export async function removeApprovedRecipient(account, childAddress, recipientAddress) {
  return writeContract(account, KIDSAFE_ADDRESS, KIDSAFE_ABI, "removeApprovedRecipient", [
    childAddress,
    recipientAddress,
  ]);
}

/** Child makes a direct payment to an approved recipient. */
export async function makePayment(account, recipientAddress, amount) {
  return writeContract(account, KIDSAFE_ADDRESS, KIDSAFE_ABI, "makePayment", [
    recipientAddress,
    amount,
  ]);
}

/** Child submits a spending request for parent approval. */
export async function requestPayment(account, recipientAddress, amount, memo) {
  return writeContract(account, KIDSAFE_ADDRESS, KIDSAFE_ABI, "requestPayment", [
    recipientAddress,
    amount,
    memo,
  ]);
}

/** Parent approves a pending spending request. */
export async function approveRequest(account, requestId) {
  return writeContract(account, KIDSAFE_ADDRESS, KIDSAFE_ABI, "approveRequest", [
    BigInt(requestId),
  ]);
}

/** Parent rejects a pending spending request. */
export async function rejectRequest(account, requestId) {
  return writeContract(account, KIDSAFE_ADDRESS, KIDSAFE_ABI, "rejectRequest", [
    BigInt(requestId),
  ]);
}

// ─── Event log fetcher ────────────────────────────────────────────────────────

/**
 * Fetch PaymentMade events for a child from the last N blocks.
 * Returns an array of formatted transaction objects.
 *
 * @param {string} childAddress
 * @param {number} [blockRange=10000]
 */
export async function fetchPaymentEvents(childAddress, blockRange = 10_000) {
  const client = publicClient();
  const latest = await client.getBlockNumber();
  const fromBlock = latest > BigInt(blockRange) ? latest - BigInt(blockRange) : 0n;

  const logs = await client.getLogs({
    address:   KIDSAFE_ADDRESS,
    event:     KIDSAFE_ABI.find((x) => x.name === "PaymentMade"),
    args:      { child: childAddress },
    fromBlock,
    toBlock:   "latest",
  });

  // Enrich with block timestamps
  const enriched = await Promise.all(
    logs.map(async (log) => {
      const block = await client.getBlock({ blockNumber: log.blockNumber });
      return {
        txHash:    log.transactionHash,
        child:     log.args.child,
        recipient: log.args.recipient,
        amount:    log.args.amount,
        requestId: log.args.requestId,
        timestamp: block.timestamp,
        blockNumber: Number(log.blockNumber),
        type: log.args.requestId > 0n ? "Approved Request" : "Direct Payment",
        status: "success",
      };
    })
  );

  return enriched.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
}
