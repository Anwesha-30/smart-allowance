import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Coins,
  Wallet,
  TrendingUp,
  Bell,
  Plus,
  RefreshCw,
  UserPlus,
  AlertTriangle,
  Gauge,
  ArrowRight,
  Settings,
  User,
  PauseCircle,
  PlayCircle,
  CalendarDays,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import AllowanceCard from "@/components/AllowanceCard";
import SpendingLimitCard from "@/components/SpendingLimitCard";
import ChildProfileCard from "@/components/ChildProfileCard";
import TransactionTable from "@/components/TransactionTable";
import WhitelistManager from "@/components/WhitelistManager";
import ApprovalModal from "@/components/ApprovalModal";
import LoadingSpinner from "@/components/LoadingSpinner";

import { useWallet } from "@/hooks/useWallet";
import { useKidSafe } from "@/hooks/useKidSafe";
import { useAllowance } from "@/hooks/useAllowance";

import { formatToken, toHuman } from "@/utils/formatCurrency";
import { shortenAddress } from "@/utils/formatAddress";
import {
  MOCK_CHILD_ADDRESS,
  MOCK_WEEKLY_SPENDING,
} from "@/services/mockData";

// ─────────────────────────────────────────────────────────
// Demo spending breakdown
// ─────────────────────────────────────────────────────────

const BREAKDOWN_DEMO = [
  { name: "Entertainment", value: 12, color: "#10b981" },
  { name: "Food", value: 2, color: "#3b82f6" },
  { name: "Income", value: 5, color: "#ec4899" },
  { name: "Other", value: 19, color: "#8b5cf6" },
  { name: "Savings", value: 8, color: "#ef4444" },
  { name: "Utilities", value: 53, color: "#f59e0b" },
];

// ─────────────────────────────────────────────────────────
// Breakdown legend
// ─────────────────────────────────────────────────────────

function BreakdownLegend({ data }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4">
      {data.map((entry) => (
        <span
          key={entry.name}
          className="flex items-center gap-1.5 text-xs text-gray-500"
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />

          <span className="font-semibold text-gray-700">
            {entry.value}%
          </span>

          {entry.name}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Donut tooltip
// ─────────────────────────────────────────────────────────

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const d = payload[0];

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-md text-xs">
      <span
        className="inline-block w-2 h-2 rounded-full mr-1.5"
        style={{ backgroundColor: d.payload.color }}
      />

      <span className="font-semibold text-gray-800">
        {d.name}
      </span>

      <span className="ml-2 text-gray-500">
        {d.value}%
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Parent Dashboard
// ─────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const navigate = useNavigate();

  const { account, isDemoMode } = useWallet();

  const {
    registerChild,
    loading: txLoading,
  } = useKidSafe();

  // ───────────────────────────────────────────────────────
  // Existing state
  // ───────────────────────────────────────────────────────

  const [childAddress, setChildAddress] = useState(
    isDemoMode ? MOCK_CHILD_ADDRESS : ""
  );

  const [showRegisterForm, setShowRegisterForm] =
    useState(false);

  const [newChildInput, setNewChildInput] =
    useState("");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [approvalTarget, setApprovalTarget] =
    useState(null);

  // ───────────────────────────────────────────────────────
  // NEW KidSafe controls
  // ───────────────────────────────────────────────────────

  const [childName, setChildName] =
    useState("Alex");

  const [childActive, setChildActive] =
    useState(true);

  const [monthlyAllowance, setMonthlyAllowance] =
    useState("500");

  const [recipientName, setRecipientName] =
    useState("");

  const [recipientAddress, setRecipientAddress] =
    useState("");

  const [namedRecipients, setNamedRecipients] =
    useState([]);

  // ───────────────────────────────────────────────────────
  // Existing blockchain data
  // ───────────────────────────────────────────────────────

  const {
    childDetails,
    approvedRecipients,
    pendingRequests,
    transactions,
    loading,
    demoMode,
    refetch,
  } = useAllowance(
    childAddress ||
      (isDemoMode ? MOCK_CHILD_ADDRESS : null)
  );

  // ───────────────────────────────────────────────────────
  // Existing calculations
  // ───────────────────────────────────────────────────────

  const chartData = demoMode
    ? MOCK_WEEKLY_SPENDING
    : buildChartData(transactions);

  const breakdownData = demoMode
    ? BREAKDOWN_DEMO
    : buildBreakdown(transactions);

  const totalAllocated =
    childDetails?.allowanceBalance ?? 0n;

  const dailySpent =
    childDetails?.dailySpent ?? 0n;

  // ───────────────────────────────────────────────────────
  // NEW: calculate monthly spending from transactions
  // ───────────────────────────────────────────────────────

  const calculatedMonthlySpent = useMemo(() => {
    if (demoMode) {
      return 0;
    }

    const now = new Date();

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let total = 0;

    transactions.forEach((tx) => {
      if (tx.status !== "success") return;

      const timestamp =
        Number(tx.timestamp) * 1000;

      const date = new Date(timestamp);

      if (
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      ) {
        total += toHuman(tx.amount);
      }
    });

    return Number(total.toFixed(2));
  }, [transactions, demoMode]);

  // ───────────────────────────────────────────────────────
  // NEW: monthly calculations
  // ───────────────────────────────────────────────────────

  const monthlyAllowanceValue =
    Number(monthlyAllowance) || 0;

  const monthlySpent =
    calculatedMonthlySpent;

  const monthlyRemaining = Math.max(
    monthlyAllowanceValue - monthlySpent,
    0
  );

  // ───────────────────────────────────────────────────────
  // NEW: daily calculations
  // ───────────────────────────────────────────────────────

  const dailyLimit =
    Number(
      toHuman(
        childDetails?.dailyLimit ?? 0n
      )
    );

  const dailySpentValue =
    Number(
      toHuman(
        childDetails?.dailySpent ?? 0n
      )
    );

  const dailyRemaining = Math.max(
    dailyLimit - dailySpentValue,
    0
  );

  // ───────────────────────────────────────────────────────
  // Register child
  // ───────────────────────────────────────────────────────

  async function handleRegisterChild(e) {
    e.preventDefault();

    await registerChild(
      newChildInput,
      () => {
        setChildAddress(
          newChildInput.toLowerCase()
        );

        setShowRegisterForm(false);
        setNewChildInput("");
      }
    );
  }

  // ───────────────────────────────────────────────────────
  // Add named recipient
  // ───────────────────────────────────────────────────────

  function handleAddNamedRecipient() {
    const name = recipientName.trim();
    const address = recipientAddress.trim();

    if (!name || !address) return;

    setNamedRecipients((prev) => [
      ...prev,
      {
        name,
        address,
      },
    ]);

    setRecipientName("");
    setRecipientAddress("");
  }

  // ───────────────────────────────────────────────────────
  // Remove named recipient
  // ───────────────────────────────────────────────────────

  function handleRemoveNamedRecipient(index) {
    setNamedRecipients((prev) =>
      prev.filter((_, i) => i !== index)
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ═══════════════════════════════════════════════════
          NAVBAR
      ═══════════════════════════════════════════════════ */}

      <Navbar
        onMenuToggle={() =>
          setSidebarOpen((o) => !o)
        }
        sidebarOpen={sidebarOpen}
      />

      <div className="flex">

        {/* ═════════════════════════════════════════════════
            SIDEBAR
        ═════════════════════════════════════════════════ */}

        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          mode="parent"
        />

        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">

          {/* ═══════════════════════════════════════════════
              PAGE HEADER
          ═══════════════════════════════════════════════ */}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Parent Dashboard
              </h1>

              <p className="text-sm text-gray-400 mt-0.5">
                {demoMode
                  ? "Demo Mode — data is simulated."
                  : "Manage your child's allowance and spending."}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">

              <button
                onClick={refetch}
                className="btn-ghost"
                disabled={loading}
                aria-label="Refresh"
              >
                <RefreshCw
                  size={15}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />

                Refresh
              </button>

              <button
                onClick={() =>
                  navigate("/parent/allowance")
                }
                className="btn-secondary"
              >
                <Coins size={15} />

                Set Allowance
              </button>

              <button
                onClick={() =>
                  navigate("/parent/settings")
                }
                className="btn-primary"
              >
                <Gauge size={15} />

                Set Daily Limit
              </button>

            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              DEMO BANNER
          ═══════════════════════════════════════════════ */}

          {demoMode && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6 text-sm text-amber-800">

              <AlertTriangle
                size={16}
                className="mt-0.5 flex-shrink-0 text-amber-500"
              />

              <div>

                <p className="font-semibold mb-0.5">
                  Demo Mode Active
                </p>

                <p className="text-amber-700">
                  Data shown is simulated. Deploy contracts
                  and configure{" "}
                  <code className="bg-amber-100 px-1 rounded">
                    frontend/.env
                  </code>{" "}
                  to go live.
                </p>

              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              REGISTER CHILD
          ═══════════════════════════════════════════════ */}

          {!childAddress && !isDemoMode && (
            <div className="card text-center py-12 mb-6">

              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <UserPlus
                  size={24}
                  className="text-brand-light"
                />
              </div>

              <h3 className="font-semibold text-gray-700 mb-1">
                No child registered yet
              </h3>

              <p className="text-gray-400 text-sm mb-5">
                Link a child wallet address to get started.
              </p>

              {showRegisterForm ? (

                <form
                  onSubmit={handleRegisterChild}
                  className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
                >

                  <input
                    type="text"
                    value={newChildInput}
                    onChange={(e) =>
                      setNewChildInput(e.target.value)
                    }
                    placeholder="Child wallet address (0x…)"
                    className="input font-mono text-xs flex-1"
                    required
                  />

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={txLoading.registerChild}
                  >
                    {txLoading.registerChild ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Plus size={15} />
                    )}

                    Register
                  </button>

                </form>

              ) : (

                <button
                  onClick={() =>
                    setShowRegisterForm(true)
                  }
                  className="btn-primary mx-auto"
                >
                  <UserPlus size={15} />

                  Register Child Wallet
                </button>

              )}

            </div>
          )}

          {/* ═══════════════════════════════════════════════
              EXISTING STATS
          ═══════════════════════════════════════════════ */}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

            <StatCard
              title="Total Allowance"
              value={formatToken(totalAllocated)}
              subtitle="Allocated to child"
              icon={<Coins size={20} />}
              iconBg="bg-blue-50"
              iconColor="text-brand-light"
              loading={loading}
            />

            <StatCard
              title="Remaining Balance"
              value={formatToken(
                childDetails?.allowanceBalance ?? 0n
              )}
              subtitle="Available to spend"
              icon={<Wallet size={20} />}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              loading={loading}
            />

            <StatCard
              title="Today's Spending"
              value={formatToken(dailySpent)}
              subtitle={`Limit: ${formatToken(
                childDetails?.dailyLimit ?? 0n
              )}`}
              icon={<TrendingUp size={20} />}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              loading={loading}
            />

            <StatCard
              title="Pending Requests"
              value={String(
                pendingRequests.length
              )}
              subtitle={
                pendingRequests.length > 0
                  ? "Tap to review"
                  : "All clear"
              }
              icon={<Bell size={20} />}
              iconBg={
                pendingRequests.length > 0
                  ? "bg-red-50"
                  : "bg-gray-50"
              }
              iconColor={
                pendingRequests.length > 0
                  ? "text-red-500"
                  : "text-gray-400"
              }
              loading={loading}
            />

          </div>

          {/* ═══════════════════════════════════════════════
              NEW — CHILD CONTROLS
          ═══════════════════════════════════════════════ */}

          <div className="card mb-6">

            {/* Header */}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">

              <div className="flex items-center gap-3">

                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  <ShieldCheck
                    size={21}
                    className="text-blue-600"
                  />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Child Controls
                  </h2>

                  <p className="text-xs text-gray-400 mt-0.5">
                    Manage child identity, allowance and spending
                  </p>
                </div>

              </div>

              {/* Active / Paused */}

              <button
                onClick={() =>
                  setChildActive((current) => !current)
                }
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                  childActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                }`}
              >

                {childActive ? (
                  <PlayCircle size={16} />
                ) : (
                  <PauseCircle size={16} />
                )}

                {childActive
                  ? "Active"
                  : "Paused"}

              </button>

            </div>

            {/* Control cards */}

            <div className="grid md:grid-cols-3 gap-4">

              {/* Child Name */}

              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">

                <div className="flex items-center gap-2 mb-3">

                  <User
                    size={16}
                    className="text-blue-600"
                  />

                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Child Name
                  </p>

                </div>

                <input
                  value={childName}
                  onChange={(e) =>
                    setChildName(e.target.value)
                  }
                  className="input text-sm w-full"
                  placeholder="Enter child's name"
                />

                <p className="text-xs text-gray-400 mt-2">
                  Profile name:{" "}
                  <span className="font-semibold text-gray-700">
                    {childName || "Unnamed"}
                  </span>
                </p>

              </div>

              {/* Monthly Allowance */}

              <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">

                <div className="flex items-center gap-2 mb-3">

                  <CalendarDays
                    size={16}
                    className="text-blue-600"
                  />

                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                    Monthly Allowance
                  </p>

                </div>

                <div className="flex items-center gap-2">

                  <span className="text-gray-500 font-bold">
                    $
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={monthlyAllowance}
                    onChange={(e) =>
                      setMonthlyAllowance(
                        e.target.value
                      )
                    }
                    className="input text-sm bg-white w-full"
                  />

                </div>

                <p className="text-xs text-blue-500 mt-2">
                  Monthly spending: $
                  {monthlySpent.toFixed(2)}
                </p>

              </div>

              {/* Account status */}

              <div
                className={`rounded-2xl border p-4 ${
                  childActive
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-red-50 border-red-100"
                }`}
              >

                <div className="flex items-center gap-2 mb-3">

                  {childActive ? (
                    <PlayCircle
                      size={16}
                      className="text-emerald-600"
                    />
                  ) : (
                    <PauseCircle
                      size={16}
                      className="text-red-600"
                    />
                  )}

                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      childActive
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    Account Status
                  </p>

                </div>

                <p className="text-xl font-bold text-gray-800">
                  {childActive
                    ? "Spending Enabled"
                    : "Spending Paused"}
                </p>

                <p className="text-xs text-gray-400 mt-2">
                  {childActive
                    ? "Child can make approved payments."
                    : "Child spending is currently paused."}
                </p>

              </div>

            </div>

            {/* Remaining limits */}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">

              <div className="rounded-xl border border-gray-100 bg-white p-4">

                <p className="text-xs text-gray-400">
                  Monthly Limit
                </p>

                <p className="text-xl font-bold text-gray-800 mt-1">
                  $
                  {monthlyAllowanceValue.toFixed(2)}
                </p>

              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4">

                <p className="text-xs text-gray-400">
                  Monthly Spent
                </p>

                <p className="text-xl font-bold text-amber-600 mt-1">
                  $
                  {monthlySpent.toFixed(2)}
                </p>

              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">

                <p className="text-xs text-emerald-600">
                  Monthly Remaining
                </p>

                <p className="text-xl font-bold text-emerald-700 mt-1">
                  $
                  {monthlyRemaining.toFixed(2)}
                </p>

              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">

                <p className="text-xs text-blue-600">
                  Daily Remaining
                </p>

                <p className="text-xl font-bold text-blue-700 mt-1">
                  $
                  {dailyRemaining.toFixed(2)}
                </p>

              </div>

            </div>

          </div>

          {/* ═══════════════════════════════════════════════
              NEW — NAMED APPROVED RECIPIENTS
          ═══════════════════════════════════════════════ */}

          <div className="card mb-6">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">

              <div>

                <h2 className="text-lg font-bold text-gray-900">
                  Named Approved Recipients
                </h2>

                <p className="text-xs text-gray-400 mt-1">
                  Give approved wallets recognizable names
                </p>

              </div>

              <div className="flex items-center gap-2">

                <span className="badge-info text-xs">
                  {namedRecipients.length} named
                </span>

                {approvedRecipients?.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {approvedRecipients.length} blockchain approved
                  </span>
                )}

              </div>

            </div>

            {/* Add recipient */}

            <div className="grid md:grid-cols-3 gap-3">

              <input
                value={recipientName}
                onChange={(e) =>
                  setRecipientName(e.target.value)
                }
                placeholder="Recipient name"
                className="input text-sm"
              />

              <input
                value={recipientAddress}
                onChange={(e) =>
                  setRecipientAddress(
                    e.target.value
                  )
                }
                placeholder="Wallet address (0x…)"
                className="input text-sm font-mono"
              />

              <button
                onClick={handleAddNamedRecipient}
                className="btn-primary"
                disabled={
                  !recipientName.trim() ||
                  !recipientAddress.trim()
                }
              >
                <Plus size={15} />
                Add Recipient
              </button>

            </div>

            {/* Named recipient list */}

            {namedRecipients.length > 0 ? (

              <div className="mt-5 space-y-2">

                {namedRecipients.map(
                  (recipient, index) => (

                    <div
                      key={`${recipient.address}-${index}`}
                      className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3"
                    >

                      <div className="flex items-center gap-3 min-w-0">

                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">

                          <Wallet
                            size={16}
                            className="text-brand-light"
                          />

                        </div>

                        <div className="min-w-0">

                          <p className="text-sm font-semibold text-gray-800">
                            {recipient.name}
                          </p>

                          <p className="text-xs text-gray-400 font-mono truncate">
                            {shortenAddress(
                              recipient.address
                            )}
                          </p>

                        </div>

                      </div>

                      <button
                        onClick={() =>
                          handleRemoveNamedRecipient(
                            index
                          )
                        }
                        className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 flex-shrink-0"
                      >

                        <Trash2 size={13} />

                        Remove

                      </button>

                    </div>

                  )
                )}

              </div>

            ) : (

              <div className="text-center py-7 mt-4 rounded-xl bg-gray-50 border border-dashed border-gray-200">

                <Wallet
                  size={25}
                  className="mx-auto text-gray-200 mb-2"
                />

                <p className="text-gray-400 text-sm">
                  No named recipients added yet.
                </p>

                <p className="text-gray-300 text-xs mt-1">
                  Add a store, school, canteen or other approved wallet.
                </p>

              </div>

            )}

          </div>

          {/* ═══════════════════════════════════════════════
              EXISTING MAIN GRID
          ═══════════════════════════════════════════════ */}

          <div className="grid lg:grid-cols-3 gap-6">

            {/* ═══════════════════════════════════════════
                LEFT COLUMN
            ═══════════════════════════════════════════ */}

            <div className="lg:col-span-2 space-y-6">

              {/* Weekly spending */}

              <div className="card">

                <div className="flex items-center justify-between mb-5">

                  <h3 className="section-title">
                    Weekly Spending
                  </h3>

                  {demoMode && (
                    <span className="badge-info text-xs">
                      Demo data
                    </span>
                  )}

                </div>

                <ResponsiveContainer
                  width="100%"
                  height={180}
                >
                  <BarChart
                    data={chartData}
                    barSize={28}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f3f4f6"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="day"
                      tick={{
                        fontSize: 12,
                        fill: "#9ca3af",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{
                        fontSize: 12,
                        fill: "#9ca3af",
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        `$${v}`
                      }
                    />

                    <Tooltip
                      formatter={(v) => [
                        `$${v}`,
                        "Spent",
                      ]}
                      contentStyle={{
                        borderRadius: 12,
                        border:
                          "1px solid #e5e7eb",
                        fontSize: 13,
                      }}
                    />

                    <Bar
                      dataKey="amount"
                      fill="#2563eb"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />

                  </BarChart>
                </ResponsiveContainer>

              </div>

              {/* Spending Breakdown */}

              <div className="card">

                <div className="flex items-center gap-2 mb-1">

                  <TrendingUp
                    size={16}
                    className="text-emerald-500"
                  />

                  <h3 className="section-title">
                    Spending Breakdown
                  </h3>

                  {demoMode && (
                    <span className="badge-info text-xs ml-auto">
                      Demo data
                    </span>
                  )}

                </div>

                <p className="text-xs text-gray-400 mb-3">
                  Category breakdown of child's spending
                </p>

                <ResponsiveContainer
                  width="100%"
                  height={220}
                >

                  <PieChart>

                    <Pie
                      data={breakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >

                      {breakdownData.map(
                        (entry, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={entry.color}
                          />
                        )
                      )}

                    </Pie>

                    <Tooltip
                      content={
                        <DonutTooltip />
                      }
                    />

                  </PieChart>

                </ResponsiveContainer>

                <BreakdownLegend
                  data={breakdownData}
                />

              </div>

              {/* Existing allowance cards */}

              <div className="grid sm:grid-cols-2 gap-6">

                <AllowanceCard
                  balance={
                    childDetails?.allowanceBalance ??
                    0n
                  }
                  total={totalAllocated}
                  loading={loading}
                />

                <SpendingLimitCard
                  dailyLimit={
                    childDetails?.dailyLimit ??
                    0n
                  }
                  dailySpent={
                    childDetails?.dailySpent ??
                    0n
                  }
                  loading={loading}
                />

              </div>

              {/* Quick actions */}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                <button
                  onClick={() =>
                    navigate(
                      "/parent/allowance"
                    )
                  }
                  className="card p-4 flex flex-col items-start gap-2 hover:shadow-card-hover transition-shadow cursor-pointer border-2 border-transparent hover:border-brand/10 text-left"
                >

                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">

                    <Coins
                      size={17}
                      className="text-brand-light"
                    />

                  </div>

                  <p className="text-sm font-semibold text-gray-800">
                    Set Allowance
                  </p>

                  <p className="text-xs text-gray-400">
                    Deposit mUSDC
                  </p>

                </button>

                <button
                  onClick={() =>
                    navigate(
                      "/parent/settings"
                    )
                  }
                  className="card p-4 flex flex-col items-start gap-2 hover:shadow-card-hover transition-shadow cursor-pointer border-2 border-transparent hover:border-brand/10 text-left"
                >

                  <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">

                    <Gauge
                      size={17}
                      className="text-cyan-600"
                    />

                  </div>

                  <p className="text-sm font-semibold text-gray-800">
                    Set Daily Limit
                  </p>

                  <p className="text-xs text-gray-400">
                    Configure cap
                  </p>

                </button>

                <button
                  onClick={() =>
                    navigate(
                      "/parent/transactions"
                    )
                  }
                  className="card p-4 flex flex-col items-start gap-2 hover:shadow-card-hover transition-shadow cursor-pointer border-2 border-transparent hover:border-brand/10 text-left"
                >

                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">

                    <ArrowRight
                      size={17}
                      className="text-purple-500"
                    />

                  </div>

                  <p className="text-sm font-semibold text-gray-800">
                    All Transactions
                  </p>

                  <p className="text-xs text-gray-400">
                    Full history
                  </p>

                </button>

              </div>

              {/* Recent transactions */}

              <TransactionTable
                transactions={transactions.slice(
                  0,
                  10
                )}
                loading={loading}
                demoMode={demoMode}
                title="Recent Transactions"
              />

            </div>

            {/* ═══════════════════════════════════════════
                RIGHT COLUMN
            ═══════════════════════════════════════════ */}

            <div className="space-y-6">

              {/* Child Profile */}

              <ChildProfileCard
                childAddress={
                  childAddress ||
                  (isDemoMode
                    ? MOCK_CHILD_ADDRESS
                    : "")
                }
                childDetails={
                  childDetails
                }
                loading={loading}
              />

              {/* Pending requests */}

              <div className="card">

                <div className="flex items-center justify-between mb-4">

                  <div className="flex items-center gap-2">

                    <Bell
                      size={16}
                      className="text-brand-light"
                    />

                    <h3 className="section-title">
                      Pending Requests
                    </h3>

                  </div>

                  {pendingRequests.length >
                    0 && (
                    <span className="badge-pending">
                      {
                        pendingRequests.length
                      }
                    </span>
                  )}

                </div>

                {loading ? (

                  <div className="flex justify-center py-6">
                    <LoadingSpinner size="md" />
                  </div>

                ) : pendingRequests.length ===
                  0 ? (

                  <div className="empty-state py-8">

                    <Bell
                      size={28}
                      className="text-gray-200 mb-2"
                    />

                    <p className="text-gray-400 text-sm font-medium">
                      No pending requests
                    </p>

                    <p className="text-gray-300 text-xs mt-1">
                      Child requests appear here for approval.
                    </p>

                  </div>

                ) : (

                  <ul
                    className="space-y-3"
                    aria-label="Pending spending requests"
                  >

                    {pendingRequests.map(
                      (req) => (

                        <li
                          key={String(req.id)}
                          onClick={() =>
                            setApprovalTarget(
                              req
                            )
                          }
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            setApprovalTarget(
                              req
                            )
                          }
                          className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 cursor-pointer hover:bg-amber-100 transition-colors"
                          aria-label={`Review request for ${formatToken(
                            req.amount
                          )}`}
                        >

                          <div className="min-w-0">

                            <p className="text-sm font-bold text-gray-800 tabular-nums">
                              {formatToken(
                                req.amount
                              )}
                            </p>

                            {req.memo && (
                              <p className="text-xs text-gray-500 truncate">
                                {req.memo}
                              </p>
                            )}

                            <p className="text-xs text-gray-400 font-mono mt-0.5">
                              {shortenAddress(
                                req.recipient
                              )}
                            </p>

                          </div>

                          <span className="badge-pending flex-shrink-0 whitespace-nowrap">
                            Review →
                          </span>

                        </li>

                      )
                    )}

                  </ul>

                )}

              </div>

              {/* Existing whitelist manager */}

              <WhitelistManager
                childAddress={
                  childAddress ||
                  (isDemoMode
                    ? MOCK_CHILD_ADDRESS
                    : "")
                }
                approvedRecipients={
                  approvedRecipients
                }
                loading={loading}
                onUpdate={refetch}
              />

              {/* Settings */}

              <button
                onClick={() =>
                  navigate(
                    "/parent/settings"
                  )
                }
                className="card w-full flex items-center justify-between p-4 hover:shadow-card-hover transition-shadow cursor-pointer text-left"
              >

                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">

                    <Settings
                      size={16}
                      className="text-gray-500"
                    />

                  </div>

                  <div>

                    <p className="text-sm font-semibold text-gray-800">
                      Security & Settings
                    </p>

                    <p className="text-xs text-gray-400">
                      Wallet, network, limits
                    </p>

                  </div>

                </div>

                <ArrowRight
                  size={16}
                  className="text-gray-300"
                />

              </button>

            </div>

          </div>

        </main>
      </div>

      {/* ═══════════════════════════════════════════════════
          APPROVAL MODAL
      ═══════════════════════════════════════════════════ */}

      <ApprovalModal
        isOpen={!!approvalTarget}
        request={approvalTarget}
        onClose={() =>
          setApprovalTarget(null)
        }
        onUpdate={refetch}
      />

    </div>
  );
}

// ═════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════

function buildChartData(transactions) {
  const days = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ];

  const totals = {};

  const now = Date.now();

  transactions.forEach((tx) => {
    if (tx.status !== "success") return;

    const ms =
      Number(tx.timestamp) * 1000;

    if (
      now - ms >
      7 * 86_400_000
    ) {
      return;
    }

    const day =
      days[new Date(ms).getDay()];

    totals[day] =
      (totals[day] ?? 0) +
      toHuman(tx.amount);
  });

  return days.map((day) => ({
    day,
    amount: Number(
      (totals[day] ?? 0).toFixed(2)
    ),
  }));
}

// ═════════════════════════════════════════════════════════
// Spending breakdown
// ═════════════════════════════════════════════════════════

function buildBreakdown(transactions) {
  const COLORS = {
    "School Store": "#10b981",
    Bookshop: "#3b82f6",
    "Lunch Canteen": "#ec4899",
    "Direct Payment": "#8b5cf6",
    Other: "#f59e0b",
  };

  const totals = {};

  let grand = 0;

  transactions.forEach((tx) => {
    if (tx.status !== "success") return;

    const cat =
      tx.label ??
      tx.type ??
      "Other";

    const amount =
      toHuman(tx.amount);

    totals[cat] =
      (totals[cat] ?? 0) +
      amount;

    grand += amount;
  });

  if (grand === 0) {
    return BREAKDOWN_DEMO;
  }

  return Object.entries(totals).map(
    ([name, value]) => ({
      name,
      value: Math.round(
        (value / grand) * 100
      ),
      color:
        COLORS[name] ??
        "#94a3b8",
    })
  );
}