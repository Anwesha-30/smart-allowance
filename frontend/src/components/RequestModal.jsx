import React, { useState } from "react";
import { X, Send, AlertCircle, Info } from "lucide-react";
import { isValidAddress, shortenAddress } from "@/utils/formatAddress";
import { formatToken, toHuman } from "@/utils/formatCurrency";
import { MAX_MEMO_LENGTH } from "@/utils/constants";
import { useKidSafe } from "@/hooks/useKidSafe";
import LoadingSpinner from "./LoadingSpinner";

/**
 * RequestModal — child submits a payment request or direct payment.
 *
 * Props:
 *   isOpen              bool
 *   onClose             () => void
 *   approvedRecipients  string[]
 *   allowanceBalance    bigint
 *   dailyLimit          bigint
 *   dailySpent          bigint
 *   mode                "direct" | "request"
 *   onSuccess           () => void
 */
export default function RequestModal({
  isOpen,
  onClose,
  approvedRecipients = [],
  allowanceBalance = 0n,
  dailyLimit = 0n,
  dailySpent = 0n,
  mode = "request",
  onSuccess,
}) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount]       = useState("");
  const [memo, setMemo]           = useState("");
  const { makePayment, requestPayment, loading } = useKidSafe();

  const isDirect = mode === "direct";

  // ── Validation ──────────────────────────────────────────────────────────────
  const amountNum = parseFloat(amount) || 0;
  const amountRaw = BigInt(Math.round(amountNum * 1_000_000));

  const remaining = dailyLimit > 0n ? dailyLimit - dailySpent : allowanceBalance;

  const errors = [];
  if (recipient && !isValidAddress(recipient))
    errors.push("Invalid recipient address.");
  if (recipient && !approvedRecipients.map(a => a.toLowerCase()).includes(recipient.toLowerCase()))
    errors.push("Recipient is not on the approved list.");
  if (amountNum <= 0)
    errors.push("Amount must be greater than $0.");
  if (amountRaw > allowanceBalance)
    errors.push("Exceeds available allowance.");
  if (isDirect && dailyLimit > 0n && amountRaw > remaining)
    errors.push(`Exceeds today's remaining daily limit (${formatToken(remaining)}).`);

  const canSubmit = recipient && amountNum > 0 && errors.length === 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    const action = isDirect
      ? makePayment(recipient, amountNum, handleSuccess)
      : requestPayment(recipient, amountNum, memo, handleSuccess);
    await action;
  }

  function handleSuccess() {
    setRecipient("");
    setAmount("");
    setMemo("");
    onSuccess?.();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="req-modal-title">
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 id="req-modal-title" className="text-lg font-bold text-gray-900">
            {isDirect ? "Send Payment" : "Request Payment"}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Balance info */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1 bg-blue-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-blue-600 font-medium">Available</p>
            <p className="text-sm font-bold text-blue-800 tabular-nums">{formatToken(allowanceBalance)}</p>
          </div>
          {dailyLimit > 0n && (
            <div className="flex-1 bg-cyan-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-cyan-600 font-medium">Daily Remaining</p>
              <p className="text-sm font-bold text-cyan-800 tabular-nums">{formatToken(remaining)}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipient */}
          <div>
            <label htmlFor="req-recipient" className="input-label">Recipient Address</label>
            {approvedRecipients.length > 0 ? (
              <select
                id="req-recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="input"
                required
              >
                <option value="">Select approved recipient…</option>
                {approvedRecipients.map((addr) => (
                  <option key={addr} value={addr}>
                    {shortenAddress(addr, 10)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="req-recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x…"
                className="input font-mono text-xs"
                required
              />
            )}
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="req-amount" className="input-label">Amount (mUSDC)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">$</span>
              <input
                id="req-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input pl-8 tabular-nums"
                required
              />
            </div>
          </div>

          {/* Memo (request mode only) */}
          {!isDirect && (
            <div>
              <label htmlFor="req-memo" className="input-label">
                Memo <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="req-memo"
                type="text"
                maxLength={MAX_MEMO_LENGTH}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="What is this payment for?"
                className="input"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{memo.length}/{MAX_MEMO_LENGTH}</p>
            </div>
          )}

          {/* Validation errors */}
          {errors.length > 0 && amount && recipient && (
            <ul className="space-y-1" aria-live="polite">
              {errors.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle size={12} className="mt-0.5 flex-shrink-0" aria-hidden />
                  {e}
                </li>
              ))}
            </ul>
          )}

          {/* Info */}
          {!isDirect && (
            <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5">
              <Info size={13} className="mt-0.5 flex-shrink-0 text-brand-light" aria-hidden />
              Your parent must approve this request before the payment is sent.
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={!canSubmit || loading.makePayment || loading.requestPayment}
            >
              {loading.makePayment || loading.requestPayment
                ? <LoadingSpinner size="sm" />
                : <Send size={15} />}
              {isDirect ? "Send Payment" : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
