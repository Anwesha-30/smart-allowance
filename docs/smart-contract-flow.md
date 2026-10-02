# KidSafe Smart Contract — Flow Reference

## Contract: KidSafe.sol

### Deployment Parameters

| Parameter | Type | Description |
|---|---|---|
| `tokenAddress` | `address` | Address of the MockUSDC ERC-20 token |

---

## Function Reference

### Parent Functions

#### `registerChild(address childAddress)`
- **Who:** Parent wallet (any address can be a parent)
- **Effect:** Creates a `Child` struct linked to `msg.sender`
- **Reverts:** `InvalidAddress` if zero address; `AlreadyRegistered` if already exists
- **Event:** `ChildRegistered(parent, child)`

#### `depositAllowance(address childAddress, uint256 amount)`
- **Who:** Registered parent of `childAddress`
- **Pre-condition:** Parent must have called `token.approve(kidSafeAddr, amount)` first
- **Effect:** Pulls tokens from parent into contract; increases `child.allowanceBalance`
- **Reverts:** `NotParent`, `InvalidAmount` (if 0)
- **Event:** `AllowanceDeposited(child, amount)`

#### `setAllowance(address childAddress, uint256 amount)`
- **Who:** Registered parent
- **Effect:** Same as `depositAllowance` — adds to balance rather than replacing it
- **Event:** `AllowanceSet(child, amount)`

#### `setDailyLimit(address childAddress, uint256 limit)`
- **Who:** Registered parent
- **Effect:** Sets `child.dailyLimit`; use `0` to remove the limit
- **Event:** `DailyLimitSet(child, limit)`

#### `addApprovedRecipient(address childAddress, address recipientAddress)`
- **Who:** Registered parent
- **Effect:** Sets `approvedRecipients[child][recipient] = true`
- **Event:** `RecipientAdded(child, recipient)`

#### `removeApprovedRecipient(address childAddress, address recipientAddress)`
- **Who:** Registered parent
- **Effect:** Sets `approvedRecipients[child][recipient] = false`
- **Event:** `RecipientRemoved(child, recipient)`

#### `approveRequest(uint256 requestId)`
- **Who:** Registered parent of the child who submitted the request
- **Effect:** Validates limits, transfers tokens, marks request Approved
- **Reverts:** `RequestNotPending`, `NotParent`, `InsufficientAllowance`, `DailyLimitExceeded`
- **Events:** `RequestApproved(requestId, parent)`, `PaymentMade(child, recipient, amount, requestId)`

#### `rejectRequest(uint256 requestId)`
- **Who:** Registered parent
- **Effect:** Marks request Rejected; **no token transfer**
- **Reverts:** `RequestNotPending`, `NotParent`
- **Event:** `RequestRejected(requestId, parent)`

#### `withdrawAllowance(address childAddress, uint256 amount)`
- **Who:** Registered parent
- **Effect:** Returns unspent tokens from contract to parent
- **Reverts:** `NotParent`, `InvalidAmount`, `InsufficientAllowance`
- **Event:** `AllowanceWithdrawn(parent, child, amount)`

---

### Child Functions

#### `makePayment(address recipient, uint256 amount)`
- **Who:** Registered child (`msg.sender` is the child)
- **Effect:** Validates all rules then transfers tokens to recipient
- **Reverts:**
  - `RecipientNotApproved` — recipient not on whitelist
  - `InsufficientAllowance` — amount > remaining balance
  - `DailyLimitExceeded` — amount would exceed today's limit
  - `InvalidAmount` — amount == 0
- **Event:** `PaymentMade(child, recipient, amount, 0)` *(requestId=0 for direct payments)*

#### `requestPayment(address recipient, uint256 amount, string memo)`
- **Who:** Registered child
- **Effect:** Stores a `SpendingRequest` with `status = Pending`; no tokens moved yet
- **Reverts:** `RecipientNotApproved`, `InsufficientAllowance`, `InvalidAmount`
- **Returns:** `requestId` (uint256)
- **Event:** `RequestCreated(requestId, child, recipient, amount)`

---

### View Functions

| Function | Returns | Description |
|---|---|---|
| `getChildDetails(address)` | `(parent, allowanceBalance, dailyLimit, dailySpent, registered)` | Full child config |
| `getDailySpending(address)` | `uint256` | Today's spend (0 if new day) |
| `getRemainingAllowance(address)` | `uint256` | Current token balance for child |
| `getApprovedRecipients(address)` | `address[]` | Active (non-removed) whitelist entries |
| `getChildRequests(address)` | `uint256[]` | All request IDs for a child |
| `getRequest(uint256)` | `SpendingRequest` | Full request struct by ID |
| `nextRequestId()` | `uint256` | Next request ID (= total request count) |

---

## Event Index

| Event | When emitted |
|---|---|
| `ChildRegistered(parent, child)` | registerChild |
| `AllowanceDeposited(child, amount)` | depositAllowance |
| `AllowanceSet(child, amount)` | setAllowance |
| `DailyLimitSet(child, limit)` | setDailyLimit |
| `RecipientAdded(child, recipient)` | addApprovedRecipient |
| `RecipientRemoved(child, recipient)` | removeApprovedRecipient |
| `PaymentMade(child, recipient, amount, requestId)` | makePayment, approveRequest |
| `RequestCreated(requestId, child, recipient, amount)` | requestPayment |
| `RequestApproved(requestId, parent)` | approveRequest |
| `RequestRejected(requestId, parent)` | rejectRequest |
| `AllowanceWithdrawn(parent, child, amount)` | withdrawAllowance |

---

## Custom Errors

| Error | Trigger condition |
|---|---|
| `NotRegistered()` | Child wallet is not in the `children` mapping |
| `AlreadyRegistered()` | `registerChild` called for an existing child |
| `NotParent()` | Caller is not the registered parent of the child |
| `NotChild()` | Reserved for future child-only functions |
| `RecipientNotApproved()` | Payment target not in the child's whitelist |
| `InsufficientAllowance()` | Payment would exceed `child.allowanceBalance` |
| `DailyLimitExceeded()` | Payment would exceed today's `dailyLimit` |
| `InvalidAmount()` | Amount is zero |
| `InvalidAddress()` | Zero address passed where a real address is required |
| `RequestNotPending()` | Approve/reject called on an already-resolved request |
| `NotRequestOwner()` | Reserved for future per-child request access |

---

## State Machine: SpendingRequest

```
                  requestPayment()
                       │
                       ▼
               ┌───────────────┐
               │    PENDING    │  (status = 0)
               └───────┬───────┘
                       │
           ┌───────────┴───────────┐
           │                       │
    approveRequest()         rejectRequest()
           │                       │
           ▼                       ▼
  ┌────────────────┐    ┌────────────────────┐
  │    APPROVED    │    │     REJECTED       │
  │ (status = 1)   │    │  (status = 2)      │
  │ tokens sent    │    │  no token transfer │
  └────────────────┘    └────────────────────┘
```

Once a request reaches `APPROVED` or `REJECTED`, it cannot be changed again (`RequestNotPending` revert).

---

## Daily Limit Reset Logic

The contract uses a **Unix day index** (`block.timestamp / 86400`) to track spending periods. No keeper, cron job, or external call is needed.

```
Before every spend check:
  today = block.timestamp / 86400

  if child.lastSpendDay < today:
    child.dailySpent   = 0        ← automatic reset
    child.lastSpendDay = today

  if dailyLimit > 0 and dailySpent + amount > dailyLimit:
    revert DailyLimitExceeded
```

**Edge case:** If `dailyLimit = 0`, there is no daily cap (child can spend up to their full allowance balance in one day).

---

## Token Flow Diagram

```
PARENT WALLET
     │
     │ token.approve(KidSafe, amount)
     │ then depositAllowance(child, amount)
     │
     ▼
KIDSAFE CONTRACT
(holds child's allowance)
     │
     │ On makePayment() or approveRequest()
     │ token.safeTransfer(recipient, amount)
     │
     ▼
RECIPIENT WALLET
```

Tokens flow: `Parent Wallet → KidSafe Contract → Recipient`

The child's wallet **never holds** the allowance tokens directly. The KidSafe contract is the custodian, which is what enables on-chain enforcement.

---

## Contract: MockUSDC.sol

A minimal ERC-20 for local testing. Key points:

- **Symbol:** `mUSDC`
- **Decimals:** `6` (matches real USDC)
- **Initial supply:** 1,000,000 mUSDC minted to deployer
- **Public faucet:** Anyone can call `mint(to, amount)` for up to 10,000 mUSDC
- **Owner faucet:** `ownerMint(to, amount)` — unlimited, used by seed script
- **No access control on transfers** — it is a standard ERC-20

Do not use MockUSDC in production or on mainnet.
