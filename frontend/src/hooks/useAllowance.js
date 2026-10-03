/**
 * useAllowance.js
 * ---------------
 * Fetches and caches all allowance-related state for a given child address.
 *
 * Demo mode:
 *   Returns mock data only when the wallet is actually in demo mode.
 *
 * Live mode:
 *   If no child address has been registered yet, returns an empty state.
 *   It does NOT fall back to demo data.
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

// ─────────────────────────────────────────────────────────
// Empty live-mode state
// ─────────────────────────────────────────────────────────

const EMPTY = {
  childDetails: null,
  approvedRecipients: [],
  requests: [],
  transactions: [],
  tokenBalance: 0n,
  parentTokenBalance: 0n,
  demoMode: false,
};

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

export function useAllowance(childAddress) {
  const {
    account,
    isDemoMode,
  } = useWallet();

  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep a ref so polling doesn't update an unmounted component
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // Fetch allowance-related data
  // ─────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {

    // ───────────────────────────────────────────────────────
    // DEMO MODE
    // ───────────────────────────────────────────────────────

    if (isDemoMode) {
      setData({
        childDetails: MOCK_CHILD_DETAILS,

        approvedRecipients:
          MOCK_APPROVED_RECIPIENTS.map(
            (recipient) => recipient.address
          ),

        requests: MOCK_REQUESTS,

        transactions: MOCK_TRANSACTIONS,

        tokenBalance: MOCK_CHILD_TOKEN_BALANCE,

        parentTokenBalance:
          MOCK_PARENT_TOKEN_BALANCE,

        demoMode: true,
      });

      setLoading(false);
      setError(null);

      return;
    }

    // ───────────────────────────────────────────────────────
    // LIVE MODE — no child registered yet
    // ───────────────────────────────────────────────────────

    if (!childAddress) {
      setData({
        ...EMPTY,

        /*
         * Important:
         * This is LIVE mode, not Demo mode.
         *
         * There simply isn't a child address to query yet.
         */
        demoMode: false,
      });

      setLoading(false);
      setError(null);

      return;
    }

    // ───────────────────────────────────────────────────────
    // LIVE MODE — child address exists
    // ───────────────────────────────────────────────────────

    try {
      setLoading(true);

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

        account
          ? fetchTokenBalance(account)
          : Promise.resolve(0n),
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

      console.error(
        "[useAllowance] fetch error:",
        err
      );

      setError(
        err.message ??
        "Failed to load contract data."
      );

    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    childAddress,
    account,
    isDemoMode,
  ]);

  // ─────────────────────────────────────────────────────────
  // Initial fetch / refetch
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);

    fetchAll();
  }, [fetchAll]);

  // ─────────────────────────────────────────────────────────
  // Polling
  // ─────────────────────────────────────────────────────────

  useEffect(() => {

    /*
     * Don't poll demo data.
     */
    if (isDemoMode) return;

    /*
     * Poll live data when a child is registered.
     *
     * If childAddress is empty, there is nothing to query yet.
     */
    if (!childAddress) return;

    const id = setInterval(() => {

      if (mountedRef.current) {
        fetchAll();
      }

    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(id);
    };

  }, [
    fetchAll,
    isDemoMode,
    childAddress,
  ]);

  // ─────────────────────────────────────────────────────────
  // Derived request states
  // ─────────────────────────────────────────────────────────

  const pendingRequests =
    data.requests.filter(
      (request) => request.status === 0
    );

  const approvedRequests =
    data.requests.filter(
      (request) => request.status === 1
    );

  const rejectedRequests =
    data.requests.filter(
      (request) => request.status === 2
    );

  // ─────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────

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