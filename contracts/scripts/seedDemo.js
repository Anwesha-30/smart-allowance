/**
 * seedDemo.js
 * -----------
 * Seeds the local Hardhat network with realistic demo data.
 *
 * What this script does:
 *  1. Reads deployed contract addresses from deployments/localhost.json
 *  2. Uses account[0] as the PARENT and account[1] as the CHILD
 *  3. Mints MockUSDC to the parent
 *  4. Registers the child under the parent
 *  5. Sets a $500 monthly allowance and a $50 daily limit
 *  6. Whitelists three example recipient addresses
 *  7. Makes a few direct payments (so transaction history exists)
 *  8. Creates one pending spending request
 *
 * Usage:
 *   npx hardhat run scripts/seedDemo.js --network localhost
 *
 * Run AFTER deploy.js.
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// 6-decimal token amounts (matching MockUSDC)
const DECIMALS = 6n;
const toToken = (amount) => BigInt(amount) * 10n ** DECIMALS;

async function main() {
  const signers = await ethers.getSigners();
  const parent = signers[0];
  const child = signers[1];
  // Use accounts 2–4 as demo recipients
  const recipient1 = signers[2];
  const recipient2 = signers[3];
  const recipient3 = signers[4];

  console.log("=================================================");
  console.log("  KidSafe Demo Seed");
  console.log("=================================================");
  console.log(`  Parent   : ${parent.address}`);
  console.log(`  Child    : ${child.address}`);
  console.log(`  Recip 1  : ${recipient1.address}  (School Store)`);
  console.log(`  Recip 2  : ${recipient2.address}  (Bookshop)`);
  console.log(`  Recip 3  : ${recipient3.address}  (Lunch Canteen)`);
  console.log("");

  // ── Load deployment addresses ─────────────────────
  const deploymentPath = path.join(
    __dirname,
    "..",
    "deployments",
    "localhost.json"
  );

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      "deployments/localhost.json not found. Run deploy.js first."
    );
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log(`  KidSafe  : ${deployment.KidSafe}`);
  console.log(`  MockUSDC : ${deployment.MockUSDC}`);
  console.log("");

  // ── Attach contracts ──────────────────────────────
  const token = await ethers.getContractAt(
    "MockUSDC",
    deployment.MockUSDC,
    parent
  );
  const kidSafe = await ethers.getContractAt(
    "KidSafe",
    deployment.KidSafe,
    parent
  );
  const kidSafeAsChild = kidSafe.connect(child);

  // ── 1. Mint tokens to the parent ─────────────────
  const mintAmount = toToken(2000); // 2,000 mUSDC
  console.log(`Minting ${formatToken(mintAmount)} mUSDC to parent...`);
  await (await token.ownerMint(parent.address, mintAmount)).wait();
  console.log(
    `  ✓ Parent balance: ${formatToken(
      await token.balanceOf(parent.address)
    )} mUSDC`
  );

  // ── 2. Register child ─────────────────────────────
  console.log("\nRegistering child wallet...");
  try {
    await (await kidSafe.registerChild(child.address)).wait();
    console.log("  ✓ Child registered");
  } catch (e) {
    // AlreadyRegistered — safe to ignore during re-runs
    console.log("  ℹ Child already registered — skipping");
  }

  // ── 3. Set daily limit first (before deposit) ────
  const dailyLimit = toToken(50); // $50/day
  console.log(`\nSetting daily limit to ${formatToken(dailyLimit)} mUSDC...`);
  await (await kidSafe.setDailyLimit(child.address, dailyLimit)).wait();
  console.log("  ✓ Daily limit set");

  // ── 4. Approve KidSafe to spend parent's tokens ──
  const allowanceAmount = toToken(500); // $500 monthly allowance
  console.log(`\nApproving KidSafe to spend ${formatToken(allowanceAmount)} mUSDC...`);
  await (
    await token.approve(deployment.KidSafe, allowanceAmount)
  ).wait();

  // ── 5. Deposit allowance ──────────────────────────
  console.log(`Depositing ${formatToken(allowanceAmount)} mUSDC as child's allowance...`);
  await (
    await kidSafe.depositAllowance(child.address, allowanceAmount)
  ).wait();
  console.log("  ✓ Allowance deposited");

  // ── 6. Whitelist recipients ───────────────────────
  console.log("\nWhitelisting approved recipients...");
  await (
    await kidSafe.addApprovedRecipient(child.address, recipient1.address)
  ).wait();
  console.log(`  ✓ School Store  (${recipient1.address})`);

  await (
    await kidSafe.addApprovedRecipient(child.address, recipient2.address)
  ).wait();
  console.log(`  ✓ Bookshop      (${recipient2.address})`);

  await (
    await kidSafe.addApprovedRecipient(child.address, recipient3.address)
  ).wait();
  console.log(`  ✓ Lunch Canteen (${recipient3.address})`);

  // ── 7. Make a few direct payments (history) ──────
  console.log("\nCreating example transaction history...");

  await (
    await kidSafeAsChild.makePayment(recipient1.address, toToken(12))
  ).wait();
  console.log(`  ✓ Paid School Store   $12`);

  await (
    await kidSafeAsChild.makePayment(recipient3.address, toToken(8))
  ).wait();
  console.log(`  ✓ Paid Lunch Canteen  $8`);

  await (
    await kidSafeAsChild.makePayment(recipient2.address, toToken(15))
  ).wait();
  console.log(`  ✓ Paid Bookshop       $15`);

  // ── 8. Create a pending request ───────────────────
  console.log("\nCreating pending spending request...");
  await (
    await kidSafeAsChild.requestPayment(
      recipient1.address,
      toToken(25),
      "New school supplies"
    )
  ).wait();
  console.log(`  ✓ Request submitted: $25 for 'New school supplies'`);

  // ── 9. Print final state ──────────────────────────
  const details = await kidSafe.getChildDetails(child.address);
  console.log("\n=================================================");
  console.log("  Demo State Summary");
  console.log("=================================================");
  console.log(`  Child allowance  : ${formatToken(details.allowanceBalance)} mUSDC`);
  console.log(`  Daily limit      : ${formatToken(details.dailyLimit)} mUSDC`);
  console.log(`  Spent today      : ${formatToken(details.dailySpent)} mUSDC`);
  console.log(`  Pending requests : 1`);
  console.log("");
  console.log("  Addresses to use in MetaMask:");
  console.log(`    Parent  account[0] — already imported if using Hardhat node`);
  console.log(`    Child   account[1] — import private key from 'npx hardhat node' output`);
  console.log("=================================================\n");
}

function formatToken(amount) {
  return (Number(amount) / 1_000_000).toFixed(2);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
