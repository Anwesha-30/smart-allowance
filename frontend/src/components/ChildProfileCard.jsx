import React, { useState } from "react";
import { Baby, Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { shortenAddress } from "@/utils/formatAddress";
import { formatToken } from "@/utils/formatCurrency";
import LoadingSpinner from "./LoadingSpinner";

/**
 * ChildProfileCard — shows the registered child's address and key stats.
 *
 * Props:
 *   childAddress   string
 *   childDetails   object  — from useAllowance
 *   loading        bool
 */
export default function ChildProfileCard({ childAddress, childDetails, loading = false }) {
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    if (!childAddress) return;
    navigator.clipboard.writeText(childAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-cyan-50 flex items-center justify-center">
          <Baby size={20} className="text-cyan-600" aria-hidden />
        </div>
        <div>
          <h3 className="section-title">Child Profile</h3>
          <p className="text-xs text-gray-400">Registered wallet</p>
        </div>
        {childDetails?.registered && (
          <span className="ml-auto badge-success">
            <CheckCircle2 size={11} aria-hidden /> Active
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <LoadingSpinner size="md" />
        </div>
      ) : !childAddress ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No child registered yet.
        </p>
      ) : (
        <>
          {/* Address row */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
            <span className="font-mono text-sm text-gray-700 flex-1 truncate" title={childAddress}>
              {shortenAddress(childAddress, 8)}
            </span>
            <button
              onClick={copyAddress}
              className="text-gray-400 hover:text-brand transition-colors flex-shrink-0"
              aria-label="Copy child address"
            >
              {copied ? <CheckCircle2 size={15} className="text-emerald-500" /> : <Copy size={15} />}
            </button>
          </div>

          {/* Stats grid */}
          {childDetails && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400 font-medium">Balance</p>
                <p className="text-sm font-bold text-gray-800 tabular-nums mt-0.5">
                  {formatToken(childDetails.allowanceBalance)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400 font-medium">Daily Limit</p>
                <p className="text-sm font-bold text-gray-800 tabular-nums mt-0.5">
                  {formatToken(childDetails.dailyLimit)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400 font-medium">Spent Today</p>
                <p className="text-sm font-bold text-gray-800 tabular-nums mt-0.5">
                  {formatToken(childDetails.dailySpent)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400 font-medium">Parent</p>
                <p className="text-xs font-mono text-gray-600 mt-0.5 truncate">
                  {shortenAddress(childDetails.parent)}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
