import React from "react";
import LoadingSpinner from "./LoadingSpinner";

/**
 * StatCard — a single KPI tile used across both dashboards.
 *
 * Props:
 *   title       string   — label above the value
 *   value       string   — primary display value
 *   subtitle    string   — smaller text below value (optional)
 *   icon        element  — Lucide icon node
 *   iconBg      string   — Tailwind bg class for icon container
 *   iconColor   string   — Tailwind text class for icon
 *   trend       number   — positive/negative percent change (optional)
 *   loading     bool
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg   = "bg-blue-50",
  iconColor = "text-brand-light",
  trend,
  loading = false,
}) {
  return (
    <div className="card flex items-start gap-4">
      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <span className={iconColor} aria-hidden>{icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
        {loading ? (
          <div className="mt-2">
            <LoadingSpinner size="sm" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-gray-900 tabular-nums leading-tight mt-0.5">
              {value ?? "—"}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>
            )}
          </>
        )}
      </div>

      {/* Trend badge */}
      {!loading && trend !== undefined && (
        <div className={`text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0
          ${trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
          {trend >= 0 ? "+" : ""}{trend}%
        </div>
      )}
    </div>
  );
}
