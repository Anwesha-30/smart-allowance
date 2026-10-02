import React from "react";
import { Wallet, AlertTriangle, LogOut, ChevronDown } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { isMetaMaskInstalled } from "@/services/wallet";

export default function WalletConnect({ variant = "primary" }) {
  const { account, shortAddress, isConnecting, isCorrectChain, isDemoMode, connect, disconnect, switchChain } = useWallet();

  // Not connected
  if (!account) {
    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        className={variant === "primary" ? "btn-primary" : "btn-secondary"}
        aria-label="Connect wallet"
      >
        <Wallet size={16} />
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  // Wrong network banner
  if (!isCorrectChain) {
    return (
      <button onClick={switchChain} className="btn-danger" aria-label="Switch network">
        <AlertTriangle size={16} />
        Wrong Network — Switch
      </button>
    );
  }

  // Connected
  return (
    <div className="flex items-center gap-2">
      {isDemoMode && (
        <span className="badge-info text-xs">Demo</span>
      )}
      <div className="flex items-center gap-2 bg-navy-50 border border-navy-200 rounded-xl px-3 py-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
        <span className="text-sm font-mono font-medium text-brand truncate max-w-[120px]">
          {shortAddress}
        </span>
        <button
          onClick={disconnect}
          className="text-gray-400 hover:text-red-500 transition-colors ml-1"
          aria-label="Disconnect wallet"
          title="Disconnect"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}
