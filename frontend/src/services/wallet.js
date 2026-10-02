/**
 * wallet.js
 * ---------
 * Low-level MetaMask / window.ethereum helpers using viem.
 * These functions do NOT use React state — they are called by WalletContext.
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  formatEther,
} from "viem";
import { SUPPORTED_CHAIN_ID, CHAIN_CONFIG } from "@/utils/constants";

// ─── Build viem chain descriptor ─────────────────────────────────────────────
function buildChain(chainId) {
  const cfg = CHAIN_CONFIG[chainId];
  return {
    id: chainId,
    name: cfg?.name ?? `Chain ${chainId}`,
    nativeCurrency: { name: "Ether", symbol: cfg?.currency ?? "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [cfg?.rpcUrl ?? "http://127.0.0.1:8545"] },
      public:  { http: [cfg?.rpcUrl ?? "http://127.0.0.1:8545"] },
    },
    blockExplorers: cfg?.blockExplorer
      ? { default: { name: "Explorer", url: cfg.blockExplorer } }
      : undefined,
  };
}

// ─── Detect MetaMask ──────────────────────────────────────────────────────────
export function isMetaMaskInstalled() {
  return typeof window !== "undefined" && Boolean(window.ethereum?.isMetaMask);
}

// ─── Create clients ───────────────────────────────────────────────────────────
/**
 * Public client — read-only, uses RPC URL directly (no wallet needed).
 */
export function getPublicClient(chainId = SUPPORTED_CHAIN_ID) {
  const cfg = CHAIN_CONFIG[chainId];
  return createPublicClient({
    chain: buildChain(chainId),
    transport: http(cfg?.rpcUrl ?? "http://127.0.0.1:8545"),
  });
}

/**
 * Wallet client — wraps window.ethereum, used for sending transactions.
 */
export function getWalletClient(chainId = SUPPORTED_CHAIN_ID) {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed.");
  }
  return createWalletClient({
    chain: buildChain(chainId),
    transport: custom(window.ethereum),
  });
}

// ─── Connect wallet ───────────────────────────────────────────────────────────
/**
 * Request MetaMask account access.
 * Returns the first connected account address (lowercase).
 *
 * @returns {Promise<string>} account address
 */
export async function connectWallet() {
  if (!isMetaMaskInstalled()) {
    throw new Error(
      "MetaMask is not installed. Please install it from metamask.io."
    );
  }
  const client = getWalletClient();
  const [account] = await client.requestAddresses();
  return account.toLowerCase();
}

/**
 * Get already-connected accounts without prompting the user.
 * Returns [] if not connected.
 *
 * @returns {Promise<string[]>}
 */
export async function getConnectedAccounts() {
  if (!isMetaMaskInstalled()) return [];
  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    return accounts.map((a) => a.toLowerCase());
  } catch {
    return [];
  }
}

// ─── Network helpers ──────────────────────────────────────────────────────────
/**
 * Read the currently selected chain ID from MetaMask.
 *
 * @returns {Promise<number>}
 */
export async function getCurrentChainId() {
  if (!isMetaMaskInstalled()) return null;
  const hex = await window.ethereum.request({ method: "eth_chainId" });
  return parseInt(hex, 16);
}

/**
 * Ask MetaMask to switch to the supported chain.
 * If the chain is not yet added, it will be added automatically.
 *
 * @param {number} [chainId]
 */
export async function switchToSupportedChain(chainId = SUPPORTED_CHAIN_ID) {
  if (!isMetaMaskInstalled()) return;
  const hexId = `0x${chainId.toString(16)}`;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }],
    });
  } catch (err) {
    // Error 4902 = chain not yet added in MetaMask
    if (err.code === 4902) {
      const cfg = CHAIN_CONFIG[chainId];
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexId,
            chainName: cfg?.name ?? `Chain ${chainId}`,
            nativeCurrency: {
              name: "Ether",
              symbol: cfg?.currency ?? "ETH",
              decimals: 18,
            },
            rpcUrls: [cfg?.rpcUrl ?? "http://127.0.0.1:8545"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

// ─── ETH balance ──────────────────────────────────────────────────────────────
/**
 * Return the ETH balance of an address as a formatted string.
 *
 * @param {string} address
 * @returns {Promise<string>}  e.g. "1.234"
 */
export async function getEthBalance(address, chainId = SUPPORTED_CHAIN_ID) {
  const client = getPublicClient(chainId);
  const balance = await client.getBalance({ address });
  return formatEther(balance);
}

// ─── Parse contract errors ────────────────────────────────────────────────────
/**
 * Extract a human-readable message from a viem / MetaMask error.
 * Handles custom Solidity errors, user rejection, and generic messages.
 *
 * @param {Error} err
 * @returns {string}
 */
export function parseContractError(err) {
  if (!err) return "Unknown error";

  // User rejected in MetaMask
  if (err.code === 4001 || err.message?.includes("User rejected")) {
    return "Transaction cancelled by user.";
  }

  // Map custom Solidity errors to friendly messages
  const errorMap = {
    NotRegistered:          "Child wallet is not registered.",
    AlreadyRegistered:      "This wallet is already registered as a child.",
    NotParent:              "Only the registered parent can perform this action.",
    NotChild:               "Only the registered child can perform this action.",
    RecipientNotApproved:   "Recipient is not on the approved list.",
    InsufficientAllowance:  "Insufficient allowance balance.",
    DailyLimitExceeded:     "Daily spending limit would be exceeded.",
    InvalidAmount:          "Amount must be greater than zero.",
    InvalidAddress:         "Invalid wallet address.",
    RequestNotPending:      "This request is no longer pending.",
    NotRequestOwner:        "You did not create this request.",
  };

  for (const [key, msg] of Object.entries(errorMap)) {
    if (err.message?.includes(key) || err.name?.includes(key)) {
      return msg;
    }
  }

  // viem / ethers short message
  if (err.shortMessage) return err.shortMessage;

  // Fallback to raw message, truncated
  return err.message?.slice(0, 120) ?? "Transaction failed.";
}
