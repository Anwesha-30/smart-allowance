import React from "react";
import { X, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { formatToken, formatTimestamp } from "@/utils/formatCurrency";
import { shortenAddress } from "@/utils/formatAddress";
import { RequestStatusBadge } from "./TransactionStatus";
import { useKidSafe } from "@/hooks/useKidSafe";
import LoadingSpinner from "./LoadingSpinner";

/**
 * ApprovalModal — parent reviews and approves or rejects a spending request.
 *
 * Props:
 *   isOpen    bool
 *   onClose   () => void
 *   request   SpendingRequest object
 *   onUpdate  () => void  — refetch after action
 */
export default function ApprovalModal({ isOpen, onClose, request, onUpdate }) {
  const { approveRequest, rejectRequest, loading } = useKidSafe();

  if (!isOpen || !request) return null;

  const isActing = loading[`approve_${request.id}`] || loading[`reject_${request.id}`];

  async function handleApprove() {
    await approveRequest(request.id, () => {
      onUpdate?.();
      onClose();
    });
  }

  async function handleReject() {
    await rejectRequest(request.id, () => {
      onUpdate?.();
      onClose();
    });
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="approval-modal-title">
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 id="approval-modal-title" className="text-lg font-bold text-gray-900">
            Spending Request
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Request details */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</span>
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {formatToken(request.amount)}
            </span>
          </div>
          <div className="divider !my-0" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Recipient</span>
            <span className="font-mono text-gray-700">{shortenAddress(request.recipient, 8)}</span>
          </div>
          {request.memo && (
            <div className="flex items-start justify-between text-sm gap-4">
              <span className="text-gray-500 flex-shrink-0">Memo</span>
              <span className="text-gray-700 text-right">{request.memo}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Submitted</span>
            <span className="text-gray-600">{formatTimestamp(request.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Status</span>
            <RequestStatusBadge status={request.status} />
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-3 mb-5">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" aria-hidden />
          Approving will immediately transfer {formatToken(request.amount)} to the recipient.
          This action cannot be undone.
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={isActing}
            className="btn-danger flex-1"
            aria-label="Reject this spending request"
          >
            {loading[`reject_${request.id}`] ? <LoadingSpinner size="sm" /> : <XCircle size={16} />}
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={isActing}
            className="btn-primary flex-1"
            aria-label="Approve this spending request"
          >
            {loading[`approve_${request.id}`] ? <LoadingSpinner size="sm" /> : <CheckCircle2 size={16} />}
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
