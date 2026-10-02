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
  createContext, useCallback, useContext, useEffect, useState,
} from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  connectWallet, getConnectedAccounts, getCurrentChainId,
  isMetaMaskInstalled, switchToSupportedChain, parseContractError,
} from "@/services/wallet";
import { IS_DEMO_MODE, SUPPORTED_CHAIN_ID } from "@/utils/constants";

const ROLE_KEY = "kidsafe_role";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account,      setAccount]      = useState(null);
  const [chainId,      setChainId]      = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [role,         setRoleState]    = useState(() => localStorage.getItem(ROLE_KEY) ?? null);

  const isCorrectChain = chainId === SUPPORTED_CHAIN_ID;
  const isDemoMode     = IS_DEMO_MODE || !account;

  // Persist role
  const setRole = useCallback((r) => {
    setRoleState(r);
    if (r) localStorage.setItem(ROLE_KEY, r);
    else   localStorage.removeItem(ROLE_KEY);
  }, []);

  // Restore wallet session on mount
  useEffect(() => {
    async function restore() {
      if (!isMetaMaskInstalled()) return;
      const accounts = await getConnectedAccounts();
      const cid      = await getCurrentChainId();
      if (accounts.length > 0) { setAccount(accounts[0]); setChainId(cid); }
    }
    restore();
  }, []);

  // MetaMask event listeners
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;
    const onAccounts = (accs) => {
      if (accs.length === 0) { setAccount(null); toast("Wallet disconnected.", { icon: "👋" }); }
      else setAccount(accs[0].toLowerCase());
    };
    const onChain = (hex) => {
      const cid = parseInt(hex, 16);
      setChainId(cid);
      if (cid !== SUPPORTED_CHAIN_ID) toast.error("Wrong network. Switch to Hardhat Local.");
    };
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      toast.error("MetaMask not installed. Visit metamask.io.");
      return false;
    }
    setIsConnecting(true);
    try {
      const addr = await connectWallet();
      const cid  = await getCurrentChainId();
      setAccount(addr);
      setChainId(cid);
      if (cid !== SUPPORTED_CHAIN_ID) toast.error("Connected — wrong network. Switch to Hardhat Local.");
      else toast.success("Wallet connected!");
      return true;
    } catch (err) {
      toast.error(parseContractError(err));
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setRole(null);
    toast("Signed out.", { icon: "🔒" });
  }, [setRole]);

  const switchChain = useCallback(async () => {
    try {
      await switchToSupportedChain(SUPPORTED_CHAIN_ID);
      setChainId(await getCurrentChainId());
      toast.success("Switched to Hardhat Local.");
    } catch (err) {
      toast.error(parseContractError(err));
    }
  }, []);

  return (
    <WalletContext.Provider value={{
      account, chainId, isConnecting, isCorrectChain, isDemoMode,
      role, setRole,
      connect, disconnect, switchChain,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletContext must be inside <WalletProvider>");
  return ctx;
}
