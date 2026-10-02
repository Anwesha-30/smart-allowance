import React, { useState } from "react";
import { ShieldCheck, Trash2, Plus, AlertCircle } from "lucide-react";
import { shortenAddress, isValidAddress } from "@/utils/formatAddress";
import { useKidSafe } from "@/hooks/useKidSafe";
import LoadingSpinner from "./LoadingSpinner";

/**
 * WhitelistManager — add/remove approved recipient addresses.
 *
 * Props:
 *   childAddress         string
 *   approvedRecipients   string[]
 *   loading              bool
 *   onUpdate             () => void   — call after add/remove to refetch
 */
export default function WhitelistManager({
  childAddress,
  approvedRecipients = [],
  loading = false,
  onUpdate,
}) {
  const [newAddress, setNewAddress]   = useState("");
  const [inputError, setInputError]   = useState("");
  const { addApprovedRecipient, removeApprovedRecipient, loading: txLoading } = useKidSafe();

  function validateAndSet(value) {
    setNewAddress(value);
    if (value && !isValidAddress(value)) {
      setInputError("Invalid Ethereum address.");
    } else {
      setInputError("");
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!isValidAddress(newAddress)) {
      setInputError("Enter a valid 0x address.");
      return;
    }
    if (approvedRecipients.map(a => a.toLowerCase()).includes(newAddress.toLowerCase())) {
      setInputError("Address is already whitelisted.");
      return;
    }
    await addApprovedRecipient(childAddress, newAddress, () => {
      setNewAddress("");
      onUpdate?.();
    });
  }

  async function handleRemove(address) {
    await removeApprovedRecipient(childAddress, address, () => {
      onUpdate?.();
    });
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <ShieldCheck size={18} className="text-emerald-600" aria-hidden />
        </div>
        <h3 className="section-title">Approved Recipients</h3>
        <span className="ml-auto text-xs font-semibold text-gray-400">
          {approvedRecipients.length} address{approvedRecipients.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <div className="flex-1">
          <input
            type="text"
            value={newAddress}
            onChange={(e) => validateAndSet(e.target.value)}
            placeholder="0x… recipient address"
            className={`input font-mono text-xs ${inputError ? "border-red-300 focus:border-red-400 focus:ring-red-200" : ""}`}
            aria-label="New approved recipient address"
            aria-invalid={!!inputError}
            aria-describedby={inputError ? "whitelist-error" : undefined}
            disabled={txLoading.addRecipient}
          />
          {inputError && (
            <p id="whitelist-error" className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle size={11} aria-hidden /> {inputError}
            </p>
          )}
        </div>
        <button
          type="submit"
          className="btn-primary flex-shrink-0"
          disabled={!newAddress || !!inputError || txLoading.addRecipient}
          aria-label="Add approved recipient"
        >
          {txLoading.addRecipient ? <LoadingSpinner size="sm" /> : <Plus size={16} />}
          Add
        </button>
      </form>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-6">
          <LoadingSpinner size="md" />
        </div>
      ) : approvedRecipients.length === 0 ? (
        <div className="empty-state py-8">
          <ShieldCheck size={28} className="text-gray-200 mb-2" aria-hidden />
          <p className="text-gray-400 text-sm font-medium">No approved recipients yet.</p>
          <p className="text-gray-300 text-xs mt-1">Add an address above to allow payments.</p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Approved recipient list">
          {approvedRecipients.map((addr) => (
            <li
              key={addr}
              className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" aria-hidden />
                <span
                  className="font-mono text-xs text-gray-700 truncate"
                  title={addr}
                >
                  {shortenAddress(addr, 10)}
                </span>
              </div>
              <button
                onClick={() => handleRemove(addr)}
                disabled={txLoading.removeRecipient}
                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                aria-label={`Remove ${shortenAddress(addr)} from whitelist`}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
