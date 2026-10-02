// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title KidSafe
 * @notice Blockchain-based allowance management for kids.
 *
 * Compatible with the original KidSafe test/API while adding:
 * - Child pause/unpause
 * - Child name
 * - Monthly spending limit
 * - Monthly spending tracking
 * - Parent/child relationship tracking
 * - Named approved recipients
 * - Correct accounting for approved payment requests
 */
contract KidSafe is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =============================================================
    // ENUMS
    // =============================================================

    enum RequestStatus {
        Pending,
        Approved,
        Rejected
    }

    // =============================================================
    // STRUCTS
    // =============================================================

    struct Child {
        bool registered;
        bool active;

        address parent;

        string name;

        // 0 means unlimited monthly spending.
        uint256 monthlyAllowance;

        // 0 means unlimited daily spending.
        uint256 dailyLimit;

        // Actual funds deposited into the KidSafe vault.
        uint256 allowanceBalance;

        uint256 currentMonthStart;
        uint256 spentThisMonth;

        uint256 lastSpendDay;
        uint256 spentToday;
    }

    struct SpendingRequest {
        uint256 id;
        address child;
        address recipient;
        uint256 amount;
        string memo;
        RequestStatus status;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    // =============================================================
    // STATE
    // =============================================================

    IERC20 public immutable token;

    mapping(address => Child) public children;

    mapping(address => address[]) private _parentChildren;

    mapping(address => mapping(address => bool))
        public approvedRecipients;

    mapping(address => mapping(address => string))
        public recipientNames;

    mapping(address => address[]) private _recipientList;

    uint256 public nextRequestId;

    mapping(uint256 => SpendingRequest) public requests;

    mapping(address => uint256[]) private _childRequests;

    mapping(address => uint256[]) private _parentRequests;

    // =============================================================
    // EVENTS
    // =============================================================

    // IMPORTANT: These event signatures are kept compatible
    // with the original test suite.

    event ChildRegistered(
        address indexed parent,
        address indexed child
    );

    event AllowanceSet(
        address indexed child,
        uint256 amount
    );

    event AllowanceDeposited(
        address indexed child,
        uint256 amount
    );

    event DailyLimitSet(
        address indexed child,
        uint256 limit
    );

    event RecipientAdded(
        address indexed child,
        address indexed recipient
    );

    event RecipientRemoved(
        address indexed child,
        address indexed recipient
    );

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

    event RequestApproved(
        uint256 indexed requestId,
        address indexed parent
    );

    event RequestRejected(
        uint256 indexed requestId,
        address indexed parent
    );

    // Additional events for the upgraded functionality.

    event ChildNameUpdated(
        address indexed child,
        string name
    );

    event ChildStatusToggled(
        address indexed parent,
        address indexed child,
        bool active
    );

    event MonthlyAllowanceSet(
        address indexed child,
        uint256 monthlyAllowance
    );

    // =============================================================
    // ERRORS
    // =============================================================

    error InvalidAddress();
    error InvalidAmount();

    error NotRegistered();
    error AlreadyRegistered();

    error NotParent();
    error NotChild();

    error ChildInactive();

    error RecipientNotApproved();
    error AlreadyApproved();

    error InsufficientAllowance();

    error DailyLimitExceeded();
    error MonthlyLimitExceeded();

    error RequestNotFound();
    error RequestNotPending();

    error InvalidLimit();

    // =============================================================
    // MODIFIERS
    // =============================================================

    modifier onlyParentOf(address childAddress) {
        if (!children[childAddress].registered) {
            revert NotRegistered();
        }

        if (children[childAddress].parent != msg.sender) {
            revert NotParent();
        }

        _;
    }

    modifier onlyRegisteredChild() {
        if (!children[msg.sender].registered) {
            revert NotRegistered();
        }

        if (!children[msg.sender].active) {
            revert ChildInactive();
        }

        _;
    }

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

    constructor(address tokenAddress) {
        if (tokenAddress == address(0)) {
            revert InvalidAddress();
        }

        token = IERC20(tokenAddress);
    }

    // =============================================================
    // PARENT FUNCTIONS
    // =============================================================

    /**
     * @notice Register a child.
     *
     * Kept as registerChild(address) for compatibility
     * with the original KidSafe frontend/tests.
     */
    function registerChild(address childAddress) external {
        if (childAddress == address(0)) {
            revert InvalidAddress();
        }

        if (childAddress == msg.sender) {
            revert InvalidAddress();
        }

        if (children[childAddress].registered) {
            revert AlreadyRegistered();
        }

        children[childAddress] = Child({
            registered: true,
            active: true,
            parent: msg.sender,
            name: "",
            monthlyAllowance: 0,
            dailyLimit: 0,
            allowanceBalance: 0,
            currentMonthStart: block.timestamp,
            spentThisMonth: 0,
            lastSpendDay: _today(),
            spentToday: 0
        });

        _parentChildren[msg.sender].push(childAddress);

        emit ChildRegistered(
            msg.sender,
            childAddress
        );
    }

    /**
     * @notice Set the deposited allowance amount.
     *
     * This preserves the original contract behavior:
     * setAllowance() deposits tokens into the child's vault.
     */
    function setAllowance(
        address childAddress,
        uint256 amount
    )
        external
        onlyParentOf(childAddress)
    {
        if (amount == 0) {
            revert InvalidAmount();
        }

        token.safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        children[childAddress].allowanceBalance += amount;

        emit AllowanceSet(
            childAddress,
            amount
        );
    }

    /**
     * @notice Deposit allowance into the child's vault.
     */
    function depositAllowance(
        address childAddress,
        uint256 amount
    )
        external
        onlyParentOf(childAddress)
    {
        if (amount == 0) {
            revert InvalidAmount();
        }

        token.safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        children[childAddress].allowanceBalance += amount;

        emit AllowanceDeposited(
            childAddress,
            amount
        );
    }

    /**
     * @notice Set daily spending limit.
     *
     * 0 means unlimited.
     */
    function setDailyLimit(
        address childAddress,
        uint256 limit
    )
        external
        onlyParentOf(childAddress)
    {
        children[childAddress].dailyLimit = limit;

        emit DailyLimitSet(
            childAddress,
            limit
        );
    }

    /**
     * @notice Set monthly spending limit.
     *
     * 0 means unlimited.
     */
    function setMonthlyAllowance(
        address childAddress,
        uint256 limit
    )
        external
        onlyParentOf(childAddress)
    {
        children[childAddress].monthlyAllowance = limit;

        emit MonthlyAllowanceSet(
            childAddress,
            limit
        );
    }

    /**
     * @notice Set the child's display name.
     */
    function setChildName(
        address childAddress,
        string calldata name
    )
        external
        onlyParentOf(childAddress)
    {
        children[childAddress].name = name;

        emit ChildNameUpdated(
            childAddress,
            name
        );
    }

    /**
     * @notice Pause or activate child spending.
     */
    function setChildActive(
        address childAddress,
        bool active
    )
        external
        onlyParentOf(childAddress)
    {
        children[childAddress].active = active;

        emit ChildStatusToggled(
            msg.sender,
            childAddress,
            active
        );
    }

    /**
     * @notice Withdraw unused allowance.
     */
    function withdrawAllowance(
        address childAddress,
        uint256 amount
    )
        external
        nonReentrant
        onlyParentOf(childAddress)
    {
        if (amount == 0) {
            revert InvalidAmount();
        }

        Child storage child = children[childAddress];

        if (amount > child.allowanceBalance) {
            revert InsufficientAllowance();
        }

        child.allowanceBalance -= amount;

        token.safeTransfer(
            msg.sender,
            amount
        );
    }

    // =============================================================
    // RECIPIENT MANAGEMENT
    // =============================================================

    /**
     * @notice Add an approved recipient.
     *
     * Kept as addApprovedRecipient(address,address)
     * for compatibility.
     */
    function addApprovedRecipient(
        address childAddress,
        address recipient
    )
        external
        onlyParentOf(childAddress)
    {
        if (recipient == address(0)) {
            revert InvalidAddress();
        }

        if (approvedRecipients[childAddress][recipient]) {
            revert AlreadyApproved();
        }

        approvedRecipients[childAddress][recipient] = true;

        _recipientList[childAddress].push(recipient);

        emit RecipientAdded(
            childAddress,
            recipient
        );
    }

    /**
     * @notice Add an approved recipient with a display name.
     *
     * New functionality; original API remains untouched.
     */
    function addApprovedRecipientWithName(
        address childAddress,
        address recipient,
        string calldata name
    )
        external
        onlyParentOf(childAddress)
    {
        if (recipient == address(0)) {
            revert InvalidAddress();
        }

        if (approvedRecipients[childAddress][recipient]) {
            revert AlreadyApproved();
        }

        approvedRecipients[childAddress][recipient] = true;
        recipientNames[childAddress][recipient] = name;

        _recipientList[childAddress].push(recipient);

        emit RecipientAdded(
            childAddress,
            recipient
        );
    }

    /**
     * @notice Remove an approved recipient.
     */
    function removeApprovedRecipient(
        address childAddress,
        address recipient
    )
        external
        onlyParentOf(childAddress)
    {
        approvedRecipients[childAddress][recipient] = false;

        emit RecipientRemoved(
            childAddress,
            recipient
        );
    }

    // =============================================================
    // CHILD DIRECT PAYMENT
    // =============================================================

    function makePayment(
        address recipient,
        uint256 amount
    )
        external
        nonReentrant
        onlyRegisteredChild
    {
        if (amount == 0) {
            revert InvalidAmount();
        }

        if (!approvedRecipients[msg.sender][recipient]) {
            revert RecipientNotApproved();
        }

        _checkAndUpdateLimits(
            msg.sender,
            amount
        );

        token.safeTransfer(
            recipient,
            amount
        );

        emit PaymentMade(
            msg.sender,
            recipient,
            amount,
            0
        );
    }

    // =============================================================
    // PAYMENT REQUESTS
    // =============================================================

    function requestPayment(
        address recipient,
        uint256 amount,
        string calldata memo
    )
        external
        onlyRegisteredChild
        returns (uint256 requestId)
    {
        if (recipient == address(0)) {
            revert InvalidAddress();
        }

        if (amount == 0) {
            revert InvalidAmount();
        }

        if (!approvedRecipients[msg.sender][recipient]) {
            revert RecipientNotApproved();
        }

        if (
            amount >
            children[msg.sender].allowanceBalance
        ) {
            revert InsufficientAllowance();
        }

        requestId = nextRequestId++;

        requests[requestId] = SpendingRequest({
            id: requestId,
            child: msg.sender,
            recipient: recipient,
            amount: amount,
            memo: memo,
            status: RequestStatus.Pending,
            createdAt: block.timestamp,
            resolvedAt: 0
        });

        _childRequests[msg.sender].push(requestId);

        address parent = children[msg.sender].parent;

        _parentRequests[parent].push(requestId);

        emit RequestCreated(
            requestId,
            msg.sender,
            recipient,
            amount
        );
    }

    // =============================================================
    // REQUEST APPROVAL
    // =============================================================

    function approveRequest(
        uint256 requestId
    )
        external
        nonReentrant
    {
        SpendingRequest storage request =
            requests[requestId];

        if (request.id != requestId) {
            revert RequestNotFound();
        }

        if (
            request.status !=
            RequestStatus.Pending
        ) {
            revert RequestNotPending();
        }

        Child storage child =
            children[request.child];

        if (child.parent != msg.sender) {
            revert NotParent();
        }

        /*
         * IMPORTANT FIX:
         *
         * Approval now goes through the exact same accounting
         * mechanism as direct payments.
         *
         * Therefore:
         * - allowance decreases
         * - daily spending increases
         * - monthly spending increases
         * - daily limit is enforced
         * - monthly limit is enforced
         */
        _checkAndUpdateLimits(
            request.child,
            request.amount
        );

        request.status =
            RequestStatus.Approved;

        request.resolvedAt =
            block.timestamp;

        token.safeTransfer(
            request.recipient,
            request.amount
        );

        emit PaymentMade(
            request.child,
            request.recipient,
            request.amount,
            requestId
        );

        emit RequestApproved(
            requestId,
            msg.sender
        );
    }

    function rejectRequest(
        uint256 requestId
    )
        external
    {
        SpendingRequest storage request =
            requests[requestId];

        if (request.id != requestId) {
            revert RequestNotFound();
        }

        if (
            request.status !=
            RequestStatus.Pending
        ) {
            revert RequestNotPending();
        }

        Child storage child =
            children[request.child];

        if (child.parent != msg.sender) {
            revert NotParent();
        }

        request.status =
            RequestStatus.Rejected;

        request.resolvedAt =
            block.timestamp;

        emit RequestRejected(
            requestId,
            msg.sender
        );
    }

    // =============================================================
    // INTERNAL LIMIT MANAGEMENT
    // =============================================================

    function _today()
        internal
        view
        returns (uint256)
    {
        return block.timestamp / 1 days;
    }

    function _resetCounters(
        Child storage child
    )
        internal
    {
        uint256 today = _today();

        if (child.lastSpendDay < today) {
            child.spentToday = 0;
            child.lastSpendDay = today;
        }

        if (
            block.timestamp >=
            child.currentMonthStart + 30 days
        ) {
            child.spentThisMonth = 0;
            child.currentMonthStart =
                block.timestamp;
        }
    }

    function _checkAndUpdateLimits(
        address childAddress,
        uint256 amount
    )
        internal
    {
        Child storage child =
            children[childAddress];

        _resetCounters(child);

        // Actual deposited balance.
        if (amount > child.allowanceBalance) {
            revert InsufficientAllowance();
        }

        // Daily limit.
        if (
            child.dailyLimit > 0 &&
            child.spentToday + amount >
            child.dailyLimit
        ) {
            revert DailyLimitExceeded();
        }

        // Monthly limit.
        if (
            child.monthlyAllowance > 0 &&
            child.spentThisMonth + amount >
            child.monthlyAllowance
        ) {
            revert MonthlyLimitExceeded();
        }

        child.spentToday += amount;
        child.spentThisMonth += amount;

        child.allowanceBalance -= amount;
    }

    // =============================================================
    // VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice ORIGINAL getChildDetails interface.
     *
     * This is intentionally kept compatible with the original
     * KidSafe.test.js.
     */
    function getChildDetails(
        address childAddress
    )
        external
        view
        returns (
            bool registered,
            address parent,
            uint256 allowanceBalance,
            uint256 dailyLimit,
            uint256 dailySpent
        )
    {
        Child storage child =
            children[childAddress];

        uint256 todaySpent =
            child.lastSpendDay < _today()
                ? 0
                : child.spentToday;

        return (
            child.registered,
            child.parent,
            child.allowanceBalance,
            child.dailyLimit,
            todaySpent
        );
    }

    /**
     * @notice Get extended child profile.
     */
    function getChildProfile(
        address childAddress
    )
        external
        view
        returns (
            address parent,
            string memory name,
            bool active,
            uint256 monthlyAllowance,
            uint256 dailyLimit,
            uint256 allowanceBalance,
            uint256 monthlySpent,
            uint256 dailySpent,
            bool registered
        )
    {
        Child storage child =
            children[childAddress];

        uint256 todaySpent =
            child.lastSpendDay < _today()
                ? 0
                : child.spentToday;

        uint256 monthSpent =
            block.timestamp >=
            child.currentMonthStart + 30 days
                ? 0
                : child.spentThisMonth;

        return (
            child.parent,
            child.name,
            child.active,
            child.monthlyAllowance,
            child.dailyLimit,
            child.allowanceBalance,
            monthSpent,
            todaySpent,
            child.registered
        );
    }

    function getRemainingAllowance(
        address childAddress
    )
        external
        view
        returns (uint256)
    {
        return children[childAddress].allowanceBalance;
    }

    function getDailySpending(
        address childAddress
    )
        external
        view
        returns (uint256)
    {
        Child storage child =
            children[childAddress];

        if (child.lastSpendDay < _today()) {
            return 0;
        }

        return child.spentToday;
    }

    function getMonthlySpending(
        address childAddress
    )
        external
        view
        returns (uint256)
    {
        Child storage child =
            children[childAddress];

        if (
            block.timestamp >=
            child.currentMonthStart + 30 days
        ) {
            return 0;
        }

        return child.spentThisMonth;
    }

    function getRemainingLimits(
        address childAddress
    )
        external
        view
        returns (
            uint256 remainingDaily,
            uint256 remainingMonthly,
            uint256 vaultBalance
        )
    {
        Child storage child =
            children[childAddress];

        if (!child.registered) {
            return (0, 0, 0);
        }

        uint256 todaySpent =
            child.lastSpendDay < _today()
                ? 0
                : child.spentToday;

        uint256 monthSpent =
            block.timestamp >=
            child.currentMonthStart + 30 days
                ? 0
                : child.spentThisMonth;

        if (child.dailyLimit == 0) {
            remainingDaily =
                type(uint256).max;
        } else if (
            child.dailyLimit > todaySpent
        ) {
            remainingDaily =
                child.dailyLimit - todaySpent;
        }

        if (child.monthlyAllowance == 0) {
            remainingMonthly =
                type(uint256).max;
        } else if (
            child.monthlyAllowance > monthSpent
        ) {
            remainingMonthly =
                child.monthlyAllowance - monthSpent;
        }

        vaultBalance =
            child.allowanceBalance;
    }

    function getChildrenOfParent(
        address parent
    )
        external
        view
        returns (address[] memory)
    {
        return _parentChildren[parent];
    }

    /**
     * ORIGINAL getApprovedRecipients interface.
     *
     * Returns only active recipient addresses.
     */
    function getApprovedRecipients(
        address childAddress
    )
        external
        view
        returns (address[] memory)
    {
        address[] storage list =
            _recipientList[childAddress];

        uint256 count = 0;

        for (uint256 i = 0; i < list.length; i++) {
            if (
                approvedRecipients[
                    childAddress
                ][list[i]]
            ) {
                count++;
            }
        }

        address[] memory result =
            new address[](count);

        uint256 index = 0;

        for (uint256 i = 0; i < list.length; i++) {
            address recipient = list[i];

            if (
                approvedRecipients[
                    childAddress
                ][recipient]
            ) {
                result[index] = recipient;
                index++;
            }
        }

        return result;
    }

    /**
     * @notice Get recipient addresses together with their names.
     */
    function getApprovedRecipientDetails(
        address childAddress
    )
        external
        view
        returns (
            address[] memory recipients,
            string[] memory names
        )
    {
        address[] storage list =
            _recipientList[childAddress];

        uint256 count = 0;

        for (uint256 i = 0; i < list.length; i++) {
            if (
                approvedRecipients[
                    childAddress
                ][list[i]]
            ) {
                count++;
            }
        }

        recipients = new address[](count);
        names = new string[](count);

        uint256 index = 0;

        for (uint256 i = 0; i < list.length; i++) {
            address recipient = list[i];

            if (
                approvedRecipients[
                    childAddress
                ][recipient]
            ) {
                recipients[index] = recipient;
                names[index] =
                    recipientNames[
                        childAddress
                    ][recipient];

                index++;
            }
        }
    }

    function getChildRequests(
        address childAddress
    )
        external
        view
        returns (uint256[] memory)
    {
        return _childRequests[childAddress];
    }

    function getParentRequests(
        address parent
    )
        external
        view
        returns (uint256[] memory)
    {
        return _parentRequests[parent];
    }

    function getRequest(
        uint256 requestId
    )
        external
        view
        returns (SpendingRequest memory)
    {
        return requests[requestId];
    }
}