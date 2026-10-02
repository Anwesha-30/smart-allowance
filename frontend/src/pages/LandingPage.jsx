import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, Baby, Users, CheckCircle2,
  ArrowRight, Zap, Lock, Coins, BarChart3,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import LoadingSpinner from "@/components/LoadingSpinner";

/* ─────────────────────────────────────────────────────────
   Role card data
───────────────────────────────────────────────────────── */
const ROLES = [
  {
    key: "parent",
    icon: <Users size={36} />,
    iconBg: "from-blue-500 to-indigo-600",
    title: "Sign in as Parent",
    subtitle: "Full control over your child's allowance",
    features: [
      "Set monthly allowance & daily limit",
      "Whitelist approved recipients",
      "Approve or reject spending requests",
      "Monitor all transactions in real time",
    ],
    cta: "Continue as Parent",
    ctaCls: "bg-brand hover:bg-brand-light text-white",
    border: "hover:border-brand/40 hover:shadow-blue-100",
  },
  {
    key: "child",
    icon: <Baby size={36} />,
    iconBg: "from-cyan-400 to-blue-500",
    title: "Sign in as Child",
    subtitle: "View your allowance & make payments",
    features: [
      "See your available balance",
      "Track daily spending with progress bar",
      "Send payments to approved stores",
      "Request money from your parent",
    ],
    cta: "Continue as Child",
    ctaCls: "bg-cyan-500 hover:bg-cyan-400 text-white",
    border: "hover:border-cyan-400/40 hover:shadow-cyan-100",
  },
];

/* ─────────────────────────────────────────────────────────
   Feature strip
───────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: <Lock size={18} />,    label: "On-chain enforcement"     },
  { icon: <Coins size={18} />,   label: "Mock USDC test tokens"    },
  { icon: <BarChart3 size={18} />,label: "Real-time spending chart" },
  { icon: <Shield size={18} />,  label: "Smart contract rules"     },
];

/* ═══════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const { role, setRole, connect, isConnecting, account, isDemoMode } = useWallet();
  const [choosing, setChoosing] = useState(null); // which role is being processed

  /* If already has a role, redirect immediately */
  if (role === "parent") { navigate("/parent", { replace: true }); return null; }
  if (role === "child")  { navigate("/child",  { replace: true }); return null; }

  async function handleRoleSelect(selectedRole) {
    setChoosing(selectedRole);

    // Try wallet connect first (non-blocking — falls back to demo)
    if (!account) await connect();

    // Set role regardless — demo mode works without a wallet
    setRole(selectedRole);
    navigate(selectedRole === "parent" ? "/parent" : "/child");
    setChoosing(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top bar ──────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-sm">
            <Shield size={18} className="text-white" />
          </div>
          <span className="text-xl font-extrabold text-brand tracking-tight">KidSafe</span>
          <span className="hidden sm:block text-gray-300 text-sm ml-1">·</span>
          <span className="hidden sm:block text-gray-400 text-sm">Smart Allowance. Safer Spending.</span>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero-gradient text-white py-14 md:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          {/* Logo */}
          <div className="w-20 h-20 rounded-3xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Shield size={36} className="text-white" />
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-3 tracking-tight">
            Smart Allowance.<br />
            <span className="text-brand-accent">Safer Spending.</span>
          </h1>
          <p className="text-white/70 text-lg mb-6 max-w-xl mx-auto">
            A blockchain-based allowance platform where parents set the rules
            and the smart contract enforces them — automatically.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {FEATURES.map(({ icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full">
                {icon} {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role selection ────────────────────────────────────── */}
      <section className="flex-1 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-6">

          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Who are you signing in as?
            </h2>
            <p className="text-gray-400 text-sm">
              Choose your role to open the right dashboard.
              No wallet required for the demo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {ROLES.map((r) => (
              <RoleCard
                key={r.key}
                role={r}
                loading={choosing === r.key}
                disabled={!!choosing}
                onSelect={() => handleRoleSelect(r.key)}
              />
            ))}
          </div>

          {/* Demo note */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-4 py-2.5 rounded-xl">
              <Zap size={13} />
              No MetaMask? Click either role — you'll enter Demo Mode with sample data instantly.
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works strip ────────────────────────────────── */}
      <section className="bg-white border-t border-gray-100 py-10">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
            How KidSafe works
          </p>
          <div className="grid sm:grid-cols-4 gap-6 text-center">
            {[
              { n: "01", t: "Parent signs in",    d: "Choose Parent role to open the control panel." },
              { n: "02", t: "Set allowance",       d: "Deposit mUSDC and set a daily spending cap." },
              { n: "03", t: "Whitelist stores",    d: "Add wallet addresses the child can pay." },
              { n: "04", t: "Child spends safely", d: "Every payment is checked by the contract." },
            ].map(({ n, t, d }) => (
              <div key={n}>
                <div className="w-9 h-9 rounded-2xl bg-brand/10 text-brand font-bold text-sm flex items-center justify-center mx-auto mb-3">{n}</div>
                <p className="font-semibold text-gray-800 text-sm mb-1">{t}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-navy-900 text-white/30 text-xs py-5">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-white/50">
            <Shield size={13} className="text-brand-accent" />
            <span className="font-bold">KidSafe</span>
            <span>· Smart Allowance. Safer Spending.</span>
          </div>
          <span>Hackathon MVP — test tokens only. Not for use with real funds.</span>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   RoleCard component
───────────────────────────────────────────────────────── */
function RoleCard({ role, loading, disabled, onSelect }) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`
        group w-full bg-white rounded-2xl border-2 border-gray-100 shadow-card
        p-7 text-left flex flex-col gap-5 transition-all duration-200
        ${role.border}
        hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light
      `}
      aria-label={role.cta}
    >
      {/* Icon */}
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.iconBg} flex items-center justify-center text-white shadow-md`}>
        {role.icon}
      </div>

      {/* Text */}
      <div className="flex-1">
        <h3 className="text-xl font-bold text-gray-900 mb-1">{role.title}</h3>
        <p className="text-gray-400 text-sm mb-4">{role.subtitle}</p>

        <ul className="space-y-2">
          {role.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
              <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm transition-all ${role.ctaCls}`}>
        {loading ? <LoadingSpinner size="sm" /> : (
          <>
            {role.cta}
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </>
        )}
      </div>
    </button>
  );
}
