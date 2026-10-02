/**
 * deploy.js
 * ---------
 * Deploys MockUSDC and KidSafe to the target network.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network localhost
 *
 * After running, copy the printed addresses into frontend/.env
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=================================================");
  console.log("  KidSafe Deployment");
  console.log("=================================================");
  console.log(`  Deployer : ${deployer.address}`);
  console.log(
    `  Balance  : ${ethers.formatUnits(
      await ethers.provider.getBalance(deployer.address),
      18
    )} ETH`
  );
  console.log("");

  // ── 1. Deploy MockUSDC ────────────────────────────
  console.log("Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log(`  ✓ MockUSDC deployed  → ${usdcAddress}`);

  // ── 2. Deploy KidSafe ─────────────────────────────
  console.log("Deploying KidSafe...");
  const KidSafe = await ethers.getContractFactory("KidSafe");
  const kidSafe = await KidSafe.deploy(usdcAddress);
  await kidSafe.waitForDeployment();
  const kidSafeAddress = await kidSafe.getAddress();
  console.log(`  ✓ KidSafe deployed   → ${kidSafeAddress}`);

  console.log("");
  console.log("=================================================");
  console.log("  Copy these values into frontend/.env");
  console.log("=================================================");
  console.log(`VITE_KIDSAFE_CONTRACT_ADDRESS=${kidSafeAddress}`);
  console.log(`VITE_TOKEN_CONTRACT_ADDRESS=${usdcAddress}`);
  console.log(`VITE_CHAIN_ID=31337`);
  console.log("=================================================");

  // ── 3. Write addresses to a JSON file for seed script ─
  const deploymentDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deployment = {
    network: "localhost",
    chainId: 31337,
    deployer: deployer.address,
    MockUSDC: usdcAddress,
    KidSafe: kidSafeAddress,
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(deploymentDir, "localhost.json");
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log(`\n  Deployment info saved → ${outPath}`);

  // ── 4. Write ABI files for the frontend ──────────────
  await exportABI("MockUSDC", deploymentDir);
  await exportABI("KidSafe", deploymentDir);
  console.log("  ABI files exported   → deployments/");
  console.log("");
}

/**
 * Reads the compiled artifact and writes the ABI to deployments/<Name>.abi.json
 */
async function exportABI(contractName, deploymentDir) {
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    `${contractName}.sol`,
    `${contractName}.json`
  );

  if (!fs.existsSync(artifactPath)) {
    console.warn(
      `  ⚠ Artifact not found for ${contractName} — run 'npx hardhat compile' first`
    );
    return;
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abiPath = path.join(deploymentDir, `${contractName}.abi.json`);
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
