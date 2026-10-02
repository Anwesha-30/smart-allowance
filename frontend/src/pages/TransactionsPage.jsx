import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Download, RefreshCw, ArrowDownUp,
  ExternalLink, Inbox, CheckCircle2, XCircle, Clock,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { RequestStatusBadge, TxStatusBadge } from "@/components/TransactionStatus";
import ApprovalModal from "@/components/ApprovalModal";
import LoadingSpinner from "@/components/LoadingSpinner";

import { useWallet } from "@/hooks/useWallet";
import { useAllowance } from "@/hooks/useAllowance";
import { formatToken, formatTimestamp } from "@/utils/formatCurrency";
import { shortenAddress, txUrl } from "@/utils/formatAddress";
import { MOCK_CHILD_ADDRESS } from "@/services/mockData";
import { RequestStatus, CHAIN_CONFIG, SUPPORTED_CHAIN_ID } from "@/utils/constants";

const TX_FILTERS  = ["All", "Success", "Rejected", "Pending"];
const REQ_FILTERS = [
  { key: "all",      label: "All"      },
  { key: "pending",  label: "Pending"  },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const explorerBase = CHAIN_CONFIG[SUPPORTED_CHAIN_ID]?.blockExplorer ?? null;

export default function TransactionsPage({ mode = "parent" }) {
  const navigate = useNavigate();
  const { account, isDemoMode } = useWallet();
  const childAddress = isDemoMode ? MOCK_CHILD_ADDRESS : account;

  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [txFilter,       setTxFilter]       = useState("All");
  const [reqFilter,      setReqFilter]      = useState("all");
  const [approvalTarget, setApprovalTarget] = useState(null);

  const { transactions, requests, loading, demoMode, refetch } = useAllowance(childAddress);

  const filteredTx = transactions.filter((tx) => {
    if (txFilter === "Success")  return tx.status === "success";
    if (txFilter === "Rejected") return tx.status === "rejected";
    if (txFilter === "Pending")  return tx.status === "pending";
    return true;
  });

  const filteredReqs = requests.filter((r) => {
    if (reqFilter === "pending")  return r.status === RequestStatus.Pending;
    if (reqFilter === "approved") return r.status === RequestStatus.Approved;
    if (reqFilter === "rejected") return r.status === RequestStatus.Rejected;
    return true;
  });

  function exportCSV() {
    const rows = [
      ["Date", "Type", "Recipient", "Amount", "Status", "Tx Hash"],
      ...transactions.map((tx) => [
        formatTimestamp(tx.timestamp), tx.type, tx.recipient,
        formatToken(tx.amount, { showSymbol: false }), tx.status, tx.txHash ?? "",
      ]),
    ];
    const csv  = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "kidsafe-transactions.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const successCount  = transactions.filter((t) => t.status === "success").length;
  const rejectedCount = transactions.filter((t) => t.status === "rejected").length;
  const pendingCount  = requests.filter((r) => r.status === RequestStatus.Pending).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setSidebarOpen((o) => !o)} sidebarOpen={sidebarOpen} />
      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} mode={mode} />

        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(mode === "parent" ? "/parent" : "/child")} className="btn-ghost p-2" aria-label="Back">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {demoMode ? "Demo data — simulated" : "Live on-chain events"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={refetch} className="btn-ghost" disabled={loading} aria-label="Refresh">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              <button onClick={exportCSV} className="btn-secondary" disabled={transactions.length === 0}>
                <Download size={15} /> Export CSV
              </button>
            </div>
          </div>

          {/* Summary chips */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card py-5 flex flex-col items-center gap-1.5">
              <CheckCircle2 size={22} className="text-emerald-500" />
              <p className="text-2xl font-bold tabular-nums text-gray-900">{successCount}</p>
              <p className="text-xs text-gray-400 font-medium">Successful</p>
            </div>
            <div className="card py-5 flex flex-col items-center gap-1.5">
              <XCircle size={22} className="text-red-500" />
              <p className="text-2xl font-bold tabular-nums text-gray-900">{rejectedCount}</p>
              <p className="text-xs text-gray-400 font-medium">Rejected</p>
            </div>
            <div className="card py-5 flex flex-col items-center gap-1.5">
              <Clock size={22} className="text-amber-500" />
              <p className="text-2xl font-bold tabular-nums text-gray-900">{pendingCount}</p>
              <p className="text-xs text-gray-400 font-medium">Pending</p>
            </div>
          </div>

          {/* ── Payments table ──────────────────────────────── */}
          <div className="card mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <ArrowDownUp size={17} className="text-brand-light" />
                <h3 className="section-title">Payments</h3>
                {demoMode && <span className="badge-info text-xs">Demo</span>}
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1" role="tablist" aria-label="Filter payments">
                {TX_FILTERS.map((f) => (
                  <button key={f} role="tab" aria-selected={txFilter === f} onClick={() => setTxFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${txFilter === f ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><LoadingSpinner size="lg" label="Loading…" /></div>
            ) : filteredTx.length === 0 ? (
              <div className="empty-state">
                <Inbox size={32} className="text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium">No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm min-w-[640px]" aria-label="Payment transactions">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Date & Time", "Type", "Recipient", "Amount", "Status", "Transaction Hash"].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4 last:pr-0 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTx.map((tx, i) => (
                      <tr key={tx.txHash ?? i} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 pr-4 text-gray-500 text-xs whitespace-nowrap">{formatTimestamp(tx.timestamp)}</td>
                        <td className="py-3 pr-4">
                          <span className="font-medium text-gray-700">{tx.type}</span>
                          {tx.label && <p className="text-xs text-gray-400">{tx.label}</p>}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-gray-500">{shortenAddress(tx.recipient)}</td>
                        <td className="py-3 pr-4 font-bold tabular-nums text-gray-900 whitespace-nowrap">{formatToken(tx.amount)}</td>
                        <td className="py-3 pr-4"><TxStatusBadge status={tx.status} /></td>
                        <td className="py-3">
                          {tx.txHash ? (
                            <a href={txUrl(tx.txHash, explorerBase)} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-brand-light transition-colors font-mono">
                              {shortenAddress(tx.txHash, 4)} <ExternalLink size={11} />
                            </a>
                          ) : <span className="text-gray-200 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Requests table ──────────────────────────────── */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <Clock size={17} className="text-brand-light" />
                <h3 className="section-title">Spending Requests</h3>
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1" role="tablist" aria-label="Filter requests">
                {REQ_FILTERS.map(({ key, label }) => (
                  <button key={key} role="tab" aria-selected={reqFilter === key} onClick={() => setReqFilter(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${reqFilter === key ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><LoadingSpinner size="lg" label="Loading…" /></div>
            ) : filteredReqs.length === 0 ? (
              <div className="empty-state">
                <Clock size={32} className="text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium">No requests found</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm min-w-[600px]" aria-label="Spending requests">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Submitted", "Recipient", "Amount", "Memo", "Status", mode === "parent" ? "Action" : ""].filter(Boolean).map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4 last:pr-0 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredReqs.map((req) => (
                      <tr key={String(req.id)} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 pr-4 text-gray-500 text-xs whitespace-nowrap">{formatTimestamp(req.createdAt)}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-gray-500">{shortenAddress(req.recipient)}</td>
                        <td className="py-3 pr-4 font-bold tabular-nums text-gray-900 whitespace-nowrap">{formatToken(req.amount)}</td>
                        <td className="py-3 pr-4 text-gray-500 text-xs max-w-[140px] truncate">{req.memo || "—"}</td>
                        <td className="py-3 pr-4"><RequestStatusBadge status={req.status} /></td>
                        {mode === "parent" && (
                          <td className="py-3">
                            {req.status === RequestStatus.Pending ? (
                              <button onClick={() => setApprovalTarget(req)} className="btn-secondary text-xs px-3 py-1.5">
                                Review
                              </button>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      <ApprovalModal
        isOpen={!!approvalTarget}
        request={approvalTarget}
        onClose={() => setApprovalTarget(null)}
        onUpdate={refetch}
      />
    </div>
  );
}
