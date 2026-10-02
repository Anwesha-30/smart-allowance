# KidSafe — Hackathon Demo Script

**Time budget:** 5–8 minutes  
**Audience:** Judges, general hackathon attendees  
**Goal:** Show the complete parent-to-child allowance and payment flow live.

---

## Pre-Demo Checklist (complete before you present)

- [ ] `npx hardhat node` is running in a terminal (keep it open)
- [ ] Contracts deployed: `npx hardhat run scripts/deploy.js --network localhost`
- [ ] Demo data seeded: `npx hardhat run scripts/seedDemo.js --network localhost`
- [ ] `frontend/.env` has the correct contract addresses from the deploy output
- [ ] `npm run dev` is running in the `frontend/` folder
- [ ] Browser open at `http://localhost:5173`
- [ ] MetaMask installed; **two accounts imported** from the Hardhat node output:
  - **Account 0** → Parent
  - **Account 1** → Child
- [ ] MetaMask network set to **Hardhat Local** (Chain ID 31337, RPC `http://127.0.0.1:8545`)
- [ ] Both accounts have ETH (Hardhat gives 10,000 ETH each by default)

---

## Demo Flow

### Step 1 — Landing Page (30 seconds)

> "KidSafe is a blockchain-based allowance platform. Parents set spending limits and approved
> stores in a smart contract — the child can only pay within those rules."

- Show the landing page hero and the "How It Works" section.
- Point out the **Connect Wallet** button.

---

### Step 2 — Parent connects and opens the dashboard (1 minute)

1. Click **Connect Wallet** with MetaMask on **Account 0** (parent).
2. MetaMask pops up — approve.
3. You land on the **Parent Dashboard**.

> "The parent dashboard shows the child's balance, daily spending, and any pending payment requests."

- Point out the four stat cards: Total Allocated, Child's Balance, Spent Today, Pending Requests.
- The seed script already registered a child and deposited **$500 mUSDC**.

---

### Step 3 — Show the whitelist (30 seconds)

- Scroll to the **Approved Recipients** panel.
- Three addresses are already whitelisted: School Store, Bookshop, Lunch Canteen.

> "The parent controls exactly who the child can pay. The contract rejects any payment
> to an address that's not on this list."

---

### Step 4 — Show transaction history (30 seconds)

- Scroll to **Recent Transactions**.
- Three existing payments from the seed script are visible.

> "Every payment is recorded as a blockchain event — immutable and transparent."

---

### Step 5 — Switch to the child view (1 minute)

1. Switch MetaMask to **Account 1** (child).
2. Click **Switch to Child View** in the sidebar, or navigate to `/child`.

> "This is what the child sees — their balance, how much they've spent today,
> and their daily limit."

- Point out the **$465 remaining balance**, **$35 spent today**, **$50 daily limit**.

---

### Step 6 — Child makes a direct payment (1.5 minutes)

1. Click **Send Payment**.
2. Select **Lunch Canteen** from the recipient dropdown.
3. Enter **$8**.
4. Click **Send Payment** — MetaMask pops up.
5. Confirm in MetaMask.
6. Toast notification: "Send payment successful!"

> "The smart contract checked: is the recipient approved? Is there enough balance?
> Does this exceed the daily limit? All yes — payment goes through."

- Refresh or wait for polling — the balance updates to **$457**, daily spent to **$43**.

---

### Step 7 — Show the daily limit in action (1 minute)

1. Try to send **$20** to Lunch Canteen.
2. The form shows a real-time warning: **"Exceeds today's remaining daily limit ($7.00 mUSDC)"**.
3. The button stays disabled.

> "The frontend validates before submitting — but even if someone tried to bypass
> the UI, the contract would revert the transaction with `DailyLimitExceeded`."

---

### Step 8 — Child submits a spending request (1 minute)

1. Click **Request Payment**.
2. Select **School Store**, enter **$25**, memo: "New school supplies".
3. Click **Submit Request**.
4. Toast: "Submit request successful!"

> "For larger purchases the child can submit a request. No money moves until the parent approves."

---

### Step 9 — Parent approves the request (1 minute)

1. Switch MetaMask back to **Account 0** (parent).
2. Navigate to the **Parent Dashboard**.
3. The pending request card shows the $25 request.
4. Click **Review** → the ApprovalModal opens.
5. Click **Approve** → MetaMask popup → confirm.
6. Toast: "Approve request successful!"
7. Child's balance drops by $25; request status changes to Approved.

> "The approval triggers the contract to transfer the tokens. The parent is the
> only one who can approve — the contract enforces this."

---

### Step 10 — Parent rejects a request (optional, 30 seconds)

1. Have the child submit another request (any amount).
2. Parent clicks **Reject** instead of Approve.
3. Show that the child's balance is **unchanged** — no funds were moved.

---

### Step 11 — Show contract enforcement (optional, 1 minute)

> "Let me try to break the rules directly."

In the browser console (or a quick Hardhat script):
- Try to call `makePayment` to an unapproved address → transaction reverts with `RecipientNotApproved`.
- Try to spend more than the daily limit → reverts with `DailyLimitExceeded`.

> "The contract is the source of truth. The frontend is just a convenient interface."

---

### Step 12 — Closing (30 seconds)

> "KidSafe gives parents blockchain-enforced control over their child's spending —
> not just a UI restriction. The limits, whitelist, and approval flow are all
> enforced by the smart contract. This MVP runs on a local Hardhat network with
> test tokens. The next steps would be deploying to a public testnet,
> adding multi-child support, and integrating a real stablecoin."

---

## Fallback: Demo Mode (no blockchain running)

If the blockchain is not available during the presentation:

1. Leave `frontend/.env` empty (no contract addresses).
2. Navigate to `http://localhost:5173` — the app enters **Demo Mode** automatically.
3. All dashboards work with clearly-labelled mock data.
4. Explain: "We have a live blockchain demo as well — the demo mode is a fallback
   to ensure the UI can always be shown."

**Important:** Never present mock transactions as real on-chain confirmations.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| MetaMask shows wrong network | Settings → Networks → Add Hardhat Local (Chain 31337, RPC http://127.0.0.1:8545) |
| Transactions fail with "nonce too high" | Reset MetaMask account: Settings → Advanced → Reset Account |
| Child balance not updating | Click Refresh or wait 8 seconds for the polling interval |
| "Contract not deployed" error | Check that the contract addresses in `frontend/.env` match the deploy output |
| Hardhat node not found | Run `npx hardhat node` in the `contracts/` directory |
| MetaMask "insufficient funds" | Import Account 0 from the Hardhat node private keys (each account has 10,000 ETH) |

---

## Key Talking Points

- **On-chain enforcement, not UI restriction** — the smart contract is the authority.
- **Transparent history** — both parent and child see the same immutable event log.
- **Two payment modes** — direct (within limits) and request-based (needs approval).
- **Daily limit with automatic reset** — resets at UTC midnight via block timestamp math.
- **MVP scope** — enforcement applies to funds in the KidSafe contract, not every possible
  transaction from the child's independent wallet. Production would add account abstraction
  or session keys to close this gap.
