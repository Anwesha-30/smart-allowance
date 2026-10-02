import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Coins, Gauge, ArrowLeft, Info,
  CheckCircle2, AlertCircle, Zap,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import AllowanceCard from "@/components/AllowanceCard";
import SpendingLimitCard from "@/components/SpendingLimitCard";
import LoadingSpinner from "@/components/LoadingSpinner";

import { useWallet } from "@/hooks/useWallet";
import { useKidSafe } from "@/hooks/useKidSafe";
import { useAllowance } from "@/hooks/useAllowance";
import { formatToken } from "@/utils/formatCurrency";
import { MOCK_CHILD_ADDRESS } from "@/services/mockData";

export default function AllowancePage() {
  const navigate = useNavigate();
  const { account, isDemoMode } = useWallet();
  const childAddress = isDemoMode ? MOCK_CHILD_ADDRESS : account;

  const { childDetails, loading: dataLoading, refetch } = useAllowance(childAddress);
  const { depositAllowance, setDailyLimit, mintTestTokens, loading: txLoading } = useKidSafe();

  const [sidebarOpen,  setSidebarOpen]  = useState(false);

  // Deposit form
  const [depositAmt,  setDepositAmt]  = useState("");
  const [depositDone, setDepositDone] = useState(false);

  // Daily limit form
  const [limitAmt,    setLimitAmt]    = useState("");
  const [limitDone,   setLimitDone]   = useState(false);

  // Faucet
  const [faucetAmt,   setFaucetAmt]   = useState("1000");
  const [faucetDone,  setFaucetDone]  = useState(false);

  async function handleDeposit(e) {
    e.preventDefault();
    await depositAllowance(childAddress, parseFloat(depositAmt), () => {
      setDepositDone(true);
      setDepositAmt("");
      refetch();
      setTimeout(() => setDepositDone(false), 3000);
    });
  }

  async function handleSetLimit(e) {
    e.preventDefault();
    await setDailyLimit(childAddress, parseFloat(limitAmt), () => {
      setLimitDone(true);
      setLimitAmt("");
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setSidebarOpen((o) => !o)} sidebarOpen={sidebarOpen} />

      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} mode="parent" />

        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate("/parent")} className="btn-ghost p-2" aria-label="Back to dashboard">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Allowance</h1>
              <p className="text-sm text-gray-400 mt-0.5">Configure your child's budget and spending limits.</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left — forms */}
            <div className="lg:col-span-2 space-y-6">

              {/* ── Deposit allowance ─────────────────────────── */}
              <div className="card">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Coins size={18} className="text-brand-light" aria-hidden />
                  </div>
                  <div>
                    <h2 className="section-title">Deposit Allowance</h2>
                    <p className="text-xs text-gray-400">Add mUSDC to your child's balance.</p>
                  </div>
                </div>

                {/* Current balance */}
                {childDetails && (
                  <div className="bg-blue-50 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
                    <span className="text-sm text-blue-700 font-medium">Current balance</span>
                    <span className="text-sm font-bold text-blue-800 tabular-nums">
                      {formatToken(childDetails.allowanceBalance)}
                    </span>
                  </div>
                )}

                <form onSubmit={handleDeposit} className="space-y-4">
                  <div>
                    <label htmlFor="deposit-amt" className="input-label">Amount to deposit (mUSDC)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">$</span>
                      <input
                        id="deposit-amt"
                        type="number"
                        min="1"
                        step="0.01"
                        value={depositAmt}
                        onChange={(e) => setDepositAmt(e.target.value)}
                        placeholder="0.00"
                        className="input pl-8 tabular-nums"
                        required
                        disabled={txLoading.depositAllowance}
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  {depositAmt && parseFloat(depositAmt) > 0 && (
                    <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-1.5">
                      <div className="flex justify-between text-gray-600">
                        <span>Deposit amount</span>
                        <span className="font-semibold tabular-nums">${parseFloat(depositAmt).toFixed(2)} mUSDC</span>
                      </div>
                      <div className="flex justify-between text-gray-400 text-xs">
                        <span>Token approval required?</span>
                        <span>Yes — MetaMask will ask</span>
                      </div>
                    </div>
                  )}

                  {depositDone && (
                    <SuccessBanner message="Allowance deposited successfully!" />
                  )}

                  <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5">
                    <Info size={13} className="mt-0.5 flex-shrink-0 text-brand-light" aria-hidden />
                    MetaMask will ask you to approve token spending before the deposit transaction.
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={!depositAmt || parseFloat(depositAmt) <= 0 || txLoading.depositAllowance}
                  >
                    {txLoading.depositAllowance ? <LoadingSpinner size="sm" /> : <Coins size={15} />}
                    Deposit Allowance
                  </button>
                </form>
              </div>

              {/* ── Daily limit ────────────────────────────────── */}
              <div className="card">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
                    <Gauge size={18} className="text-cyan-600" aria-hidden />
                  </div>
                  <div>
                    <h2 className="section-title">Set Daily Spending Limit</h2>
                    <p className="text-xs text-gray-400">Maximum your child can spend per calendar day.</p>
                  </div>
                </div>

                {childDetails && (
                  <div className="bg-cyan-50 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
                    <span className="text-sm text-cyan-700 font-medium">Current daily limit</span>
                    <span className="text-sm font-bold text-cyan-800 tabular-nums">
                      {childDetails.dailyLimit > 0n
                        ? formatToken(childDetails.dailyLimit)
                        : "No limit set"}
                    </span>
                  </div>
                )}

                <form onSubmit={handleSetLimit} className="space-y-4">
                  <div>
                    <label htmlFor="limit-amt" className="input-label">Daily limit (mUSDC)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">$</span>
                      <input
                        id="limit-amt"
                        type="number"
                        min="1"
                        step="0.01"
                        value={limitAmt}
                        onChange={(e) => setLimitAmt(e.target.value)}
                        placeholder="0.00"
                        className="input pl-8 tabular-nums"
                        required
                        disabled={txLoading.setDailyLimit}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Enter 0 to remove the daily limit.</p>
                  </div>

                  {limitDone && <SuccessBanner message="Daily limit updated!" />}

                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={!limitAmt || txLoading.setDailyLimit}
                  >
                    {txLoading.setDailyLimit ? <LoadingSpinner size="sm" /> : <Gauge size={15} />}
                    Update Daily Limit
                  </button>
                </form>
              </div>

              {/* ── Faucet ─────────────────────────────────────── */}
              <div className="card border-dashed border-2 border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Zap size={18} className="text-purple-500" aria-hidden />
                  </div>
                  <div>
                    <h2 className="section-title">Test Token Faucet</h2>
                    <p className="text-xs text-gray-400">Mint MockUSDC to your wallet for testing.</p>
                  </div>
                  <span className="ml-auto badge-info text-xs">Demo only</span>
                </div>

                <form onSubmit={handleFaucet} className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">$</span>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={faucetAmt}
                      onChange={(e) => setFaucetAmt(e.target.value)}
                      className="input pl-8 tabular-nums"
                      aria-label="Faucet amount"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-secondary flex-shrink-0"
                    disabled={txLoading.mintTokens}
                  >
                    {txLoading.mintTokens ? <LoadingSpinner size="sm" /> : <Zap size={15} />}
                    Mint
                  </button>
                </form>

                {faucetDone && <SuccessBanner message="Test tokens minted to your wallet!" />}
                <p className="text-xs text-gray-400 mt-2">Max 10,000 mUSDC per mint. Local testnet only.</p>
              </div>
            </div>

            {/* Right — current state */}
            <div className="space-y-6">
              <AllowanceCard
                balance={childDetails?.allowanceBalance ?? 0n}
                total={childDetails?.allowanceBalance ?? 0n}
                loading={dataLoading}
              />
              <SpendingLimitCard
                dailyLimit={childDetails?.dailyLimit ?? 0n}
                dailySpent={childDetails?.dailySpent ?? 0n}
                loading={dataLoading}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SuccessBanner({ message }) {
  return (
    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm font-medium" role="alert">
      <CheckCircle2 size={15} aria-hidden />
      {message}
    </div>
  );
}
