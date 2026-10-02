/**
 * useKidSafe.js
 * -------------
 * Central hook for all KidSafe contract interactions.
 *
 * Handles:
 *   - Child registration
 *   - Allowance deposits
 *   - Daily limit updates
 *   - Whitelist management
 *   - Direct payments (makePayment)
 *   - Spending requests (requestPayment / approveRequest / rejectRequest)
 *   - Loading and error state per action
 *
 * Demo mode: every write function is a no-op that returns mock success data
 * and toasts a "Demo mode" message rather than touching the blockchain.
 */

import { useCallback, useState } from "react";
import toast from "react-hot-toast";

import { useWallet } from "./useWallet";
import { parseContractError } from "@/services/wallet";
import {
  registerChild        as _registerChild,
  depositAllowance     as _depositAllowance,
  setAllowance         as _setAllowance,
  setDailyLimit        as _setDailyLimit,
  addApprovedRecipient as _addApprovedRecipient,
  removeApprovedRecipient as _removeApprovedRecipient,
  makePayment          as _makePayment,
  requestPayment       as _requestPayment,
  approveRequest       as _approveRequest,
  rejectRequest        as _rejectRequest,
  approveToken,
  fetchTokenAllowance,
  mintTestTokens       as _mintTestTokens,
} from "@/services/contract";
import { toRaw } from "@/utils/formatCurrency";

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Ensure the KidSafe contract has sufficient token allowance before a deposit.
 * If current allowance < amount, requests a new approval from MetaMask first.
 */
async function ensureTokenApproval(account, amountRaw) {
  const current = await fetchTokenAllowance(account);
  if (current < amountRaw) {
    toast.loading("Approving token spend…", { id: "approve" });
    await approveToken(account, amountRaw);
    toast.dismiss("approve");
  }
}

// ─── hook ─────────────────────────────────────────────────────────────────────
export function useKidSafe() {
  const { account, isDemoMode } = useWallet();
  const [loading, setLoading]   = useState({});
  const [txHash,  setTxHash]    = useState(null);

  // Mark a named action as loading / done
  const setActionLoading = (key, val) =>
    setLoading((prev) => ({ ...prev, [key]: val }));

  /**
   * Generic wrapper:
   *  - sets loading state
   *  - calls the async action
   *  - toasts success / error
   *  - calls optional onSuccess callback
   */
  const run = useCallback(
    async (key, label, action, onSuccess) => {
      if (isDemoMode) {
        toast(`${label} — Demo mode (no real transaction).`, { icon: "🧪" });
        onSuccess?.({ demo: true });
        return { demo: true };
      }

      setActionLoading(key, true);
      const toastId = toast.loading(`${label}…`);
      try {
        const receipt = await action();
        setTxHash(receipt?.transactionHash ?? null);
        toast.success(`${label} successful!`, { id: toastId });
        onSuccess?.(receipt);
        return receipt;
      } catch (err) {
        const msg = parseContractError(err);
        toast.error(msg, { id: toastId });
        return null;
      } finally {
        setActionLoading(key, false);
      }
    },
    [isDemoMode]
  );

  // ── Actions ─────────────────────────────────────────────────────────────────

  /** Register a child wallet under the connected parent. */
  const registerChild = useCallback(
    (childAddress, onSuccess) =>
      run(
        "registerChild",
        "Register child",
        () => _registerChild(account, childAddress),
        onSuccess
      ),
    [account, run]
  );

  /**
   * Deposit tokens as child's allowance.
   * `amountHuman` is the dollar amount (e.g. 100 → 100 mUSDC).
   * Handles token approval automatically.
   */
  const depositAllowance = useCallback(
    (childAddress, amountHuman, onSuccess) =>
      run(
        "depositAllowance",
        "Deposit allowance",
        async () => {
          const raw = toRaw(amountHuman);
          await ensureTokenApproval(account, raw);
          return _depositAllowance(account, childAddress, raw);
        },
        onSuccess
      ),
    [account, run]
  );

  /**
   * Set (replace) allowance — also handles token approval.
   */
  const setAllowance = useCallback(
    (childAddress, amountHuman, onSuccess) =>
      run(
        "setAllowance",
        "Set allowance",
        async () => {
          const raw = toRaw(amountHuman);
          await ensureTokenApproval(account, raw);
          return _setAllowance(account, childAddress, raw);
        },
        onSuccess
      ),
    [account, run]
  );

  /** Set the child's daily spending limit. */
  const setDailyLimit = useCallback(
    (childAddress, amountHuman, onSuccess) =>
      run(
        "setDailyLimit",
        "Set daily limit",
        () => _setDailyLimit(account, childAddress, toRaw(amountHuman)),
        onSuccess
      ),
    [account, run]
  );

  /** Add a recipient address to the child's whitelist. */
  const addApprovedRecipient = useCallback(
    (childAddress, recipientAddress, onSuccess) =>
      run(
        "addRecipient",
        "Add approved recipient",
        () => _addApprovedRecipient(account, childAddress, recipientAddress),
        onSuccess
      ),
    [account, run]
  );

  /** Remove a recipient address from the child's whitelist. */
  const removeApprovedRecipient = useCallback(
    (childAddress, recipientAddress, onSuccess) =>
      run(
        "removeRecipient",
        "Remove approved recipient",
        () => _removeApprovedRecipient(account, childAddress, recipientAddress),
        onSuccess
      ),
    [account, run]
  );

  /**
   * Child makes a direct payment to an approved recipient.
   * `amountHuman` is the human-readable dollar amount.
   */
  const makePayment = useCallback(
    (recipientAddress, amountHuman, onSuccess) =>
      run(
        "makePayment",
        "Send payment",
        () => _makePayment(account, recipientAddress, toRaw(amountHuman)),
        onSuccess
      ),
    [account, run]
  );

  /**
   * Child submits a spending request for parent approval.
   */
  const requestPayment = useCallback(
    (recipientAddress, amountHuman, memo, onSuccess) =>
      run(
        "requestPayment",
        "Submit request",
        () => _requestPayment(account, recipientAddress, toRaw(amountHuman), memo),
        onSuccess
      ),
    [account, run]
  );

  /** Parent approves a pending spending request. */
  const approveRequest = useCallback(
    (requestId, onSuccess) =>
      run(
        `approve_${requestId}`,
        "Approve request",
        () => _approveRequest(account, requestId),
        onSuccess
      ),
    [account, run]
  );

  /** Parent rejects a pending spending request. */
  const rejectRequest = useCallback(
    (requestId, onSuccess) =>
      run(
        `reject_${requestId}`,
        "Reject request",
        () => _rejectRequest(account, requestId),
        onSuccess
      ),
    [account, run]
  );

  /** Mint test tokens from the MockUSDC faucet (up to 10,000 mUSDC). */
  const mintTestTokens = useCallback(
    (amountHuman = 1000, onSuccess) =>
      run(
        "mintTokens",
        "Mint test tokens",
        () => _mintTestTokens(account, toRaw(amountHuman)),
        onSuccess
      ),
    [account, run]
  );

  return {
    // loading flags — keyed by action name
    loading,
    // last successful tx hash
    txHash,
    // actions
    registerChild,
    depositAllowance,
    setAllowance,
    setDailyLimit,
    addApprovedRecipient,
    removeApprovedRecipient,
    makePayment,
    requestPayment,
    approveRequest,
    rejectRequest,
    mintTestTokens,
  };
}
