/**
 * useAllowance.js
 * ---------------
 * Fetches and caches all allowance-related state for a given child address.
 *
 * Returns:
 *   childDetails      — { parent, allowanceBalance, dailyLimit, dailySpent, registered }
 *   approvedRecipients — address[]
 *   requests           — SpendingRequest[] (all, sorted newest first)
 *   transactions       — PaymentMade event objects
 *   tokenBalance       — child's raw MockUSDC balance
 *   parentTokenBalance — parent's raw MockUSDC balance
 *   loading            — true while initial fetch is running
 *   error              — error message string or null
 *   refetch()          — manually re-fetch everything
 *
 * Demo mode: returns mock data from mockData.js with a demoMode=true flag.
 *
 * Polling: re-fetches every POLL_INTERVAL_MS while the component is mounted.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useWallet } from "./useWallet";
import {
  fetchChildDetails,
  fetchApprovedRecipients,
  fetchAllChildRequests,
  fetchPaymentEvents,
  fetchTokenBalance,
} from "@/services/contract";
import {
  MOCK_CHILD_DETAILS,
  MOCK_APPROVED_RECIPIENTS,
  MOCK_REQUESTS,
  MOCK_TRANSACTIONS,
  MOCK_CHILD_TOKEN_BALANCE,
  MOCK_PARENT_TOKEN_BALANCE,
} from "@/services/mockData";
import { POLL_INTERVAL_MS } from "@/utils/constants";

// ─── empty state ──────────────────────────────────────────────────────────────
const EMPTY = {
  childDetails:       null,
  approvedRecipients: [],
  requests:           [],
  transactions:       [],
  tokenBalance:       0n,
  parentTokenBalance: 0n,
};

export function useAllowance(childAddress) {
  const { account, isDemoMode } = useWallet();

  const [data,    setData]    = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Keep a ref so the polling interval can check if it should still run
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── fetch ────────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    // ── Demo mode ──────────────────────────────────────────────────────────────
    if (isDemoMode || !childAddress) {
      setData({
        childDetails:       MOCK_CHILD_DETAILS,
        approvedRecipients: MOCK_APPROVED_RECIPIENTS.map((r) => r.address),
        requests:           MOCK_REQUESTS,
        transactions:       MOCK_TRANSACTIONS,
        tokenBalance:       MOCK_CHILD_TOKEN_BALANCE,
        parentTokenBalance: MOCK_PARENT_TOKEN_BALANCE,
        demoMode:           true,
      });
      setLoading(false);
      setError(null);
      return;
    }

    // ── Live mode ──────────────────────────────────────────────────────────────
    try {
      const [
        childDetails,
        approvedRecipients,
        requests,
        transactions,
        tokenBalance,
        parentTokenBalance,
      ] = await Promise.all([
        fetchChildDetails(childAddress),
        fetchApprovedRecipients(childAddress),
        fetchAllChildRequests(childAddress),
        fetchPaymentEvents(childAddress),
        fetchTokenBalance(childAddress),
        account ? fetchTokenBalance(account) : Promise.resolve(0n),
      ]);

      if (!mountedRef.current) return;

      setData({
        childDetails,
        approvedRecipients,
        requests,
        transactions,
        tokenBalance,
        parentTokenBalance,
        demoMode: false,
      });
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error("[useAllowance] fetch error:", err);
      setError(err.message ?? "Failed to load contract data.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [childAddress, account, isDemoMode]);

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetchAll();
  }, [fetchAll]);

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) return; // no need to poll mock data
    const id = setInterval(() => {
      if (mountedRef.current) fetchAll();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchAll, isDemoMode]);

  // ── Derived values ────────────────────────────────────────────────────────
  const pendingRequests = data.requests.filter((r) => r.status === 0);
  const approvedRequests = data.requests.filter((r) => r.status === 1);
  const rejectedRequests = data.requests.filter((r) => r.status === 2);

  return {
    ...data,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    loading,
    error,
    refetch: fetchAll,
  };
}
