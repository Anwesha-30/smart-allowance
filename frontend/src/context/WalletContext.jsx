/**
 * WalletContext.jsx
 * -----------------
 * Global wallet + role state.
 *
 * role: "parent" | "child" | null
 *   - set when the user picks a role on the landing page
 *   - persisted to localStorage so it survives page refresh
 *   - cleared on logout
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  connectWallet,
  getConnectedAccounts,
  getCurrentChainId,
  isMetaMaskInstalled,
  switchToSupportedChain,
  parseContractError,
} from "@/services/wallet";

import {
  IS_DEMO_MODE,
  SUPPORTED_CHAIN_ID,
} from "@/utils/constants";

const ROLE_KEY = "kidsafe_role";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [role, setRoleState] = useState(
    () => localStorage.getItem(ROLE_KEY) ?? null
  );

  const isCorrectChain = chainId === SUPPORTED_CHAIN_ID;

  const isDemoMode = IS_DEMO_MODE || !account;

  // ─────────────────────────────────────────────────────────
  // Persist role
  // ─────────────────────────────────────────────────────────

  const setRole = useCallback((newRole) => {
    setRoleState(newRole);

    if (newRole) {
      localStorage.setItem(ROLE_KEY, newRole);
    } else {
      localStorage.removeItem(ROLE_KEY);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // Restore wallet session on page load
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function restore() {
      if (!isMetaMaskInstalled()) return;

      try {
        const accounts = await getConnectedAccounts();
        const cid = await getCurrentChainId();

        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setChainId(cid);
        }
      } catch (err) {
        console.error("Failed to restore wallet:", err);
      }
    }

    restore();
  }, []);

  // ─────────────────────────────────────────────────────────
  // MetaMask event listeners
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const onAccounts = (accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
        toast("Wallet disconnected.", {
          icon: "👋",
        });
      } else {
        setAccount(accounts[0].toLowerCase());
      }
    };

    const onChain = (hex) => {
      const cid = parseInt(hex, 16);

      setChainId(cid);

      if (cid !== SUPPORTED_CHAIN_ID) {
        toast.error("Wrong network. Switch to Hardhat Local.");
      }
    };

    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // Connect MetaMask
  // ─────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      toast.error("MetaMask not installed. Please install MetaMask.");
      return false;
    }

    setIsConnecting(true);

    try {
      // First make sure MetaMask is on Hardhat Local
      await switchToSupportedChain(SUPPORTED_CHAIN_ID);

      // Then request account access
      const addr = await connectWallet();

      // Read the current chain after connection
      const cid = await getCurrentChainId();

      setAccount(addr);
      setChainId(cid);

      if (cid !== SUPPORTED_CHAIN_ID) {
        toast.error("Please switch to Hardhat Local.");
        return false;
      }

      toast.success("Wallet connected!");

      return true;
    } catch (err) {
      console.error("Wallet connection failed:", err);

      toast.error(parseContractError(err));

      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // Disconnect wallet
  // ─────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setRole(null);

    toast("Signed out.", {
      icon: "🔒",
    });
  }, [setRole]);

  // ─────────────────────────────────────────────────────────
  // Manually switch network
  // ─────────────────────────────────────────────────────────

  const switchChain = useCallback(async () => {
    try {
      await switchToSupportedChain(SUPPORTED_CHAIN_ID);

      const cid = await getCurrentChainId();

      setChainId(cid);

      toast.success("Switched to Hardhat Local.");
    } catch (err) {
      console.error("Network switch failed:", err);

      toast.error(parseContractError(err));
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // Context value
  // ─────────────────────────────────────────────────────────

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        isConnecting,
        isCorrectChain,
        isDemoMode,

        role,
        setRole,

        connect,
        disconnect,
        switchChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

export function useWalletContext() {
  const ctx = useContext(WalletContext);

  if (!ctx) {
    throw new Error(
      "useWalletContext must be inside <WalletProvider>"
    );
  }

  return ctx;
}