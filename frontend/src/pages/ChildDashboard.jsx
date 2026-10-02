import React, { useState } from "react";
import {
  Wallet, TrendingUp, Gauge, CalendarClock,
  Send, Clock, AlertTriangle, RefreshCw,
  CheckCircle2, XCircle, Info, PiggyBank,
  Coins, ArrowLeftRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import SpendingLimitCard from "@/components/SpendingLimitCard";
import AllowanceCard from "@/components/AllowanceCard";
import TransactionTable from "@/components/TransactionTable";
import RequestModal from "@/components/RequestModal";
import { RequestStatusBadge } from "@/components/TransactionStatus";
import LoadingSpinner from "@/components/LoadingSpinner";

import { useWallet } from "@/hooks/useWallet";
import { useAllowance } from "@/hooks/useAllowance";
import { formatToken, formatDate, toHuman } from "@/utils/formatCurrency";
import { shortenAddress } from "@/utils/formatAddress";
import { MOCK_CHILD_ADDRESS } from "@/services/mockData";
import { RequestStatus } from "@/utils/constants";

/* ── Friendly messages for each rejection reason ──────── */
const REJECTION_UI = {
  DailyLimitExceeded:    { Icon: Gauge,   bg: "bg-orange-50 border-orange-200", txt: "text-orange-700", title: "Daily limit reached",   body: "You've hit today's cap. It resets at midnight UTC — try again tomorrow!" },
  RecipientNotApproved:  { Icon: XCircle, bg: "bg-red-50 border-red-200",       txt: "text-red-700",    title: "Store not approved",     body: "Your parent hasn't approved this recipient yet. Ask them to add it." },
  InsufficientAllowance: { Icon: Wallet,  bg: "bg-blue-50 border-blue-200",     txt: "text-blue-700",   title: "Not enough balance",     body: "Your allowance is too low. Ask your parent to top it up." },
  Rejected:              { Icon: XCircle, bg: "bg-gray-50 border-gray-200",     txt: "text-gray-600",   title: "Request was declined",   body: "Your parent declined this request. Try a smaller amount or ask them why." },
};

export default function ChildDashboard() {
  const { account, isDemoMode } = useWallet();
  const childAddress = account ?? (isDemoMode ? MOCK_CHILD_ADDRESS : null);

  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [modalOpen,      setModalOpen]      = useState(false);
  const [modalMode,      setModalMode]      = useState("direct");
  const [rejectionKey,   setRejectionKey]   = useState(null);

  const {
    childDetails, approvedRecipients,
    requests, transactions,
    loading, demoMode, refetch,
  } = useAllowance(childAddress);

  const balance    = childDetails?.allowanceBalance ?? 0n;
  const dailyLimit = childDetails?.dailyLimit       ?? 0n;
  const dailySpent = childDetails?.dailySpent       ?? 0n;
  const dailyRem   = dailyLimit > dailySpent ? dailyLimit - dailySpent : 0n;
  const limitPct   = dailyLimit > 0n ? Math.min(100, Math.round(Number(dailySpent) / Number(dailyLimit) * 100)) : 0;
  const isAtLimit  = dailyLimit > 0n && dailySpent >= dailyLimit;

  const nextRenewal = new Date();
  nextRenewal.setDate(nextRenewal.getDate() + 30);

  const chartData = buildTrend(transactions);

  const recentRejected = requests.filter((r) => r.status === RequestStatus.Rejected).slice(0, 1);

  function openModal(mode) {
    setRejectionKey(null);
    setModalMode(mode);
    setModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setSidebarOpen((o) => !o)} sidebarOpen={sidebarOpen} />

      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} mode="child" />

        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">

          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Allowance</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {demoMode ? "Demo — sample data." : `Wallet: ${shortenAddress(childAddress)}`}
              </p>
            </div>
            <button onClick={refetch} className="btn-ghost self-start" disabled={loading} aria-label="Refresh">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {/* Demo banner */}
          {demoMode && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-5 text-sm text-amber-800">
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-500" />
              <p>Demo Mode — no real transactions are made.</p>
            </div>
          )}

          {/* Daily limit hit banner */}
          {isAtLimit && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-5 text-sm text-red-700 font-medium">
              <Gauge size={16} className="flex-shrink-0" />
              You've reached your daily spending limit. It resets at midnight UTC.
            </div>
          )}

          {/* Rejection message */}
          {recentRejected.length > 0 && (() => {
            const cfg = REJECTION_UI["Rejected"];
            return (
              <div className={`flex items-start gap-3 border rounded-2xl px-5 py-4 mb-5 text-sm ${cfg.bg} ${cfg.txt}`}>
                <cfg.Icon size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{cfg.title}</p>
                  <p className="mt-0.5 opacity-80">{cfg.body}</p>
                </div>
              </div>
            );
          })()}

          {/* ══════════════ ACTION BUTTONS ══════════════ */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => openModal("direct")} disabled={isAtLimit}
              className="flex flex-col items-center gap-2 bg-brand hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-2xl px-4 py-5 transition-all"
              aria-label="Make a payment"
            >
              <Send size={22} />
              <span className="text-sm">Make Payment</span>
              <span className="text-xs font-normal opacity-70">Send to approved store</span>
            </button>
            <button
              onClick={() => openModal("request")}
              className="flex flex-col items-center gap-2 bg-white border-2 border-brand/20 hover:border-brand/50 text-brand font-semibold rounded-2xl px-4 py-5 transition-all"
              aria-label="Request money"
            >
              <Clock size={22} />
              <span className="text-sm">Request Money</span>
              <span className="text-xs font-normal text-gray-400">Parent approves first</span>
            </button>
          </div>

          {/* ══════════════ STAT CARDS ══════════════ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="My Allowance"
              value={formatToken(balance)}
              subtitle="Total from parent"
              icon={<PiggyBank size={20} />}
              iconBg="bg-blue-50" iconColor="text-brand-light"
              loading={loading}
            />
            <StatCard
              title="Available Balance"
              value={formatToken(balance)}
              subtitle="Ready to spend"
              icon={<Wallet size={20} />}
              iconBg="bg-emerald-50" iconColor="text-emerald-600"
              loading={loading}
            />
            <StatCard
              title="Spent Today"
              value={formatToken(dailySpent)}
              subtitle={`of ${formatToken(dailyLimit)} limit`}
              icon={<TrendingUp size={20} />}
              iconBg={isAtLimit ? "bg-red-50" : "bg-amber-50"}
              iconColor={isAtLimit ? "text-red-500" : "text-amber-500"}
              loading={loading}
            />
            <StatCard
              title="Next Renewal"
              value={formatDate(nextRenewal.getTime() / 1000)}
              subtitle="Estimated date"
              icon={<CalendarClock size={20} />}
              iconBg="bg-purple-50" iconColor="text-purple-600"
              loading={loading}
            />
          </div>

          {/* ══════════════ DAILY LIMIT PROGRESS BAR ══════════════ */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gauge size={16} className={isAtLimit ? "text-red-500" : "text-cyan-600"} />
                <h3 className="section-title">Daily Limit Progress</h3>
              </div>
              <span className={`text-sm font-bold tabular-nums ${isAtLimit ? "text-red-600" : "text-gray-700"}`}>
                {formatToken(dailySpent)} / {formatToken(dailyLimit)}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden mb-2">
              <div
                className={`h-4 rounded-full transition-all duration-500 ${limitPct >= 100 ? "bg-red-500" : limitPct >= 80 ? "bg-amber-400" : "bg-cyan-500"}`}
                style={{ width: `${limitPct}%` }}
                role="progressbar" aria-valuenow={limitPct} aria-valuemin={0} aria-valuemax={100}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{limitPct}% used</span>
              {isAtLimit
                ? <span className="text-red-500 font-semibold">Limit reached — resets midnight UTC</span>
                : <span className="text-emerald-600 font-semibold">{formatToken(dailyRem)} remaining today</span>}
            </div>
          </div>

          {/* ══════════════ MAIN GRID ══════════════ */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Left */}
            <div className="lg:col-span-2 space-y-6">

              {/* Spending chart */}
              <div className="card">
                <h3 className="section-title mb-4">Recent Spending</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v) => [`$${v}`, "Spent"]} contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
                    <Area type="monotone" dataKey="amount" stroke="#06b6d4" strokeWidth={2} fill="url(#cg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Allowance + limit cards */}
              <div className="grid sm:grid-cols-2 gap-6">
                <AllowanceCard balance={balance} total={balance + dailySpent} loading={loading} />
                <SpendingLimitCard dailyLimit={dailyLimit} dailySpent={dailySpent} loading={loading} />
              </div>

              {/* Recent spending table */}
              <TransactionTable
                transactions={transactions}
                loading={loading}
                demoMode={demoMode}
                title="My Spending History"
              />
            </div>

            {/* Right */}
            <div className="space-y-6">

              {/* My requests */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={16} className="text-brand-light" />
                  <h3 className="section-title">My Requests</h3>
                </div>
                {loading ? (
                  <div className="flex justify-center py-6"><LoadingSpinner size="md" /></div>
                ) : requests.length === 0 ? (
                  <div className="empty-state py-8">
                    <Clock size={28} className="text-gray-200 mb-2" />
                    <p className="text-gray-400 text-sm font-medium">No requests yet</p>
                    <p className="text-gray-300 text-xs mt-1">Tap "Request Money" above.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {requests.slice(0, 6).map((req) => (
                      <li key={String(req.id)} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 tabular-nums">{formatToken(req.amount)}</p>
                          {req.memo && <p className="text-xs text-gray-500 truncate">{req.memo}</p>}
                        </div>
                        <RequestStatusBadge status={req.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Approved stores */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <h3 className="section-title">Approved Stores</h3>
                  <span className="ml-auto text-xs text-gray-400">{approvedRecipients.length} stores</span>
                </div>
                {loading ? (
                  <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
                ) : approvedRecipients.length === 0 ? (
                  <div className="bg-blue-50 rounded-xl px-4 py-4 text-center">
                    <Info size={18} className="text-blue-400 mx-auto mb-1" />
                    <p className="text-xs text-blue-600 font-medium">No approved stores yet</p>
                    <p className="text-xs text-blue-400 mt-0.5">Ask your parent to add some.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {approvedRecipients.map((addr) => (
                      <li key={addr} className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                        <span className="font-mono text-xs text-gray-700 truncate" title={addr}>{shortenAddress(addr, 10)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Tips */}
              <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
                <h3 className="font-semibold text-brand mb-3 text-sm">💡 How it works</h3>
                <ul className="space-y-2 text-xs text-gray-600">
                  <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />You can only pay stores your parent approved.</li>
                  <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />Daily limit resets every midnight (UTC).</li>
                  <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />Use "Request Money" for amounts over the limit — parent approves first.</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>

      <RequestModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        approvedRecipients={approvedRecipients}
        allowanceBalance={balance}
        dailyLimit={dailyLimit}
        dailySpent={dailySpent}
        onSuccess={refetch}
      />
    </div>
  );
}

function buildTrend(transactions) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const totals = {};
  const now = Date.now();
  transactions.forEach((tx) => {
    if (tx.status !== "success") return;
    const ms = Number(tx.timestamp) * 1000;
    if (now - ms > 7 * 86_400_000) return;
    const day = days[new Date(ms).getDay()];
    totals[day] = (totals[day] ?? 0) + toHuman(tx.amount);
  });
  return days.map((day) => ({ day, amount: Number((totals[day] ?? 0).toFixed(2)) }));
}
