import React from "react";
import { CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";
import { RequestStatus } from "@/utils/constants";

const STATUS_CONFIG = {
  success:  { label: "Success",  cls: "badge-success",  Icon: CheckCircle2 },
  rejected: { label: "Rejected", cls: "badge-rejected", Icon: XCircle      },
  pending:  { label: "Pending",  cls: "badge-pending",  Icon: Clock        },
};

const REQUEST_CONFIG = {
  [RequestStatus.Pending]:  { label: "Pending",  cls: "badge-pending",  Icon: Clock        },
  [RequestStatus.Approved]: { label: "Approved", cls: "badge-success",  Icon: CheckCircle2 },
  [RequestStatus.Rejected]: { label: "Rejected", cls: "badge-rejected", Icon: XCircle      },
};

/** Badge for a transaction (success / rejected / pending) */
export function TxStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={cfg.cls}>
      <cfg.Icon size={11} aria-hidden />
      {cfg.label}
    </span>
  );
}

/** Badge for a spending request (Pending / Approved / Rejected) */
export function RequestStatusBadge({ status }) {
  const cfg = REQUEST_CONFIG[status] ?? REQUEST_CONFIG[RequestStatus.Pending];
  return (
    <span className={cfg.cls}>
      <cfg.Icon size={11} aria-hidden />
      {cfg.label}
    </span>
  );
}

/** Inline result message shown after a payment attempt */
export function PaymentResultMessage({ result }) {
  if (!result) return null;

  if (result.success) {
    return (
      <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm font-medium" role="alert">
        <CheckCircle2 size={16} aria-hidden />
        Payment successful!
      </div>
    );
  }

  const messages = {
    DailyLimitExceeded:    "Daily spending limit exceeded.",
    RecipientNotApproved:  "Recipient is not on the approved list.",
    InsufficientAllowance: "Insufficient allowance balance.",
    RequestNotPending:     "This request is no longer pending.",
    cancelled:             "Transaction cancelled.",
  };

  const msg = messages[result.error] ?? result.error ?? "Transaction failed.";

  return (
    <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm font-medium" role="alert">
      <XCircle size={16} aria-hidden />
      {msg}
    </div>
  );
}
