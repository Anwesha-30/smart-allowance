import { TRUNCATE_LENGTH } from "./constants";

/**
 * Shorten an Ethereum address for display.
 * e.g. "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" → "0xd8dA…6045"
 *
 * @param {string} address   Full hex address.
 * @param {number} [chars]   Characters to show on each side (default: TRUNCATE_LENGTH = 6).
 * @returns {string}
 */
export function shortenAddress(address, chars = TRUNCATE_LENGTH) {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/**
 * Normalise an address to lowercase for comparisons.
 * Safely handles undefined/null.
 *
 * @param {string} address
 * @returns {string}
 */
export function normaliseAddress(address) {
  return (address ?? "").toLowerCase();
}

/**
 * Returns true if two addresses are the same (case-insensitive).
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function isSameAddress(a, b) {
  return normaliseAddress(a) === normaliseAddress(b);
}

/**
 * Returns true if the string looks like a valid Ethereum address.
 * Accepts mixed-case (checksummed) or lowercase.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isValidAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(value ?? "");
}

/**
 * Format an address for display with a fallback label.
 *
 * @param {string} address
 * @param {string} [fallback="Unknown"]
 * @returns {string}
 */
export function displayAddress(address, fallback = "Unknown") {
  if (!address || !isValidAddress(address)) return fallback;
  return shortenAddress(address);
}

/**
 * Return a block-explorer URL for a transaction hash.
 * Falls back to "#" when no explorer is configured (local network).
 *
 * @param {string} txHash
 * @param {string|null} [explorerBase]  e.g. "https://sepolia.etherscan.io"
 * @returns {string}
 */
export function txUrl(txHash, explorerBase = null) {
  if (!explorerBase || !txHash) return "#";
  return `${explorerBase}/tx/${txHash}`;
}

/**
 * Return a block-explorer URL for an address.
 *
 * @param {string} address
 * @param {string|null} [explorerBase]
 * @returns {string}
 */
export function addressUrl(address, explorerBase = null) {
  if (!explorerBase || !address) return "#";
  return `${explorerBase}/address/${address}`;
}
