import React from "react";
import { Gauge, Clock } from "lucide-react";
import { formatToken, dailyResetCountdown } from "@/utils/formatCurrency";
import LoadingSpinner from "./LoadingSpinner";

/**
 * SpendingLimitCard — daily limit + today's progress.
 *
 * Props:
 *   dailyLimit   bigint
 *   dailySpent   bigint
 *   loading      bool
 */
export default function SpendingLimitCard({ dailyLimit = 0n, dailySpent = 0n, loading = false }) {
  const pct = dailyLimit > 0n
    ? Math.min(100, Math.round((Number(dailySpent) / Number(dailyLimit)) * 100))
    : 0;
  const remaining = dailyLimit > dailySpent ? dailyLimit - dailySpent : 0n;
  const isNearLimit = pct >= 80;
  const isAtLimit   = pct >= 100;

  const barColor = isAtLimit
    ? "bg-red-500"
    : isNearLimit
    ? "bg-amber-400"
    : "bg-brand-accent";

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center
            ${isAtLimit ? "bg-red-50" : isNearLimit ? "bg-amber-50" : "bg-cyan-50"}`}>
            <Gauge size={18} className={isAtLimit ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-cyan-500"} aria-hidden />
          </div>
          <h3 className="section-title">Daily Spending Limit</h3>
        </div>
        {isAtLimit && <span className="badge-rejected">Limit Reached</span>}
        {isNearLimit && !isAtLimit && <span className="badge-pending">Near Limit</span>}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <LoadingSpinner size="lg" label="Loading…" />
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-1">
            <p className="amount-display text-gray-900">{formatToken(dailySpent)}</p>
            <p className="text-gray-400 text-sm font-medium">/ {formatToken(dailyLimit)}</p>
          </div>

          <div className="progress-track mt-3">
            <div
              className={`progress-fill ${barColor}`}
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${pct}% of daily limit used`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-400 font-medium">Spent today</p>
              <p className="text-sm font-bold text-gray-700 tabular-nums mt-0.5">
                {formatToken(dailySpent)}
              </p>
            </div>
            <div className={`rounded-xl px-3 py-2.5 ${isAtLimit ? "bg-red-50" : "bg-cyan-50"}`}>
              <p className={`text-xs font-medium ${isAtLimit ? "text-red-500" : "text-cyan-600"}`}>
                Remaining
              </p>
              <p className={`text-sm font-bold tabular-nums mt-0.5 ${isAtLimit ? "text-red-600" : "text-cyan-700"}`}>
                {isAtLimit ? "$0.00 mUSDC" : formatToken(remaining)}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
            <Clock size={12} aria-hidden /> Resets {dailyResetCountdown()}
          </p>
        </>
      )}
    </div>
  );
}
