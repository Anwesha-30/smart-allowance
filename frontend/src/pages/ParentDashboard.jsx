import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Copy,
  Wallet,
  TrendingUp,
  Bell,
  Plus,
  RefreshCw,
  UserPlus,
  ArrowUpRight,
  CalendarDays,
  ShieldCheck,
  Trash2,
  Users,
  CheckCircle2,
  Activity,
} from "lucide-react";
import {
  Rectangle,
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
import TransactionTable from "@/components/TransactionTable";
import WhitelistManager from "@/components/WhitelistManager";
import ApprovalModal from "@/components/ApprovalModal";
import LoadingSpinner from "@/components/LoadingSpinner";

import { useWallet } from "@/hooks/useWallet";
import { useKidSafe } from "@/hooks/useKidSafe";
import { useAllowance } from "@/hooks/useAllowance";

import {
  formatToken,
  toHuman,
  toRaw,
  dailyResetCountdown,
} from "@/utils/formatCurrency";

import {
  shortenAddress,
  isValidAddress,
} from "@/utils/formatAddress";

import {
  CHAIN_CONFIG,
  SUPPORTED_CHAIN_ID,
  KIDSAFE_ADDRESS,
  TOKEN_SYMBOL,
} from "@/utils/constants";

import { MOCK_CHILD_ADDRESS } from "@/services/mockData";

import "./ParentDashboard.css";

import {
  AnimatedNumber,
  useCardTilt,
  useReducedMotion,
} from "./ParentDashboardMotion";

import {
  ProtectionScene,
  LiquidGauge,
  DecisionFeedback,
} from "./ParentDashboardVisuals";

const COLORS = [
  "#4f46e5",
  "#14b8a6",
  "#60a5fa",
  "#f59e0b",
  "#a78bfa",
];

const money = (value) => formatToken(toRaw(value));

function Summary({
  label,
  value,
  detail,
  icon: Icon,
  primary = false,
  loading,
  numericValue = null,
  status,
}) {
  const tilt = useCardTilt();

  return (
    <div
      {...tilt}
      className={`pd-summary ${
        primary ? "pd-summary-primary" : ""
      }`}
    >
      <div className="pd-summary-label">
        <span>{label}</span>
        <Icon size={19} aria-hidden />
      </div>

      <p className="pd-summary-value">
        {loading ? (
          <span className="pd-skeleton" />
        ) : numericValue !== null ? (
          <AnimatedNumber
            value={numericValue}
            format={money}
          />
        ) : status ? (
          <span
            className="pd-status"
            data-status={status}
          >
            <i aria-hidden="true" />
            {value}
          </span>
        ) : (
          value
        )}
      </p>

      <p className="pd-summary-detail">
        {detail}
      </p>
    </div>
  );
}

function Limit({
  label,
  spent,
  limit,
  detail,
  loading,
  monthly = false,
  available = true,
}) {
  const pct =
    limit > 0
      ? Math.min(
          100,
          Math.max(0, (spent / limit) * 100)
        )
      : 0;

  return (
    <div
      className={`pd-limit ${
        monthly ? "pd-limit-monthly" : ""
      }`}
    >
      <div className="pd-between">
        <span className="pd-limit-label">
          {label}
        </span>

        <span className="pd-muted">
          {limit > 0
            ? `${Math.round(pct)}% used`
            : "Not set"}
        </span>
      </div>

      <p className="pd-limit-amount">
        {loading ? "Loading…" : money(spent)}{" "}
        <span>
          / {limit > 0 ? money(limit) : "—"}
        </span>
      </p>

      <LiquidGauge
        spent={spent}
        limit={limit}
        available={available && !loading}
        label={label}
      />

      <div className="pd-between pd-limit-footer">
        <span>{detail}</span>

        <strong>
          {limit > 0
            ? `${money(
                Math.max(0, limit - spent)
              )} left`
            : "Set a limit to track usage"}
        </strong>
      </div>
    </div>
  );
}

// Aggregate only successful payment events returned by the existing hook.
function paymentData(transactions) {
  const now = new Date();

  const days = Array.from(
    {
      length: 7,
    },
    (_, i) => {
      const date = new Date(now);

      date.setDate(
        date.getDate() - 6 + i
      );

      date.setHours(0, 0, 0, 0);

      return {
        day: date.toLocaleDateString(
          undefined,
          {
            weekday: "short",
          }
        ),
        date: date.getTime(),
        end: new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate() + 1
        ).getTime(),
        amount: 0,
      };
    }
  );

  const groups = {};
  let monthlySpent = 0;

  for (const tx of transactions) {
    if (tx.status !== "success") continue;

    const date = new Date(
      Number(tx.timestamp) * 1000
    );

    if (date > now) continue;

    const amount = toHuman(tx.amount);

    if (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      monthlySpent += amount;
    }

    const bucket = days.find(
      (d) =>
        date.getTime() >= d.date &&
        date.getTime() < d.end
    );

    if (bucket) {
      bucket.amount += amount;
    }

    const name =
      tx.label ||
      tx.type ||
      "Other payments";

    groups[name] =
      (groups[name] || 0) + amount;
  }

  return {
    days,
    monthlySpent,
    breakdown: Object.entries(groups).map(
      ([name, value], i) => ({
        name,
        value,
        color:
          COLORS[i % COLORS.length],
      })
    ),
  };
}

export default function ParentDashboard() {
  const navigate = useNavigate();

  const reducedMotion =
    useReducedMotion();

  const {
    account,
    isDemoMode,
    isCorrectChain,
  } = useWallet();

  const {
    registerChild,
    addApprovedRecipient,
    loading: txLoading,
  } = useKidSafe();

  const [childAddress, setChildAddress] =
    useState("");

  const selectedChild =
    childAddress ||
    (isDemoMode
      ? MOCK_CHILD_ADDRESS
      : "");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [
    showRegisterForm,
    setShowRegisterForm,
  ] = useState(false);

  const [
    newChildInput,
    setNewChildInput,
  ] = useState("");

  const [childName, setChildName] =
    useState("");

  const [
    monthlyBudget,
    setMonthlyBudget,
  ] = useState("");

  const [
    recipientName,
    setRecipientName,
  ] = useState("");

  const [
    recipientAddress,
    setRecipientAddress,
  ] = useState("");

  const [
    namedRecipients,
    setNamedRecipients,
  ] = useState({});

  const [formError, setFormError] =
    useState("");

  const [
    approvalTarget,
    setApprovalTarget,
  ] = useState(null);

  const [decision, setDecision] =
    useState(null);

  const clearDecision = useCallback(
    () => setDecision(null),
    []
  );

  const {
    childDetails,
    approvedRecipients,
    pendingRequests,
    transactions,
    loading,
    error,
    demoMode,
    refetch,
  } = useAllowance(
    selectedChild || null
  );

  const {
    days,
    monthlySpent,
    breakdown,
  } = useMemo(
    () => paymentData(transactions),
    [transactions]
  );

  const budget =
    Number(monthlyBudget) || 0;

  const dailyLimit = toHuman(
    childDetails?.dailyLimit ?? 0n
  );

  const dailySpent = toHuman(
    childDetails?.dailySpent ?? 0n
  );

  const ready =
    !!childDetails && !error;

  const status = error
    ? "Unavailable"
    : loading && !childDetails
    ? "Loading"
    : childDetails?.registered
    ? "Active"
    : "Not registered";

  const names =
    namedRecipients[
      selectedChild.toLowerCase()
    ] || {};

  const canManage =
    !!selectedChild &&
    !!childDetails?.registered &&
    (isDemoMode ||
      (!!account &&
        isCorrectChain &&
        childDetails.parent
          ?.toLowerCase() ===
          account.toLowerCase()));

  const network =
    CHAIN_CONFIG[SUPPORTED_CHAIN_ID];

  async function handleRegister(e) {
    e.preventDefault();

    if (!isValidAddress(newChildInput)) {
      setFormError(
        "Enter a valid child wallet address."
      );
      return;
    }

    setFormError("");

    await registerChild(
      newChildInput,
      () => {
        setChildAddress(
          newChildInput.toLowerCase()
        );

        setNewChildInput("");
        setShowRegisterForm(false);
      }
    );
  }

  async function handleNamedRecipient(e) {
    e.preventDefault();

    if (!isValidAddress(recipientAddress)) {
      setFormError(
        "Enter a valid dApp contract address."
      );
      return;
    }

    const address =
      recipientAddress.toLowerCase();

    const saveName = () => {
      setNamedRecipients((prev) => ({
        ...prev,
        [selectedChild.toLowerCase()]: {
          ...prev[
            selectedChild.toLowerCase()
          ],
          [address]:
            recipientName.trim(),
        },
      }));

      setRecipientName("");
      setRecipientAddress("");
      setFormError("");

      refetch();
    };

    if (
      approvedRecipients.some(
        (a) =>
          a.toLowerCase() === address
      )
    ) {
      saveName();
    } else {
      await addApprovedRecipient(
        selectedChild,
        address,
        saveName
      );
    }
  }

  return (
    <div className="parent-dashboard min-h-screen">
      <div
        className="pd-ambient"
        aria-hidden="true"
      >
        <span className="pd-floating-shield">
          <ShieldCheck
            size={76}
            strokeWidth={0.8}
          />
        </span>

        <span className="pd-floating-block">
          <svg
            width="88"
            height="88"
            viewBox="0 0 88 88"
            fill="none"
          >
            <path
              d="M44 8 76 26v36L44 80 12 62V26L44 8ZM12 26l32 18 32-18M44 44v36"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </span>

        <span className="pd-floating-link">
          <Activity
            size={64}
            strokeWidth={0.8}
          />
        </span>
      </div>

      <Navbar
        onMenuToggle={() =>
          setSidebarOpen((v) => !v)
        }
        sidebarOpen={sidebarOpen}
      />

      <div className="flex">
        <Sidebar
          open={sidebarOpen}
          onClose={() =>
            setSidebarOpen(false)
          }
          mode="parent"
        />

        <main className="pd-main">
          {/* =========================
              FAMILY COMMAND CENTER HEADER
             ========================= */}
          <header className="pd-header">
            <div>
              <p className="pd-eyebrow">
                YOUR FAMILY. YOUR CONTROL.
              </p>

              <h1>
                Family Command Center
                <span className="pd-header-dot">
                  .
                </span>
              </h1>

              <p className="pd-muted">
                Manage allowance. Set
                guardrails. Approve every
                request.
              </p>
            </div>

            <div className="pd-header-actions">
              <button
                className="btn-ghost"
                onClick={refetch}
                disabled={loading}
                aria-label="Refresh dashboard"
              >
                <RefreshCw
                  size={16}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>

              <button
                className="btn-primary"
                onClick={() =>
                  navigate(
                    "/parent/allowance"
                  )
                }
              >
                <Plus size={16} />
                Manage allowance
              </button>
            </div>
          </header>

          <ProtectionScene
            spent={dailySpent}
            limit={dailyLimit}
            available={ready}
          />

          <div className="pd-context">
            <span className="pd-context-label">
              <span
                className={`pd-dot ${
                  demoMode || error
                    ? "pd-dot-amber"
                    : ""
                }`}
              />

              {demoMode
                ? "Demo workspace · simulated data"
                : error
                ? "Blockchain data unavailable"
                : loading
                ? "Refreshing blockchain data"
                : selectedChild
                ? "Blockchain data · auto-refresh enabled"
                : "Connect a child wallet to get started"}
            </span>

            <span>
              {demoMode
                ? "Preview"
                : network?.name ||
                  "Configured network"}{" "}
              · {TOKEN_SYMBOL}
            </span>
          </div>

          {error && (
            <div
              className="pd-notice"
              role="alert"
            >
              Unable to refresh blockchain
              data. Previously loaded values
              may be stale. {error}

              <button
                onClick={refetch}
                className="btn-ghost"
              >
                Retry
              </button>
            </div>
          )}

          {!selectedChild && (
            <section className="card pd-onboarding">
              <UserPlus size={28} />

              <div>
                <h2>
                  Start with a child wallet
                </h2>

                <p className="pd-muted">
                  Register a new wallet or
                  load one you already manage.
                </p>
              </div>

              <button
                className="btn-primary"
                onClick={() =>
                  setShowRegisterForm(
                    (v) => !v
                  )
                }
              >
                Register child
              </button>
            </section>
          )}

          {showRegisterForm && (
            <form
              onSubmit={handleRegister}
              className="card pd-wallet-form"
            >
              <label
                className="input-label"
                htmlFor="register-child"
              >
                Child wallet address
              </label>

              <input
                id="register-child"
                className="input font-mono"
                value={newChildInput}
                onChange={(e) =>
                  setNewChildInput(
                    e.target.value
                  )
                }
                placeholder="0x…"
                required
              />

              <button
                className="btn-primary"
                disabled={
                  txLoading.registerChild ||
                  (!isDemoMode &&
                    (!account ||
                      !isCorrectChain))
                }
              >
                {txLoading.registerChild ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Plus size={16} />
                )}

                Register
              </button>
            </form>
          )}

          {formError && (
            <p
              className="pd-notice"
              role="alert"
            >
              {formError}
            </p>
          )}

          {/* SUMMARY */}
          <section
            className="pd-summary-grid"
            aria-label="Allowance overview"
          >
            <Summary
              key={`allowance-${selectedChild}`}
              numericValue={
                ready
                  ? toHuman(
                      childDetails.allowanceBalance
                    )
                  : null
              }
              label="Available Allowance"
              value={
                ready
                  ? formatToken(
                      childDetails.allowanceBalance
                    )
                  : "—"
              }
              detail="Current allowance balance"
              icon={Wallet}
              primary
              loading={
                loading && !childDetails
              }
            />

            <Summary
              key={`monthly-${selectedChild}`}
              numericValue={
                budget && ready
                  ? Math.max(
                      0,
                      budget - monthlySpent
                    )
                  : null
              }
              label="Monthly Remaining"
              value={
                budget && ready
                  ? money(
                      Math.max(
                        0,
                        budget -
                          monthlySpent
                      )
                    )
                  : "—"
              }
              detail={
                budget
                  ? "Against your planning budget"
                  : "Set a monthly planning budget below"
              }
              icon={CalendarDays}
              loading={
                loading && !childDetails
              }
            />

            <Summary
              key={`daily-${selectedChild}`}
              numericValue={
                ready ? dailySpent : null
              }
              label="Today's Spending"
              value={
                ready
                  ? formatToken(
                      childDetails.dailySpent
                    )
                  : "—"
              }
              detail={
                ready
                  ? `Daily limit ${money(
                      dailyLimit
                    )}`
                  : "Waiting for child wallet data"
              }
              icon={TrendingUp}
              loading={
                loading && !childDetails
              }
            />

            <Summary
              status={status}
              label="Child Status"
              value={status}
              detail={
                childDetails?.registered
                  ? "Registered on the KidSafe contract"
                  : "Register or load a child wallet"
              }
              icon={Users}
              loading={
                loading && !childDetails
              }
            />
          </section>

          <div className="pd-workspace">
            <div className="pd-primary-column">
              {/* SPENDING GUARDRAILS */}
              <section className="card">
                <div className="pd-section-header">
                  <div>
                    <p className="pd-eyebrow">
                      SPENDING GUARDRAILS
                    </p>

                    <h2>
                      Small limits. Big peace
                      of mind.
                    </h2>
                  </div>

                  <button
                    className="pd-text-button"
                    onClick={() =>
                      navigate(
                        "/parent/settings"
                      )
                    }
                  >
                    Edit daily limit
                    <ArrowUpRight
                      size={15}
                    />
                  </button>
                </div>

                <div className="pd-limits-grid">
                  <Limit
                    available={ready}
                    label="Daily spending limit"
                    spent={dailySpent}
                    limit={dailyLimit}
                    loading={
                      loading &&
                      !childDetails
                    }
                    detail={`Resets ${dailyResetCountdown()}`}
                  />

                  <Limit
                    available={ready}
                    label="Monthly planning budget"
                    spent={monthlySpent}
                    limit={budget}
                    monthly
                    loading={
                      loading &&
                      !childDetails
                    }
                    detail="Based on loaded payment history"
                  />
                </div>

                <p className="pd-footnote">
                  Daily limits are enforced
                  on-chain. Monthly budgets are
                  planning targets; history
                  covers the latest 10,000
                  blocks.
                </p>
              </section>

              {/* CHILD MANAGEMENT */}
              <section className="card">
                <div className="pd-section-header">
                  <div>
                    <p className="pd-eyebrow">
                      FAMILY WALLET
                    </p>

                    <h2>
                      Child Management
                    </h2>
                  </div>

                  <span
                    data-status={status}
                    className={`pd-status-badge ${
                      childDetails?.registered
                        ? "badge-success"
                        : "badge-info"
                    }`}
                  >
                    <CheckCircle2 size={12} />
                    {status}
                  </span>
                </div>

                <div className="pd-child-identity">
                  <div className="pd-avatar">
                    {(childName ||
                      "Child")
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>

                  <div>
                    <h3>
                      {childName ||
                        "Child wallet"}
                    </h3>

                    <p
                      className="pd-wallet-address"
                      title={selectedChild}
                    >
                      {selectedChild
                        ? shortenAddress(
                            selectedChild,
                            8
                          )
                        : "No wallet selected"}
                    </p>
                  </div>

                  <button
                    className="btn-ghost"
                    aria-label="Copy child wallet address"
                    disabled={!selectedChild}
                    onClick={() =>
                      globalThis.navigator.clipboard
                        .writeText(
                          selectedChild
                        )
                        .catch(() =>
                          setFormError(
                            "Unable to copy the address. Please copy it from the wallet address field."
                          )
                        )
                    }
                  >
                    <Copy size={15} />
                  </button>

                  <span className="pd-muted">
                    {
                      approvedRecipients.length
                    }{" "}
                    approved dApps
                  </span>
                </div>

                <div className="pd-management-grid">
                  <label className="pd-field">
                    Display name

                    <input
                      className="input"
                      value={childName}
                      onChange={(e) =>
                        setChildName(
                          e.target.value
                        )
                      }
                      placeholder="Give this wallet a name"
                    />

                    <small>
                      Display label for this
                      session
                    </small>
                  </label>

                  <label className="pd-field">
                    Monthly planning budget (
                    {TOKEN_SYMBOL})

                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={monthlyBudget}
                      onChange={(e) =>
                        setMonthlyBudget(
                          e.target.value
                        )
                      }
                      placeholder="Enter a budget"
                    />

                    <small>
                      Planning only · does not
                      change the allowance
                    </small>
                  </label>
                </div>

                <details className="pd-wallet-details">
                  <summary>
                    Load an existing child
                    wallet
                  </summary>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();

                      if (
                        isValidAddress(
                          newChildInput
                        )
                      ) {
                        setChildAddress(
                          newChildInput.toLowerCase()
                        );

                        setChildName("");
                        setMonthlyBudget("");
                        setFormError("");
                      } else {
                        setFormError(
                          "Enter a valid child wallet address."
                        );
                      }
                    }}
                    className="pd-wallet-form"
                  >
                    <input
                      className="input font-mono"
                      aria-label="Existing child wallet address"
                      value={newChildInput}
                      onChange={(e) =>
                        setNewChildInput(
                          e.target.value
                        )
                      }
                      placeholder="0x…"
                      required
                    />

                    <button className="btn-secondary">
                      Load wallet
                    </button>
                  </form>
                </details>

                <div className="pd-status-note">
                  <ShieldCheck size={16} />

                  <p>
                    {childDetails?.registered
                      ? "Active · child is registered on-chain."
                      : "Load a registered wallet to view its status."}{" "}
                    Spending pause is
                    unavailable in the current
                    contract.
                  </p>
                </div>
              </section>

              {/* SPENDING INSIGHTS */}
              <section className="card">
                <div className="pd-section-header">
                  <div>
                    <p className="pd-eyebrow">
                      SPENDING INSIGHTS
                    </p>

                    <h2>
                      The week at a glance
                    </h2>
                  </div>

                  <span className="pd-chip">
                    Last 7 days
                  </span>
                </div>

                <div className="pd-chart-total">
                  <strong>
                    <AnimatedNumber
                      value={days.reduce(
                        (sum, d) =>
                          sum + d.amount,
                        0
                      )}
                      format={money}
                    />
                  </strong>

                  <span className="pd-muted">
                    in loaded successful
                    payments
                  </span>
                </div>

                <div className="pd-chart">
                  <ResponsiveContainer
                    width="100%"
                    height={245}
                  >
                    <BarChart
                      data={days}
                      margin={{
                        top: 15,
                        right: 8,
                        left: 0,
                        bottom: 0,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="pd-bar"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#6366f1"
                          />
                          <stop
                            offset="100%"
                            stopColor="#a5b4fc"
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        vertical={false}
                        stroke="#eef0f5"
                        strokeDasharray="4 4"
                      />

                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#64748b",
                          fontSize: 12,
                        }}
                        dy={8}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 11,
                        }}
                        width={48}
                      />

                      <Tooltip
                        cursor={{
                          fill: "#f1f5f9",
                          radius: 8,
                        }}
                        formatter={(value) => [
                          money(
                            Number(value)
                          ),
                          "Spent",
                        ]}
                      />

                      <Bar
                        isAnimationActive={
                          !reducedMotion
                        }
                        animationDuration={650}
                        animationEasing="ease-out"
                        activeBar={
                          <Rectangle
                            fill="#4f46e5"
                            stroke="#c7d2fe"
                            strokeWidth={2}
                            radius={[
                              7,
                              7,
                              0,
                              0,
                            ]}
                          />
                        }
                        dataKey="amount"
                        fill="url(#pd-bar)"
                        radius={[
                          7,
                          7,
                          0,
                          0,
                        ]}
                        maxBarSize={38}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {!transactions.some(
                  (tx) =>
                    tx.status ===
                    "success"
                ) && (
                  <p className="pd-footnote">
                    No successful payments yet.
                    Activity will appear after a
                    payment is confirmed.
                  </p>
                )}
              </section>

              {/* SPENDING BREAKDOWN */}
              <section
                className="card pd-pie-section"
                aria-label="Spending breakdown pie chart"
              >
                <div className="pd-section-header">
                  <div>
                    <p className="pd-eyebrow">
                      PAYMENT MIX
                    </p>

                    <h2>
                      Spending Breakdown
                    </h2>

                    <p className="pd-muted">
                      Successful payments in
                      loaded history
                    </p>
                  </div>

                  <span className="pd-chip">
                    {TOKEN_SYMBOL}
                  </span>
                </div>

                <div className="pd-pie-layout">
                  <div className="pd-pie-visual">
                    {breakdown.length > 0 ? (
                      <ResponsiveContainer
                        width="100%"
                        height={240}
                      >
                        <PieChart>
                          <Pie
                            isAnimationActive={
                              !reducedMotion
                            }
                            animationDuration={650}
                            data={breakdown}
                            cx="50%"
                            cy="50%"
                            outerRadius={96}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            stroke="none"
                          >
                            {breakdown.map(
                              (d) => (
                                <Cell
                                  key={d.name}
                                  fill={d.color}
                                />
                              )
                            )}
                          </Pie>

                          <Tooltip
                            formatter={(value) =>
                              money(
                                Number(value)
                              )
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div
                        className="pd-pie-placeholder"
                        role="status"
                      >
                        <div
                          className="pd-pie-empty-ring"
                          aria-hidden="true"
                        />

                        <p>
                          {loading
                            ? "Loading spending..."
                            : "No successful payments yet"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pd-legend">
                    {breakdown.length > 0 ? (
                      breakdown.map((d) => (
                        <div key={d.name}>
                          <span>
                            <i
                              style={{
                                background:
                                  d.color,
                              }}
                            />

                            {d.name}
                          </span>

                          <strong>
                            {money(d.value)}
                          </strong>
                        </div>
                      ))
                    ) : (
                      <p className="pd-muted">
                        Your pie chart will show
                        the spending mix as
                        confirmed payments
                        arrive.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* TRANSACTIONS */}
              <section className="pd-transactions">
                <div className="pd-between pd-history-heading">
                  <p className="pd-eyebrow">
                    YOUR ON-CHAIN ACTIVITY
                  </p>

                  <button
                    className="pd-text-button"
                    onClick={() =>
                      navigate(
                        "/parent/transactions"
                      )
                    }
                  >
                    View full history
                    <ArrowUpRight
                      size={15}
                    />
                  </button>
                </div>

                <TransactionTable
                  transactions={transactions.slice(
                    0,
                    10
                  )}
                  loading={
                    loading &&
                    !transactions.length
                  }
                  demoMode={demoMode}
                  title="Recent Transactions"
                />
              </section>
            </div>

            {/* RIGHT SIDEBAR */}
            <aside className="pd-secondary-column">
              {/* PENDING REQUESTS */}
              <section className="card pd-requests">
                <div className="pd-section-header">
                  <div>
                    <p className="pd-eyebrow">
                      NEEDS YOUR ATTENTION
                    </p>

                    <h2>
                      <Bell size={18} />
                      Pending Requests
                    </h2>
                  </div>

                  <span className="pd-count">
                    <AnimatedNumber
                      value={
                        pendingRequests.length
                      }
                      format={(v) =>
                        String(
                          Math.round(v)
                        )
                      }
                    />
                  </span>
                </div>

                <p className="pd-muted">
                  You have the final say on
                  every request.
                </p>

                <DecisionFeedback
                  decision={decision}
                  onDone={clearDecision}
                />

                {loading &&
                !pendingRequests.length ? (
                  <div className="pd-empty">
                    <LoadingSpinner size="md" />
                  </div>
                ) : !pendingRequests.length ? (
                  <div className="pd-empty">
                    <CheckCircle2 size={30} />

                    <h3>
                      You're all caught up
                    </h3>

                    <p>
                      New spending requests
                      will appear here.
                    </p>
                  </div>
                ) : (
                  <ul className="pd-request-list">
                    {pendingRequests.map(
                      (req, index) => (
                        <li
                          key={String(req.id)}
                          style={{
                            "--request-delay": `${
                              Math.min(
                                index,
                                6
                              ) * 65
                            }ms`,
                          }}
                        >
                          <div className="pd-between">
                            <strong>
                              {formatToken(
                                req.amount
                              )}
                            </strong>

                            <span className="badge-pending">
                              Pending
                            </span>
                          </div>

                          <p>
                            {req.memo ||
                              "Spending request"}
                          </p>

                          <span
                            className="pd-wallet-address"
                            title={
                              req.recipient
                            }
                          >
                            {shortenAddress(
                              req.recipient,
                              8
                            )}
                          </span>

                          <div className="pd-request-actions">
                            <button
                              className="pd-review-button"
                              onClick={() =>
                                setApprovalTarget(
                                  req
                                )
                              }
                              disabled={
                                !canManage
                              }
                              aria-label={`Review and approve request ${req.id}`}
                            >
                              Approve
                              <CheckCircle2
                                size={14}
                              />
                            </button>

                            <button
                              className="pd-review-button pd-reject-button"
                              onClick={() =>
                                setApprovalTarget(
                                  req
                                )
                              }
                              disabled={
                                !canManage
                              }
                              aria-label={`Review and reject request ${req.id}`}
                            >
                              Reject
                            </button>
                          </div>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </section>

              {/* KIDSAFE PROTECTION */}
              <section className="pd-protection">
                <div className="pd-between">
                  <ShieldCheck size={25} />

                  <span className="pd-protection-badge">
                    {demoMode
                      ? "Demo"
                      : error
                      ? "Sync issue"
                      : !account
                      ? "Wallet disconnected"
                      : !isCorrectChain
                      ? "Switch network"
                      : "Wallet connected"}
                  </span>
                </div>

                <h2>
                  KidSafe Protection
                </h2>

                <p>
                  Built-in guardrails for
                  growing independence.
                </p>

                <div>
                  <span>
                    <CheckCircle2 size={14} />
                    Daily spending limits
                  </span>

                  <span>
                    <CheckCircle2 size={14} />
                    Approved dApp controls
                  </span>

                  <span>
                    <CheckCircle2 size={14} />
                    Parent approval for requests
                  </span>
                </div>

                <footer>
                  <Activity size={13} />

                  {demoMode
                    ? "Simulated blockchain activity"
                    : network?.name ||
                      "Configured network"}

                  {!demoMode &&
                    KIDSAFE_ADDRESS && (
                      <span
                        title={
                          KIDSAFE_ADDRESS
                        }
                      >
                        {shortenAddress(
                          KIDSAFE_ADDRESS
                        )}
                      </span>
                    )}
                </footer>
              </section>
            </aside>
          </div>

          {/* APPROVED DAPPS */}
          <section className="card pd-recipient-section">
            <div className="pd-section-header">
              <div>
                <p className="pd-eyebrow">
                  TRUSTED DAPPS
                </p>

                <h2>
                  Approved dApps
                </h2>

                <p className="pd-muted">
                  Manage approved dApp contract
                  addresses for your child's
                  payments.
                </p>
              </div>

              <span className="pd-chip">
                {approvedRecipients.length}{" "}
                on-chain approved
              </span>
            </div>

            <form
              onSubmit={handleNamedRecipient}
              className="pd-recipient-form"
            >
              <label className="pd-field">
                dApp Name

                <input
                  className="input"
                  value={recipientName}
                  onChange={(e) =>
                    setRecipientName(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Example dApp"
                  required
                />
              </label>

              <label className="pd-field">
                dApp Contract Address

                <input
                  className="input font-mono"
                  value={recipientAddress}
                  onChange={(e) =>
                    setRecipientAddress(
                      e.target.value
                    )
                  }
                  placeholder="0x…"
                  required
                />
              </label>

              <button
                className="btn-primary"
                disabled={
                  !canManage ||
                  !recipientName.trim() ||
                  !isValidAddress(
                    recipientAddress
                  ) ||
                  txLoading.addRecipient
                }
              >
                {txLoading.addRecipient ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Plus size={16} />
                )}

                Approve dApp
              </button>
            </form>

            <p className="pd-footnote">
              Approving a new dApp contract
              address requires a blockchain
              transaction. dApp names are
              display labels for this session.
            </p>

            <div
              className="pd-recipient-grid"
              role="list"
              aria-label="Approved dApps"
            >
              {approvedRecipients.map(
                (address) => (
                  <div
                    className="pd-recipient"
                    role="listitem"
                    key={address}
                  >
                    <div className="pd-recipient-icon">
                      <ShieldCheck size={19} />
                    </div>

                    <div>
                      <strong>
                        {names[
                          address.toLowerCase()
                        ] ||
                          "Approved dApp"}
                      </strong>

                      <p
                        className="pd-wallet-address"
                        title={address}
                      >
                        {shortenAddress(
                          address,
                          8
                        )}
                      </p>
                    </div>

                    {names[
                      address.toLowerCase()
                    ] && (
                      <button
                        className="btn-ghost"
                        aria-label={`Remove dApp display name for ${
                          names[
                            address.toLowerCase()
                          ]
                        }`}
                        onClick={() =>
                          setNamedRecipients(
                            (prev) => {
                              const updated = {
                                ...names,
                              };

                              delete updated[
                                address.toLowerCase()
                              ];

                              return {
                                ...prev,
                                [selectedChild.toLowerCase()]:
                                  updated,
                              };
                            }
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )
              )}
            </div>

            {canManage ? (
              <details className="pd-wallet-details">
                <summary>
                  Manage approved dApps -
                  approve or remove on-chain
                </summary>

                <WhitelistManager
                  childAddress={
                    selectedChild
                  }
                  approvedRecipients={
                    approvedRecipients
                  }
                  loading={loading}
                  onUpdate={refetch}
                />
              </details>
            ) : (
              <p className="pd-footnote">
                Load a child wallet managed by
                your connected parent account to
                manage approved dApps.
              </p>
            )}
          </section>

          <footer className="pd-page-footer">
            <ShieldCheck size={14} />

            KidSafe · A little freedom. A lot
            of protection.

            <span>
              {demoMode
                ? "Demo mode"
                : "Powered by on-chain controls"}
            </span>
          </footer>
        </main>
      </div>

      <ApprovalModal
        isOpen={!!approvalTarget}
        onClose={() =>
          setApprovalTarget(null)
        }
        request={approvalTarget}
        onUpdate={refetch}
        onDecision={(
          type,
          request,
          receipt
        ) =>
          setDecision({
            type,
            id: String(request.id),
            demo: !!receipt?.demo,
          })
        }
      />
    </div>
  );
}