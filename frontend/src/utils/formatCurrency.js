import { TOKEN_DECIMALS, TOKEN_SYMBOL } from "./constants";

/**
 * Convert a raw token BigInt (6 decimals) to a human-readable number.
 * e.g. 100_000_000n → 100.00
 *
 * @param {bigint|string|number} raw  Raw token amount in smallest unit.
 * @returns {number}
 */
export function toHuman(raw) {
  if (raw === undefined || raw === null) return 0;
  return Number(BigInt(raw)) / Math.pow(10, TOKEN_DECIMALS);
}

/**
 * Convert a human-readable amount to raw token BigInt.
 * e.g. 100 → 100_000_000n
 *
 * @param {number|string} human  Human-readable amount (e.g. 12.50)
 * @returns {bigint}
 */
export function toRaw(human) {
  if (!human) return 0n;
  // Multiply by 10^6, rounding to avoid floating-point drift
  const scaled = Math.round(Number(human) * Math.pow(10, TOKEN_DECIMALS));
  return BigInt(scaled);
}

/**
 * Format a raw token amount as a USD-style string with the token symbol.
 * e.g. 100_000_000n → "$100.00 mUSDC"
 *
 * @param {bigint|string|number} raw
 * @param {object} options
 * @param {boolean} [options.showSymbol=true]  Include token symbol suffix.
 * @param {boolean} [options.showSign=false]   Prefix positive values with "+".
 * @param {number}  [options.decimals=2]       Decimal places to show.
 * @returns {string}
 */
export function formatToken(raw, { showSymbol = true, showSign = false, decimals = 2 } = {}) {
  const value = toHuman(raw);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));

  const sign = showSign && value > 0 ? "+" : value < 0 ? "-" : "";
  const symbol = showSymbol ? ` ${TOKEN_SYMBOL}` : "";
  return `${sign}$${formatted}${symbol}`;
}

/**
 * Format as compact USD (no symbol), useful for chart axes.
 * e.g. 1_500_000_000n → "$1.5K"
 *
 * @param {bigint|string|number} raw
 * @returns {string}
 */
export function formatTokenCompact(raw) {
  const value = toHuman(raw);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Return a percentage string (0–100) given a numerator and denominator (both raw).
 * Safely returns "0%" if denominator is zero.
 *
 * @param {bigint|number} numerator
 * @param {bigint|number} denominator
 * @returns {string}
 */
export function formatPercent(numerator, denominator) {
  const d = Number(denominator);
  if (!d) return "0%";
  const pct = (Number(numerator) / d) * 100;
  return `${Math.min(100, Math.round(pct))}%`;
}

/**
 * Format a Unix timestamp (seconds) as a readable date/time string.
 * e.g. 1712345678 → "Apr 5, 2024, 3:14 PM"
 *
 * @param {number|bigint} timestamp  Unix seconds.
 * @returns {string}
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return "—";
  const ms = Number(timestamp) * 1000;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

/**
 * Format a Unix timestamp as a short date only.
 * e.g. 1712345678 → "Apr 5, 2024"
 *
 * @param {number|bigint} timestamp
 * @returns {string}
 */
export function formatDate(timestamp) {
  if (!timestamp) return "—";
  const ms = Number(timestamp) * 1000;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

/**
 * Return the next UTC midnight timestamp in seconds from now.
 * Used to display "daily limit resets in X hours".
 *
 * @returns {string}  e.g. "in 4h 32m"
 */
export function dailyResetCountdown() {
  const now = Date.now();
  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - now;
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  return `in ${h}h ${m}m`;
}
