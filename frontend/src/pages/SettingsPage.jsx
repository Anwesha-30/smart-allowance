import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Wallet, Shield, Copy, CheckCircle2,
  Gauge, ShieldCheck, Wifi, WifiOff, Info,
  ExternalLink, AlertTriangle, Zap, Baby,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import WalletConnect from "@/components/WalletConnect";
import WhitelistManager from "@/components/WhitelistManager";
import LoadingSpinner from "@/components/LoadingSpinner";

import { useWallet } from "@/hooks/useWallet";
import { useKidSafe } from "@/hooks/useKidSafe";
import { useAllowance } from "@/hooks/useAllowance";
import { shortenAddress, isValidAddress } from "@/utils/formatAddress";
import { formatToken } from "@/utils/formatCurrency";
import {
  KIDSAFE_ADDRESS, TOKEN_ADDRESS,
  SUPPORTED_CHAIN_ID, TOKEN_SYMBOL, IS_DEMO_MODE,
} from "@/utils/constants";
import { MOCK_CHILD_ADDRESS } from "@/services/mockData";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { account, chainId, isCorrectChain, isDemoMode, disconnect, switchChain } = useWallet();
  const { setDailyLimit, mintTestTokens, loading: txLoading } = useKidSafe();

  const childAddress = isDemoMode ? MOCK_CHILD_ADDRESS : account;
  const { childDetails, approvedRecipients, loading: dataLoading, refetch } = useAllowance(childAddress);

  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [copied,        setCopied]        = useState("");
  const [limitInput,    setLimitInput]    = useState("");
  const [limitDone,     setLimitDone]     = useState(false);
  const [faucetAmt,     setFaucetAmt]     = useState("1000");
  const [faucetDone,    setFaucetDone]    = useState(false);
  const [childInput,    setChildInput]    = useState("");

  function copy(key, value) {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  }

  async function handleSetLimit(e) {
    e.preventDefault();
    await setDailyLimit(childAddress, parseFloat(limitInput), () => {
      setLimitDone(true);
      setLimitInput("");
      refetch();
      setTimeout(() => setLimitDone(false), 3000);
    });
  }

  async function handleFaucet(e) {
    e.preventDefault();
    await mintTestTokens(parseFloat(faucetAmt), () => {
      setFaucetDone(true);
      setTimeout(() => setFaucetDone(false), 3000);
    });
  }

  const networkStatus = isCorrectChain ? "connected" : account ? "wrong-network" : "disconnected";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setSidebarOpen((o) => !o)} sidebarOpen={sidebarOpen} />

      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} mode="parent" />

        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate("/parent")} className="btn-ghost p-2" aria-label="Back">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Security & Settings</h1>
              <p className="text-sm text-gray-400 mt-0.5">Wallets, limits, whitelist, and contract status.</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">

            {/* ════════════════════ LEFT COLUMN ═════════════════ */}
            <div className="space-y-6">

              {/* ── Network status ─────────────────────────────── */}
              <div className="card">
                <div className="flex items-center gap-2 mb-5">
                  {networkStatus === "connected"
                    ? <Wifi size={18} className="text-emerald-500" />
                    : <WifiOff size={18} className="text-red-500" />}
                  <h2 className="section-title">Network Status</h2>
                  <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
                    networkStatus === "connected"    ? "bg-emerald-100 text-emerald-700" :
                    networkStatus === "wrong-network"? "bg-amber-100 text-amber-700"    :
                                                       "bg-gray-100 text-gray-500"
                  }`}>
                    {networkStatus === "connected"     ? "● Connected"     :
                     networkStatus === "wrong-network" ? "● Wrong Network" :
                                                         "● Disconnected"}
                  </span>
                </div>

                <dl className="space-y-3">
                  {[
                    { label: "Chain ID",        value: chainId ? String(chainId) : "—",              copy: false },
                    { label: "Expected Chain",  value: String(SUPPORTED_CHAIN_ID) + " (Hardhat Local)", copy: false },
                    { label: "KidSafe Contract",value: KIDSAFE_ADDRESS || "Not configured",  copy: "kidsafe" },
                    { label: "Token Contract",  value: TOKEN_ADDRESS   || "Not configured",  copy: "token"   },
                    { label: "Token Symbol",    value: TOKEN_SYMBOL,                         copy: false     },
                    { label: "Demo Mode",       value: IS_DEMO_MODE ? "Active" : "Off",      copy: false     },
                  ].map(({ label, value, copy: copyKey }) => (
                    <div key={label} className="flex items-center justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                      <dt className="text-sm text-gray-500 flex-shrink-0">{label}</dt>
                      <dd className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm font-medium text-gray-800 truncate ${value.startsWith("0x") ? "font-mono text-xs" : ""}`} title={value}>
                          {value.startsWith("0x") && value.length > 20 ? shortenAddress(value, 8) : value}
                        </span>
                        {copyKey && value && !["Not configured"].includes(value) && (
                          <button onClick={() => copy(copyKey, value)} className="text-gray-300 hover:text-brand transition-colors flex-shrink-0" aria-label={`Copy ${label}`}>
                            {copied === copyKey ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>

                {networkStatus === "wrong-network" && (
                  <button onClick={switchChain} className="btn-secondary w-full mt-4">
                    <Wifi size={15} /> Switch to Hardhat Local
                  </button>
                )}
              </div>

              {/* ── Parent wallet address ───────────────────────── */}
              <div className="card">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Wallet size={17} className="text-brand-light" />
                  </div>
                  <h2 className="section-title">Parent Wallet</h2>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700">{account ? "Connected" : "Not connected"}</p>
                    {account && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="font-mono text-xs text-gray-400 truncate">{account}</p>
                        <button onClick={() => copy("parent", account)} className="text-gray-300 hover:text-brand transition-colors flex-shrink-0" aria-label="Copy parent address">
                          {copied === "parent" ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                      </div>
                    )}
                  </div>
                  <WalletConnect variant="secondary" />
                </div>

                {account && (
                  <button onClick={disconnect} className="btn-ghost text-red-500 hover:text-red-600 hover:bg-red-50 text-sm w-full justify-start">
                    Disconnect wallet session
                  </button>
                )}
              </div>

              {/* ── Child wallet address ─────────────────────────── */}
              <div className="card">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
                    <Baby size={17} className="text-cyan-600" />
                  </div>
                  <h2 className="section-title">Child Wallet</h2>
                </div>

                {childAddress ? (
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="font-mono text-xs text-gray-700 flex-1 truncate" title={childAddress}>
                      {childAddress}
                    </span>
                    <button onClick={() => copy("child", childAddress)} className="text-gray-300 hover:text-brand transition-colors flex-shrink-0" aria-label="Copy child address">
                      {copied === "child" ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No child registered yet.</p>
                )}

                {/* Child stats */}
                {childDetails && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-400 font-medium">Balance</p>
                      <p className="text-sm font-bold text-gray-800 tabular-nums">{formatToken(childDetails.allowanceBalance)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-400 font-medium">Spent Today</p>
                      <p className="text-sm font-bold text-gray-800 tabular-nums">{formatToken(childDetails.dailySpent)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Contract connection status ──────────────────── */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={17} className="text-brand-light" />
                  <h2 className="section-title">Contract Connection</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "KidSafe contract", ok: !!KIDSAFE_ADDRESS, detail: KIDSAFE_ADDRESS ? shortenAddress(KIDSAFE_ADDRESS, 8) : "Not set — add to .env" },
                    { label: "Token contract",    ok: !!TOKEN_ADDRESS,   detail: TOKEN_ADDRESS   ? shortenAddress(TOKEN_ADDRESS,   8) : "Not set — add to .env" },
                    { label: "Correct network",   ok: isCorrectChain,    detail: isCorrectChain  ? `Chain ${SUPPORTED_CHAIN_ID}` : "Switch network in MetaMask" },
                    { label: "Wallet connected",  ok: !!account,         detail: account ? "Ready" : "Connect wallet to interact" },
                  ].map(({ label, ok, detail }) => (
                    <div key={label} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        {ok
                          ? <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                          : <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />}
                        <span className="text-sm text-gray-700">{label}</span>
                      </div>
                      <span className={`text-xs font-medium ${ok ? "text-emerald-600" : "text-amber-600"}`}>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ════════════════════ RIGHT COLUMN ════════════════ */}
            <div className="space-y-6">

              {/* ── Daily spending limit config ─────────────────── */}
              <div className="card">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
                    <Gauge size={17} className="text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="section-title">Daily Spending Limit</h2>
                    <p className="text-xs text-gray-400">Max child can spend per calendar day.</p>
                  </div>
                </div>

                {childDetails && (
                  <div className="bg-cyan-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                    <span className="text-sm text-cyan-700 font-medium">Current limit</span>
                    <span className="text-sm font-bold text-cyan-800 tabular-nums">
                      {childDetails.dailyLimit > 0n ? formatToken(childDetails.dailyLimit) : "No limit"}
                    </span>
                  </div>
                )}

                <form onSubmit={handleSetLimit} className="space-y-4">
                  <div>
                    <label htmlFor="limit-input" className="input-label">New daily limit (mUSDC)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                      <input
                        id="limit-input" type="number" min="0" step="0.01"
                        value={limitInput} onChange={(e) => setLimitInput(e.target.value)}
                        placeholder="0.00" className="input pl-8 tabular-nums"
                        disabled={txLoading.setDailyLimit}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Enter 0 to remove the daily limit.</p>
                  </div>

                  {limitDone && (
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm font-medium" role="alert">
                      <CheckCircle2 size={15} /> Daily limit updated!
                    </div>
                  )}

                  <button type="submit" className="btn-primary w-full" disabled={!limitInput || txLoading.setDailyLimit}>
                    {txLoading.setDailyLimit ? <LoadingSpinner size="sm" /> : <Gauge size={15} />}
                    Update Daily Limit
                  </button>
                </form>
              </div>

              {/* ── Approved recipient management ───────────────── */}
              <WhitelistManager
                childAddress={childAddress || ""}
                approvedRecipients={approvedRecipients}
                loading={dataLoading}
                onUpdate={refetch}
              />

              {/* ── Token faucet ─────────────────────────────────── */}
              <div className="card border-dashed border-2 border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={17} className="text-purple-500" />
                  <h2 className="section-title">Test Token Faucet</h2>
                  <span className="ml-auto badge-info text-xs">Testnet only</span>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Mint MockUSDC to your wallet for testing. Max 10,000 per call.
                </p>
                <form onSubmit={handleFaucet} className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                    <input
                      type="number" min="1" max="10000"
                      value={faucetAmt} onChange={(e) => setFaucetAmt(e.target.value)}
                      className="input pl-8 tabular-nums" aria-label="Faucet amount"
                    />
                  </div>
                  <button type="submit" className="btn-secondary flex-shrink-0" disabled={txLoading.mintTokens}>
                    {txLoading.mintTokens ? <LoadingSpinner size="sm" /> : <Zap size={15} />} Mint
                  </button>
                </form>
                {faucetDone && (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm font-medium mt-3" role="alert">
                    <CheckCircle2 size={15} /> Tokens minted to your wallet!
                  </div>
                )}
              </div>

              {/* ── About ────────────────────────────────────────── */}
              <div className="card bg-navy-50 border-navy-100">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck size={16} className="text-brand" />
                  <h2 className="font-semibold text-brand text-sm">About KidSafe</h2>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  Spending rules are enforced by the KidSafe Solidity contract — not just the frontend.
                  Limits, whitelist, and approval flow all live on-chain.
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Contract enforcement applies only to funds routed through KidSafe.
                  Direct wallet-to-wallet transfers are not restricted.
                </p>
                <a
                  href="https://hardhat.org/hardhat-runner/docs/getting-started"
                  target="_blank" rel="noopener noreferrer"
                  className="btn-ghost text-sm"
                >
                  Hardhat Docs <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
