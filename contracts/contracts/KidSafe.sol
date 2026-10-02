// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title KidSafe
 * @notice Blockchain-based allowance management for kids.
 *
 * HOW IT WORKS
 * ------------
 * 1. A parent registers a child wallet address.
 * 2. The parent deposits MockUSDC into this contract as the child's allowance.
 * 3. The parent sets a daily spending limit.
 * 4. The parent whitelists approved recipient addresses.
 * 5. The child can:
 *    a) Directly pay an approved recipient if within the daily limit (makePayment).
 *    b) Submit a spending request that the parent must approve first (requestPayment /
 *       approveRequest).
 * 6. The contract enforces all rules — allowance balance, daily limit, whitelist.
 *
 * IMPORTANT — MVP SCOPE
 * ---------------------
 * The contract only controls tokens that the PARENT has deposited INTO the contract.
 * It does not prevent a child from making direct wallet-to-wallet transfers using
 * their own MetaMask. Enforcement applies exclusively to funds held by KidSafe.
 */
contract KidSafe is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────
    //  TYPES
    // ─────────────────────────────────────────────────

    /// @notice Status of a spending request submitted by a child.
    enum RequestStatus {
        Pending,   // 0 — awaiting parent decision
        Approved,  // 1 — parent approved, payment executed
        Rejected   // 2 — parent rejected, no transfer
    }

    /// @notice Configuration and balance data for a registered child.
    struct Child {
        address parent;           // Parent who registered this child
        uint256 allowanceBalance; // Current allowance held in contract (token units)
        uint256 dailyLimit;       // Max spend per calendar day (token units)
        uint256 dailySpent;       // Amount spent so far today (token units)
        uint256 lastSpendDay;     // Unix day index when dailySpent was last reset
        bool registered;          // Guard flag
    }

    /// @notice A spending request created by a child.
    struct SpendingRequest {
        uint256 id;
        address child;
        address recipient;
        uint256 amount;
        string  memo;
        RequestStatus status;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    // ─────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────

    /// @notice The ERC-20 token used for all allowance operations.
    IERC20 public immutable token;

    /// @notice child address → Child struct
    mapping(address => Child) public children;

    /// @notice child address → set of approved recipient addresses
    mapping(address => mapping(address => bool)) public approvedRecipients;

    /// @notice child address → list of approved recipients (for iteration)
    mapping(address => address[]) private _recipientList;

    /// @notice Global request counter (auto-incrementing ID)
    uint256 public nextRequestId;

    /// @notice request ID → SpendingRequest
    mapping(uint256 => SpendingRequest) public requests;

    /// @notice child address → list of request IDs
    mapping(address => uint256[]) private _childRequests;

    // ─────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────

    event ChildRegistered(address indexed parent, address indexed child);
    event AllowanceSet(address indexed child, uint256 amount);
    event AllowanceDeposited(address indexed child, uint256 amount);
    event DailyLimitSet(address indexed child, uint256 limit);
    event RecipientAdded(address indexed child, address indexed recipient);
    event RecipientRemoved(address indexed child, address indexed recipient);
    event PaymentMade(
        address indexed child,
        address indexed recipient,
        uint256 amount,
        uint256 requestId
    );
    event RequestCreated(
        uint256 indexed requestId,
        address indexed child,
        address indexed recipient,
        uint256 amount
    );
    event RequestApproved(uint256 indexed requestId, address indexed parent);
    event RequestRejected(uint256 indexed requestId, address indexed parent);
    event AllowanceWithdrawn(address indexed parent, address indexed child, uint256 amount);

    // ─────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────

    error NotRegistered();
    error AlreadyRegistered();
    error NotParent();
    error NotChild();
    error RecipientNotApproved();
    error InsufficientAllowance();
    error DailyLimitExceeded();
    error InvalidAmount();
    error InvalidAddress();
    error RequestNotPending();
    error NotRequestOwner();

    // ─────────────────────────────────────────────────
    //  MODIFIERS
    // ─────────────────────────────────────────────────

    modifier onlyParentOf(address child) {
        if (!children[child].registered) revert NotRegistered();
        if (children[child].parent != msg.sender) revert NotParent();
        _;
    }

    modifier onlyRegisteredChild() {
        if (!children[msg.sender].registered) revert NotRegistered();
        _;
    }

    // ─────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────

    /**
     * @param tokenAddress Address of the MockUSDC (or any ERC-20) token.
     */
    constructor(address tokenAddress) {
        if (tokenAddress == address(0)) revert InvalidAddress();
        token = IERC20(tokenAddress);
    }

    // ─────────────────────────────────────────────────
    //  PARENT ACTIONS
    // ─────────────────────────────────────────────────

    /**
     * @notice Register a child wallet under the calling parent.
     * @param childAddress Wallet address belonging to the child.
     */
    function registerChild(address childAddress) external {
        if (childAddress == address(0)) revert InvalidAddress();
        if (children[childAddress].registered) revert AlreadyRegistered();

        children[childAddress] = Child({
            parent: msg.sender,
            allowanceBalance: 0,
            dailyLimit: 0,
            dailySpent: 0,
            lastSpendDay: 0,
            registered: true
        });

        emit ChildRegistered(msg.sender, childAddress);
    }

    /**
     * @notice Deposit tokens into the contract as the child's allowance.
     *         The parent must have approved this contract to spend the tokens first
     *         (token.approve(kidsafeAddress, amount)).
     * @param childAddress Child wallet address.
     * @param amount       Amount in token units (6 decimals for MockUSDC).
     */
    function depositAllowance(address childAddress, uint256 amount)
        external
        onlyParentOf(childAddress)
    {
        if (amount == 0) revert InvalidAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        children[childAddress].allowanceBalance += amount;
        emit AllowanceDeposited(childAddress, amount);
    }

    /**
     * @notice Set (or update) the child's allowance balance directly.
     *         This is a convenience function that also deposits tokens.
     *         Use depositAllowance() for subsequent top-ups.
     * @param childAddress Child wallet address.
     * @param amount       New allowance amount in token units.
     */
    function setAllowance(address childAddress, uint256 amount)
        external
        onlyParentOf(childAddress)
    {
        if (amount == 0) revert InvalidAmount();
        // Transfer the full new allowance from the parent to this contract
        token.safeTransferFrom(msg.sender, address(this), amount);
        children[childAddress].allowanceBalance += amount;
        emit AllowanceSet(childAddress, amount);
    }

    /**
     * @notice Set the maximum amount the child can spend in a single calendar day.
     * @param childAddress Child wallet address.
     * @param limit        Daily limit in token units. Use 0 to remove the limit.
     */
    function setDailyLimit(address childAddress, uint256 limit)
        external
        onlyParentOf(childAddress)
    {
        children[childAddress].dailyLimit = limit;
        emit DailyLimitSet(childAddress, limit);
    }

    /**
     * @notice Add an address to the child's approved recipient list.
     * @param childAddress     Child wallet address.
     * @param recipientAddress Address the child is allowed to pay.
     */
    function addApprovedRecipient(address childAddress, address recipientAddress)
        external
        onlyParentOf(childAddress)
    {
        if (recipientAddress == address(0)) revert InvalidAddress();
        if (!approvedRecipients[childAddress][recipientAddress]) {
            approvedRecipients[childAddress][recipientAddress] = true;
            _recipientList[childAddress].push(recipientAddress);
            emit RecipientAdded(childAddress, recipientAddress);
        }
    }

    /**
     * @notice Remove an address from the child's approved recipient list.
     * @param childAddress     Child wallet address.
     * @param recipientAddress Address to remove.
     */
    function removeApprovedRecipient(address childAddress, address recipientAddress)
        external
        onlyParentOf(childAddress)
    {
        approvedRecipients[childAddress][recipientAddress] = false;
        emit RecipientRemoved(childAddress, recipientAddress);
    }

    /**
     * @notice Approve a pending spending request and execute the payment.
     * @param requestId The ID of the request to approve.
     */
    function approveRequest(uint256 requestId)
        external
        nonReentrant
    {
        SpendingRequest storage req = requests[requestId];
        if (req.status != RequestStatus.Pending) revert RequestNotPending();
        if (children[req.child].parent != msg.sender) revert NotParent();

        req.status = RequestStatus.Approved;
        req.resolvedAt = block.timestamp;

        _executePayment(req.child, req.recipient, req.amount, requestId);

        emit RequestApproved(requestId, msg.sender);
    }

    /**
     * @notice Reject a pending spending request. No tokens are transferred.
     * @param requestId The ID of the request to reject.
     */
    function rejectRequest(uint256 requestId) external {
        SpendingRequest storage req = requests[requestId];
        if (req.status != RequestStatus.Pending) revert RequestNotPending();
        if (children[req.child].parent != msg.sender) revert NotParent();

        req.status = RequestStatus.Rejected;
        req.resolvedAt = block.timestamp;

        emit RequestRejected(requestId, msg.sender);
    }

    /**
     * @notice Withdraw unused allowance back to the parent.
     * @param childAddress Child wallet address.
     * @param amount       Amount to withdraw. Must not exceed the child's balance.
     */
    function withdrawAllowance(address childAddress, uint256 amount)
        external
        nonReentrant
        onlyParentOf(childAddress)
    {
        if (amount == 0) revert InvalidAmount();
        Child storage child = children[childAddress];
        if (amount > child.allowanceBalance) revert InsufficientAllowance();

        child.allowanceBalance -= amount;
        token.safeTransfer(msg.sender, amount);

        emit AllowanceWithdrawn(msg.sender, childAddress, amount);
    }

    // ─────────────────────────────────────────────────
    //  CHILD ACTIONS
    // ─────────────────────────────────────────────────

    /**
     * @notice Make a direct payment to an approved recipient.
     *         Checks: recipient approved, allowance sufficient, daily limit not exceeded.
     * @param recipient Address to pay.
     * @param amount    Amount in token units.
     */
    function makePayment(address recipient, uint256 amount)
        external
        nonReentrant
        onlyRegisteredChild
    {
        if (amount == 0) revert InvalidAmount();
        if (!approvedRecipients[msg.sender][recipient]) revert RecipientNotApproved();

        _checkAndUpdateLimits(msg.sender, amount);

        // Use a sentinel 0 for direct payments (no linked request)
        _executePayment(msg.sender, recipient, amount, 0);
    }

    /**
     * @notice Submit a spending request for parent approval.
     *         Funds are NOT transferred until the parent approves.
     * @param recipient Address the child wants to pay.
     * @param amount    Amount in token units.
     * @param memo      Short description (shown to parent).
     */
    function requestPayment(address recipient, uint256 amount, string calldata memo)
        external
        onlyRegisteredChild
        returns (uint256 requestId)
    {
        if (amount == 0) revert InvalidAmount();
        if (!approvedRecipients[msg.sender][recipient]) revert RecipientNotApproved();

        Child storage child = children[msg.sender];
        if (amount > child.allowanceBalance) revert InsufficientAllowance();

        requestId = nextRequestId++;
        requests[requestId] = SpendingRequest({
            id:         requestId,
            child:      msg.sender,
            recipient:  recipient,
            amount:     amount,
            memo:       memo,
            status:     RequestStatus.Pending,
            createdAt:  block.timestamp,
            resolvedAt: 0
        });

        _childRequests[msg.sender].push(requestId);

        emit RequestCreated(requestId, msg.sender, recipient, amount);
    }

    // ─────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────

    /**
     * @notice Return the core details of a registered child.
     */
    function getChildDetails(address childAddress)
        external
        view
        returns (
            address parent,
            uint256 allowanceBalance,
            uint256 dailyLimit,
            uint256 dailySpent,
            bool registered
        )
    {
        Child storage c = children[childAddress];
        return (c.parent, c.allowanceBalance, c.dailyLimit, _currentDailySpent(c), c.registered);
    }

    /**
     * @notice Return how much the child has spent today (resets at UTC midnight).
     */
    function getDailySpending(address childAddress) external view returns (uint256) {
        return _currentDailySpent(children[childAddress]);
    }

    /**
     * @notice Return the child's remaining allowance balance.
     */
    function getRemainingAllowance(address childAddress) external view returns (uint256) {
        return children[childAddress].allowanceBalance;
    }

    /**
     * @notice Return all approved recipient addresses for a child.
     */
    function getApprovedRecipients(address childAddress)
        external
        view
        returns (address[] memory)
    {
        address[] storage list = _recipientList[childAddress];
        // Filter out recipients that were later removed
        uint256 count = 0;
        for (uint256 i = 0; i < list.length; i++) {
            if (approvedRecipients[childAddress][list[i]]) count++;
        }
        address[] memory active = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < list.length; i++) {
            if (approvedRecipients[childAddress][list[i]]) {
                active[idx++] = list[i];
            }
        }
        return active;
    }

    /**
     * @notice Return all request IDs belonging to a child.
     */
    function getChildRequests(address childAddress)
        external
        view
        returns (uint256[] memory)
    {
        return _childRequests[childAddress];
    }

    /**
     * @notice Return a single spending request by ID.
     */
    function getRequest(uint256 requestId)
        external
        view
        returns (SpendingRequest memory)
    {
        return requests[requestId];
    }

    // ─────────────────────────────────────────────────
    //  INTERNAL HELPERS
    // ─────────────────────────────────────────────────

    /**
     * @dev Returns today's Unix day index (UTC).
     */
    function _today() internal view returns (uint256) {
        return block.timestamp / 1 days;
    }

    /**
     * @dev Returns the child's current daily spent amount.
     *      If the stored day is in the past, the value is treated as 0.
     */
    function _currentDailySpent(Child storage c) internal view returns (uint256) {
        if (c.lastSpendDay < _today()) return 0;
        return c.dailySpent;
    }

    /**
     * @dev Checks allowance and daily limit, then updates spending counters.
     *      Reverts if either rule is violated.
     */
    function _checkAndUpdateLimits(address childAddress, uint256 amount) internal {
        Child storage child = children[childAddress];

        if (amount > child.allowanceBalance) revert InsufficientAllowance();

        // Reset daily counter if a new day has started
        uint256 today = _today();
        if (child.lastSpendDay < today) {
            child.dailySpent = 0;
            child.lastSpendDay = today;
        }

        // Enforce daily limit (0 means no limit)
        if (child.dailyLimit > 0) {
            if (child.dailySpent + amount > child.dailyLimit) revert DailyLimitExceeded();
        }

        child.dailySpent += amount;
        child.allowanceBalance -= amount;
    }

    /**
     * @dev Transfers tokens from this contract to the recipient and emits the event.
     */
    function _executePayment(
        address childAddress,
        address recipient,
        uint256 amount,
        uint256 requestId
    ) internal {
        token.safeTransfer(recipient, amount);
        emit PaymentMade(childAddress, recipient, amount, requestId);
    }
}
