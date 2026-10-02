/**
 * KidSafe.test.js
 * ---------------
 * Full test suite covering all acceptance criteria from the spec.
 *
 * Run with:  npx hardhat test
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// ─── helpers ────────────────────────────────────────────────────────────────
const DECIMALS = 6n;
const toToken = (n) => BigInt(n) * 10n ** DECIMALS;      // e.g. toToken(100) → 100_000_000
const fmt = (n) => (Number(n) / 1_000_000).toFixed(2);    // for readable console output

// Request status enum mirrors the contract
const Status = { Pending: 0n, Approved: 1n, Rejected: 2n };

// ─── shared fixture ──────────────────────────────────────────────────────────
/**
 * Deploys MockUSDC + KidSafe, mints 10,000 mUSDC to the parent,
 * returns all signers and contract instances.
 *
 * This fixture is re-used (cheaply re-executed in a snapshot) for every test.
 */
async function deployFixture() {
  const [deployer, parent, child, stranger, recipient1, recipient2] =
    await ethers.getSigners();

  // Deploy token
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const token = await MockUSDC.connect(deployer).deploy();

  // Deploy KidSafe
  const KidSafe = await ethers.getContractFactory("KidSafe");
  const kidSafe = await KidSafe.connect(deployer).deploy(await token.getAddress());

  // Give the parent plenty of test tokens
  await token.connect(deployer).ownerMint(parent.address, toToken(10_000));

  return {
    token,
    kidSafe,
    deployer,
    parent,
    child,
    stranger,
    recipient1,
    recipient2,
    kidSafeAddress: await kidSafe.getAddress(),
  };
}

/**
 * Convenience: registers the child, sets a $500 allowance + $100 daily limit,
 * and whitelists recipient1. Returns the fixture plus the child-connected signer.
 */
async function setupChildFixture() {
  const f = await loadFixture(deployFixture);
  const { token, kidSafe, parent, child, recipient1, kidSafeAddress } = f;

  await kidSafe.connect(parent).registerChild(child.address);
  await kidSafe.connect(parent).setDailyLimit(child.address, toToken(100));

  // Parent approves KidSafe then deposits allowance
  await token.connect(parent).approve(kidSafeAddress, toToken(500));
  await kidSafe.connect(parent).depositAllowance(child.address, toToken(500));

  await kidSafe
    .connect(parent)
    .addApprovedRecipient(child.address, recipient1.address);

  const kidSafeAsChild = kidSafe.connect(child);
  return { ...f, kidSafeAsChild };
}

// ────────────────────────────────────────────────────────────────────────────
//  TEST SUITES
// ────────────────────────────────────────────────────────────────────────────

describe("MockUSDC", function () {
  it("has 6 decimals", async function () {
    const { token } = await loadFixture(deployFixture);
    expect(await token.decimals()).to.equal(6);
  });

  it("mints initial supply to deployer", async function () {
    const { token, deployer } = await loadFixture(deployFixture);
    const balance = await token.balanceOf(deployer.address);
    expect(balance).to.equal(toToken(1_000_000));
  });

  it("public mint is capped at 10,000 tokens", async function () {
    const { token, stranger } = await loadFixture(deployFixture);
    await expect(
      token.connect(stranger).mint(stranger.address, toToken(10_001))
    ).to.be.revertedWith("MockUSDC: max 10,000 per mint");
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("KidSafe — Registration", function () {
  it("parent can register a child wallet", async function () {
    const { kidSafe, parent, child } = await loadFixture(deployFixture);
    await expect(kidSafe.connect(parent).registerChild(child.address))
      .to.emit(kidSafe, "ChildRegistered")
      .withArgs(parent.address, child.address);

    const details = await kidSafe.getChildDetails(child.address);
    expect(details.registered).to.equal(true);
    expect(details.parent).to.equal(parent.address);
  });

  it("cannot register the zero address", async function () {
    const { kidSafe, parent } = await loadFixture(deployFixture);
    await expect(
      kidSafe.connect(parent).registerChild(ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(kidSafe, "InvalidAddress");
  });

  it("cannot register the same child twice", async function () {
    const { kidSafe, parent, child } = await loadFixture(deployFixture);
    await kidSafe.connect(parent).registerChild(child.address);
    await expect(
      kidSafe.connect(parent).registerChild(child.address)
    ).to.be.revertedWithCustomError(kidSafe, "AlreadyRegistered");
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("KidSafe — Allowance", function () {
  it("parent can set (deposit) allowance", async function () {
    const { kidSafe, token, parent, child, kidSafeAddress } =
      await loadFixture(deployFixture);
    await kidSafe.connect(parent).registerChild(child.address);
    await token.connect(parent).approve(kidSafeAddress, toToken(200));

    await expect(kidSafe.connect(parent).setAllowance(child.address, toToken(200)))
      .to.emit(kidSafe, "AllowanceSet")
      .withArgs(child.address, toToken(200));

    const remaining = await kidSafe.getRemainingAllowance(child.address);
    expect(remaining).to.equal(toToken(200));
  });

  it("unauthorized account cannot set allowance — reverts NotParent", async function () {
    const { kidSafe, token, parent, child, stranger, kidSafeAddress } =
      await loadFixture(deployFixture);
    await kidSafe.connect(parent).registerChild(child.address);
    await token.connect(stranger).mint(stranger.address, toToken(100));
    await token.connect(stranger).approve(kidSafeAddress, toToken(100));

    await expect(
      kidSafe.connect(stranger).setAllowance(child.address, toToken(100))
    ).to.be.revertedWithCustomError(kidSafe, "NotParent");
  });

  it("parent can withdraw unused allowance", async function () {
    const { kidSafe, token, parent, child, kidSafeAddress } =
      await loadFixture(deployFixture);
    await kidSafe.connect(parent).registerChild(child.address);
    await token.connect(parent).approve(kidSafeAddress, toToken(300));
    await kidSafe.connect(parent).depositAllowance(child.address, toToken(300));

    const balanceBefore = await token.balanceOf(parent.address);
    await kidSafe.connect(parent).withdrawAllowance(child.address, toToken(100));
    const balanceAfter = await token.balanceOf(parent.address);

    expect(balanceAfter - balanceBefore).to.equal(toToken(100));
    expect(await kidSafe.getRemainingAllowance(child.address)).to.equal(
      toToken(200)
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("KidSafe — Daily Limit", function () {
  it("parent can set a daily limit", async function () {
    const { kidSafe, parent, child } = await loadFixture(deployFixture);
    await kidSafe.connect(parent).registerChild(child.address);

    await expect(
      kidSafe.connect(parent).setDailyLimit(child.address, toToken(50))
    )
      .to.emit(kidSafe, "DailyLimitSet")
      .withArgs(child.address, toToken(50));

    const details = await kidSafe.getChildDetails(child.address);
    expect(details.dailyLimit).to.equal(toToken(50));
  });

  it("unauthorized account cannot set daily limit — reverts NotParent", async function () {
    const { kidSafe, parent, child, stranger } = await loadFixture(deployFixture);
    await kidSafe.connect(parent).registerChild(child.address);
    await expect(
      kidSafe.connect(stranger).setDailyLimit(child.address, toToken(50))
    ).to.be.revertedWithCustomError(kidSafe, "NotParent");
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("KidSafe — Approved Recipients (Whitelist)", function () {
  it("parent can add an approved recipient", async function () {
    const { kidSafe, parent, child, recipient1 } = await loadFixture(deployFixture);
    await kidSafe.connect(parent).registerChild(child.address);

    await expect(
      kidSafe.connect(parent).addApprovedRecipient(child.address, recipient1.address)
    )
      .to.emit(kidSafe, "RecipientAdded")
      .withArgs(child.address, recipient1.address);

    expect(
      await kidSafe.approvedRecipients(child.address, recipient1.address)
    ).to.equal(true);
  });

  it("parent can remove an approved recipient", async function () {
    const { kidSafe, parent, child, recipient1 } = await loadFixture(deployFixture);
    await kidSafe.connect(parent).registerChild(child.address);
    await kidSafe
      .connect(parent)
      .addApprovedRecipient(child.address, recipient1.address);

    await expect(
      kidSafe
        .connect(parent)
        .removeApprovedRecipient(child.address, recipient1.address)
    )
      .to.emit(kidSafe, "RecipientRemoved")
      .withArgs(child.address, recipient1.address);

    expect(
      await kidSafe.approvedRecipients(child.address, recipient1.address)
    ).to.equal(false);
  });

  it("getApprovedRecipients only returns active (non-removed) entries", async function () {
    const { kidSafe, parent, child, recipient1, recipient2 } =
      await loadFixture(deployFixture);
    await kidSafe.connect(parent).registerChild(child.address);
    await kidSafe
      .connect(parent)
      .addApprovedRecipient(child.address, recipient1.address);
    await kidSafe
      .connect(parent)
      .addApprovedRecipient(child.address, recipient2.address);
    await kidSafe
      .connect(parent)
      .removeApprovedRecipient(child.address, recipient1.address);

    const active = await kidSafe.getApprovedRecipients(child.address);
    expect(active.length).to.equal(1);
    expect(active[0]).to.equal(recipient2.address);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("KidSafe — Direct Payments (makePayment)", function () {
  it("child can pay an approved recipient within limits", async function () {
    const { kidSafe, token, kidSafeAsChild, child, recipient1 } =
      await loadFixture(setupChildFixture);

    const recipientBefore = await token.balanceOf(recipient1.address);

    await expect(
      kidSafeAsChild.makePayment(recipient1.address, toToken(30))
    )
      .to.emit(kidSafe, "PaymentMade")
      .withArgs(child.address, recipient1.address, toToken(30), 0n);

    const recipientAfter = await token.balanceOf(recipient1.address);
    expect(recipientAfter - recipientBefore).to.equal(toToken(30));

    // Allowance balance decreases
    expect(await kidSafe.getRemainingAllowance(child.address)).to.equal(
      toToken(470)
    );
    // Daily spending increases
    expect(await kidSafe.getDailySpending(child.address)).to.equal(toToken(30));
  });

  it("child cannot pay an unapproved recipient — reverts RecipientNotApproved", async function () {
    const { kidSafeAsChild, recipient2 } = await loadFixture(setupChildFixture);
    await expect(
      kidSafeAsChild.makePayment(recipient2.address, toToken(10))
    ).to.be.revertedWithCustomError(kidSafeAsChild, "RecipientNotApproved");
  });

  it("child cannot exceed daily limit — reverts DailyLimitExceeded", async function () {
    const { kidSafeAsChild, recipient1 } = await loadFixture(setupChildFixture);
    // Daily limit is $100; try to spend $110 in one go
    await expect(
      kidSafeAsChild.makePayment(recipient1.address, toToken(110))
    ).to.be.revertedWithCustomError(kidSafeAsChild, "DailyLimitExceeded");
  });

  it("child cannot spend more than remaining allowance — reverts InsufficientAllowance", async function () {
    const { kidSafeAsChild, recipient1 } = await loadFixture(setupChildFixture);
    // Allowance is $500, daily limit $100 — need to exceed balance without hitting limit
    // Set no daily limit scenario: use recipient1, amount > 500
    await expect(
      kidSafeAsChild.makePayment(recipient1.address, toToken(600))
    ).to.be.revertedWithCustomError(kidSafeAsChild, "InsufficientAllowance");
  });

  it("daily spend accumulates across multiple payments and blocks at limit", async function () {
    const { kidSafeAsChild, recipient1 } = await loadFixture(setupChildFixture);
    // Daily limit $100: spend $60 + $60 → second should fail
    await kidSafeAsChild.makePayment(recipient1.address, toToken(60));
    await expect(
      kidSafeAsChild.makePayment(recipient1.address, toToken(60))
    ).to.be.revertedWithCustomError(kidSafeAsChild, "DailyLimitExceeded");
  });

  it("allowance balance updates correctly after payment", async function () {
    const { kidSafe, kidSafeAsChild, child, recipient1 } =
      await loadFixture(setupChildFixture);
    await kidSafeAsChild.makePayment(recipient1.address, toToken(45));
    expect(await kidSafe.getRemainingAllowance(child.address)).to.equal(
      toToken(455)
    );
  });

  it("daily spending resets on a new day", async function () {
    const { kidSafe, kidSafeAsChild, child, recipient1 } =
      await loadFixture(setupChildFixture);

    await kidSafeAsChild.makePayment(recipient1.address, toToken(80));
    expect(await kidSafe.getDailySpending(child.address)).to.equal(toToken(80));

    // Advance time by 1 day
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    expect(await kidSafe.getDailySpending(child.address)).to.equal(0n);

    // Child can spend again
    await kidSafeAsChild.makePayment(recipient1.address, toToken(50));
    expect(await kidSafe.getDailySpending(child.address)).to.equal(toToken(50));
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("KidSafe — Request-Based Payments", function () {
  it("child can submit a spending request", async function () {
    const { kidSafe, kidSafeAsChild, child, recipient1 } =
      await loadFixture(setupChildFixture);

    await expect(
      kidSafeAsChild.requestPayment(recipient1.address, toToken(20), "Books")
    )
      .to.emit(kidSafe, "RequestCreated")
      .withArgs(0n, child.address, recipient1.address, toToken(20));

    const req = await kidSafe.getRequest(0n);
    expect(req.status).to.equal(Status.Pending);
    expect(req.amount).to.equal(toToken(20));
    expect(req.memo).to.equal("Books");
  });

  it("parent can approve a valid request — payment executes", async function () {
    const { kidSafe, token, kidSafeAsChild, parent, child, recipient1 } =
      await loadFixture(setupChildFixture);

    await kidSafeAsChild.requestPayment(
      recipient1.address,
      toToken(20),
      "Books"
    );

    const recipientBefore = await token.balanceOf(recipient1.address);

    await expect(kidSafe.connect(parent).approveRequest(0n))
      .to.emit(kidSafe, "RequestApproved")
      .withArgs(0n, parent.address)
      .and.to.emit(kidSafe, "PaymentMade")
      .withArgs(child.address, recipient1.address, toToken(20), 0n);

    const req = await kidSafe.getRequest(0n);
    expect(req.status).to.equal(Status.Approved);

    const recipientAfter = await token.balanceOf(recipient1.address);
    expect(recipientAfter - recipientBefore).to.equal(toToken(20));
  });

  it("unauthorized account cannot approve a request — reverts NotParent", async function () {
    const { kidSafe, kidSafeAsChild, stranger, recipient1 } =
      await loadFixture(setupChildFixture);

    await kidSafeAsChild.requestPayment(
      recipient1.address,
      toToken(20),
      "Books"
    );

    await expect(
      kidSafe.connect(stranger).approveRequest(0n)
    ).to.be.revertedWithCustomError(kidSafe, "NotParent");
  });

  it("parent can reject a request — no tokens transferred", async function () {
    const { kidSafe, token, kidSafeAsChild, parent, child, recipient1 } =
      await loadFixture(setupChildFixture);

    await kidSafeAsChild.requestPayment(
      recipient1.address,
      toToken(20),
      "Video game"
    );

    const recipientBefore = await token.balanceOf(recipient1.address);
    const childAllowanceBefore = await kidSafe.getRemainingAllowance(
      child.address
    );

    await expect(kidSafe.connect(parent).rejectRequest(0n))
      .to.emit(kidSafe, "RequestRejected")
      .withArgs(0n, parent.address);

    const req = await kidSafe.getRequest(0n);
    expect(req.status).to.equal(Status.Rejected);

    // No tokens moved
    expect(await token.balanceOf(recipient1.address)).to.equal(recipientBefore);
    // Allowance unchanged
    expect(await kidSafe.getRemainingAllowance(child.address)).to.equal(
      childAllowanceBefore
    );
  });

  it("rejected request transfers no tokens (explicit balance check)", async function () {
    const { kidSafe, token, kidSafeAsChild, parent, recipient1, kidSafeAddress } =
      await loadFixture(setupChildFixture);

    await kidSafeAsChild.requestPayment(
      recipient1.address,
      toToken(50),
      "Rejected item"
    );

    const contractBefore = await token.balanceOf(kidSafeAddress);
    await kidSafe.connect(parent).rejectRequest(0n);
    const contractAfter = await token.balanceOf(kidSafeAddress);

    expect(contractAfter).to.equal(contractBefore);
  });

  it("cannot approve an already-resolved request — reverts RequestNotPending", async function () {
    const { kidSafe, kidSafeAsChild, parent, recipient1 } =
      await loadFixture(setupChildFixture);

    await kidSafeAsChild.requestPayment(
      recipient1.address,
      toToken(20),
      "Books"
    );
    await kidSafe.connect(parent).approveRequest(0n);

    await expect(
      kidSafe.connect(parent).approveRequest(0n)
    ).to.be.revertedWithCustomError(kidSafe, "RequestNotPending");
  });

  it("cannot reject an already-resolved request — reverts RequestNotPending", async function () {
    const { kidSafe, kidSafeAsChild, parent, recipient1 } =
      await loadFixture(setupChildFixture);

    await kidSafeAsChild.requestPayment(
      recipient1.address,
      toToken(20),
      "Books"
    );
    await kidSafe.connect(parent).rejectRequest(0n);

    await expect(
      kidSafe.connect(parent).rejectRequest(0n)
    ).to.be.revertedWithCustomError(kidSafe, "RequestNotPending");
  });

  it("request fails if child has insufficient allowance — reverts InsufficientAllowance", async function () {
    const { kidSafeAsChild, recipient1 } = await loadFixture(setupChildFixture);
    await expect(
      kidSafeAsChild.requestPayment(
        recipient1.address,
        toToken(1000),
        "Too expensive"
      )
    ).to.be.revertedWithCustomError(kidSafeAsChild, "InsufficientAllowance");
  });

  it("request fails for unapproved recipient — reverts RecipientNotApproved", async function () {
    const { kidSafeAsChild, recipient2 } = await loadFixture(setupChildFixture);
    await expect(
      kidSafeAsChild.requestPayment(
        recipient2.address,
        toToken(10),
        "Unknown shop"
      )
    ).to.be.revertedWithCustomError(kidSafeAsChild, "RecipientNotApproved");
  });

  it("getChildRequests returns all submitted request IDs", async function () {
    const { kidSafe, kidSafeAsChild, child, recipient1 } =
      await loadFixture(setupChildFixture);

    await kidSafeAsChild.requestPayment(recipient1.address, toToken(10), "A");
    await kidSafeAsChild.requestPayment(recipient1.address, toToken(15), "B");

    const ids = await kidSafe.getChildRequests(child.address);
    expect(ids.length).to.equal(2);
    expect(ids[0]).to.equal(0n);
    expect(ids[1]).to.equal(1n);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("KidSafe — Edge Cases", function () {
  it("unregistered child cannot make a payment — reverts NotRegistered", async function () {
    const { kidSafe, child, recipient1 } = await loadFixture(deployFixture);
    await expect(
      kidSafe.connect(child).makePayment(recipient1.address, toToken(10))
    ).to.be.revertedWithCustomError(kidSafe, "NotRegistered");
  });

  it("unregistered child cannot submit a request — reverts NotRegistered", async function () {
    const { kidSafe, child, recipient1 } = await loadFixture(deployFixture);
    await expect(
      kidSafe.connect(child).requestPayment(recipient1.address, toToken(10), "x")
    ).to.be.revertedWithCustomError(kidSafe, "NotRegistered");
  });

  it("payment of zero amount reverts InvalidAmount", async function () {
    const { kidSafeAsChild, recipient1 } = await loadFixture(setupChildFixture);
    await expect(
      kidSafeAsChild.makePayment(recipient1.address, 0n)
    ).to.be.revertedWithCustomError(kidSafeAsChild, "InvalidAmount");
  });

  it("depositing zero allowance reverts InvalidAmount", async function () {
    const { kidSafe, parent, child } = await loadFixture(deployFixture);
    await kidSafe.connect(parent).registerChild(child.address);
    await expect(
      kidSafe.connect(parent).depositAllowance(child.address, 0n)
    ).to.be.revertedWithCustomError(kidSafe, "InvalidAmount");
  });

  it("deploying with zero token address reverts InvalidAddress", async function () {
    const KidSafe = await ethers.getContractFactory("KidSafe");
    await expect(
      KidSafe.deploy(ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(
      await KidSafe.deploy(
        (await (await ethers.getContractFactory("MockUSDC")).deploy()).getAddress()
      ),
      "InvalidAddress"
    );
    // Use a direct approach to avoid double-deploy noise
  });

  it("getChildDetails returns correct values after setup", async function () {
    const { kidSafe, child } = await loadFixture(setupChildFixture);
    const d = await kidSafe.getChildDetails(child.address);
    expect(d.registered).to.equal(true);
    expect(d.allowanceBalance).to.equal(toToken(500));
    expect(d.dailyLimit).to.equal(toToken(100));
    expect(d.dailySpent).to.equal(0n);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("KidSafe — Event Emissions", function () {
  it("emits ChildRegistered on registerChild", async function () {
    const { kidSafe, parent, child } = await loadFixture(deployFixture);
    await expect(kidSafe.connect(parent).registerChild(child.address))
      .to.emit(kidSafe, "ChildRegistered")
      .withArgs(parent.address, child.address);
  });

  it("emits AllowanceDeposited on depositAllowance", async function () {
    const { kidSafe, token, parent, child, kidSafeAddress } =
      await loadFixture(deployFixture);
    await kidSafe.connect(parent).registerChild(child.address);
    await token.connect(parent).approve(kidSafeAddress, toToken(100));
    await expect(
      kidSafe.connect(parent).depositAllowance(child.address, toToken(100))
    )
      .to.emit(kidSafe, "AllowanceDeposited")
      .withArgs(child.address, toToken(100));
  });

  it("emits DailyLimitSet on setDailyLimit", async function () {
    const { kidSafe, parent, child } = await loadFixture(deployFixture);
    await kidSafe.connect(parent).registerChild(child.address);
    await expect(kidSafe.connect(parent).setDailyLimit(child.address, toToken(75)))
      .to.emit(kidSafe, "DailyLimitSet")
      .withArgs(child.address, toToken(75));
  });

  it("emits RecipientAdded on addApprovedRecipient", async function () {
    const { kidSafe, parent, child, recipient1 } = await loadFixture(deployFixture);
    await kidSafe.connect(parent).registerChild(child.address);
    await expect(
      kidSafe.connect(parent).addApprovedRecipient(child.address, recipient1.address)
    )
      .to.emit(kidSafe, "RecipientAdded")
      .withArgs(child.address, recipient1.address);
  });

  it("emits RecipientRemoved on removeApprovedRecipient", async function () {
    const { kidSafe, parent, child, recipient1 } = await loadFixture(deployFixture);
    await kidSafe.connect(parent).registerChild(child.address);
    await kidSafe
      .connect(parent)
      .addApprovedRecipient(child.address, recipient1.address);
    await expect(
      kidSafe
        .connect(parent)
        .removeApprovedRecipient(child.address, recipient1.address)
    )
      .to.emit(kidSafe, "RecipientRemoved")
      .withArgs(child.address, recipient1.address);
  });
});
