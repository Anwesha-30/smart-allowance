import React from "react";
import { Coins, TrendingUp } from "lucide-react";
import { formatToken, formatPercent, toHuman } from "@/utils/formatCurrency";
import LoadingSpinner from "./LoadingSpinner";

/**
 * AllowanceCard — shows balance + radial-style progress bar.
 *
 * Props:
 *   balance    bigint   — remaining allowance (raw token units)
 *   total      bigint   — original allocated amount
 *   loading    bool
 */
export default function AllowanceCard({ balance = 0n, total = 0n, loading = false }) {
  const pct = total > 0n ? Math.round((Number(balance) / Number(total)) * 100) : 0;
  const spent = total > balance ? total - balance : 0n;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Coins size={18} className="text-brand-light" aria-hidden />
          </div>
          <h3 className="section-title">Allowance Balance</h3>
        </div>
        <span className="badge-info">{pct}% remaining</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <LoadingSpinner size="lg" label="Loading balance…" />
        </div>
      ) : (
        <>
          {/* Main value */}
          <p className="amount-display text-gray-900">{formatToken(balance)}</p>
          <p className="text-sm text-gray-400 mt-0.5">
            {formatToken(spent, { showSymbol: false })} spent of {formatToken(total)}
          </p>

          {/* Progress bar */}
          <div className="progress-track mt-4">
            <div
              className="progress-fill bg-brand-light"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${pct}% allowance remaining`}
            />
          </div>

          {/* Row of sub-stats */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-400 font-medium">Allocated</p>
              <p className="text-sm font-bold text-gray-700 tabular-nums mt-0.5">
                {formatToken(total)}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-emerald-600 font-medium">Remaining</p>
              <p className="text-sm font-bold text-emerald-700 tabular-nums mt-0.5">
                {formatToken(balance)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
