import React, { useState } from "react";
import { ExternalLink, ArrowDownUp, Inbox } from "lucide-react";
import { formatToken, formatTimestamp } from "@/utils/formatCurrency";
import { shortenAddress, txUrl } from "@/utils/formatAddress";
import { TxStatusBadge } from "./TransactionStatus";
import LoadingSpinner from "./LoadingSpinner";
import { CHAIN_CONFIG, SUPPORTED_CHAIN_ID } from "@/utils/constants";

const FILTERS = ["All", "Success", "Rejected", "Pending"];

const explorerBase = CHAIN_CONFIG[SUPPORTED_CHAIN_ID]?.blockExplorer ?? null;

/**
 * TransactionTable — filterable list of payment events.
 *
 * Props:
 *   transactions  array   — from useAllowance or mockData
 *   loading       bool
 *   demoMode      bool
 *   title         string
 */
export default function TransactionTable({
  transactions = [],
  loading = false,
  demoMode = false,
  title = "Transaction History",
}) {
  const [filter, setFilter] = useState("All");

  const filtered = transactions.filter((tx) => {
    if (filter === "All")      return true;
    if (filter === "Success")  return tx.status === "success";
    if (filter === "Rejected") return tx.status === "rejected";
    if (filter === "Pending")  return tx.status === "pending";
    return true;
  });

  return (
    <div className="card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <ArrowDownUp size={18} className="text-brand-light" aria-hidden />
          <h3 className="section-title">{title}</h3>
          {demoMode && <span className="badge-info text-xs">Demo data</span>}
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1" role="tablist" aria-label="Filter transactions">
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f
                  ? "bg-white text-brand shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" label="Loading transactions…" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Inbox size={36} className="text-gray-300 mb-3" aria-hidden />
          <p className="text-gray-400 font-medium">No transactions yet</p>
          <p className="text-gray-300 text-sm mt-1">Payments will appear here once made.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm" aria-label="Transactions">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3">Date</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3">Type</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 hidden sm:table-cell">Recipient</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3">Amount</th>
                <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3">Status</th>
                <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 hidden md:table-cell">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((tx, i) => (
                <tr key={tx.txHash ?? i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                    {formatTimestamp(tx.timestamp)}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-medium text-gray-700">{tx.type}</span>
                    {tx.label && (
                      <p className="text-xs text-gray-400">{tx.label}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell font-mono text-gray-500 text-xs">
                    {shortenAddress(tx.recipient)}
                  </td>
                  <td className="py-3 pr-4 text-right font-bold tabular-nums text-gray-900">
                    {formatToken(tx.amount)}
                  </td>
                  <td className="py-3 text-center">
                    <TxStatusBadge status={tx.status} />
                  </td>
                  <td className="py-3 text-center hidden md:table-cell">
                    {tx.txHash && tx.txHash !== null ? (
                      <a
                        href={txUrl(tx.txHash, explorerBase)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-brand-light transition-colors inline-flex"
                        aria-label={`View transaction ${shortenAddress(tx.txHash)}`}
                      >
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="text-gray-200">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
