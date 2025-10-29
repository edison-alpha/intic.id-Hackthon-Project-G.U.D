/**
 * Deploy EventOrganizerV2 with Factory Pattern
 *
 * This script deploys EventOrganizerV2 with createEvent factory function
 * that allows users to create events via Universal Wallet from any chain
 *
 * Usage:
 * npx hardhat run scripts/deploy-event-organizer-v2-factory.js --network pushTestnet
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  🏭 EventOrganizerV2 Factory Pattern Deployment            ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  // Get network info
  const network = await hre.ethers.provider.getNetwork();
  console.log("🌐 Network:", hre.network.name);
  console.log("🔗 Chain ID:", network.chainId.toString());
  console.log();

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deployer Account:", deployer.address);

  // Get balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceInPC = hre.ethers.formatEther(balance);
  console.log("💰 Balance:", balanceInPC, "PC");
  console.log();

  // Check if balance is sufficient
  const requiredBalance = hre.ethers.parseEther("0.05");
  if (balance < requiredBalance) {
    console.error("❌ ERROR: Insufficient balance!");
    console.error("   Required: 0.05 PC");
    console.error("   Current:", balanceInPC, "PC");
    console.error();
    console.error("   Please fund your wallet:");
    console.error("   1. Go to: https://faucet.push.org/");
    console.error("   2. Enter your address:", deployer.address);
    console.error("   3. Request testnet PC tokens");
    console.error();
    process.exit(1);
  }

  console.log("✅ Balance check passed!");
  console.log();

  // Deploy EventOrganizerV2
  console.log("📦 Deploying EventOrganizerV2...");
  const EventOrganizerV2 = await hre.ethers.getContractFactory("EventOrganizerV2");
  const eventOrganizer = await EventOrganizerV2.deploy();

  await eventOrganizer.waitForDeployment();
  const eventOrganizerAddress = await eventOrganizer.getAddress();

  console.log("✅ EventOrganizerV2 deployed to:", eventOrganizerAddress);
  console.log();

  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const owner = await eventOrganizer.owner();
  console.log("   Owner:", owner);
  console.log("   Deployer:", deployer.address);
  console.log("   Match:", owner === deployer.address ? "✅" : "❌");
  console.log();

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      EventOrganizerV2: eventOrganizerAddress,
    },
    transactionHash: eventOrganizer.deploymentTransaction()?.hash,
  };

  console.log("📄 Deployment Summary:");
  console.log("   Network:", deploymentInfo.network);
  console.log("   Chain ID:", deploymentInfo.chainId);
  console.log("   Timestamp:", deploymentInfo.timestamp);
  console.log("   Transaction:", deploymentInfo.transactionHash);
  console.log();

  // Instructions
  console.log("📋 Next Steps:");
  console.log();
  console.log("1. Update frontend config:");
  console.log("   File: src/config/contracts.ts");
  console.log(`   EventOrganizer: '${eventOrganizerAddress}',`);
  console.log();
  console.log("2. Update EventOrganizer.json ABI:");
  console.log("   File: src/contracts/EventOrganizer.json");
  console.log("   Copy from: contract-intic/artifacts/contracts/EventOrganizerV2.sol/EventOrganizerV2.json");
  console.log();
  console.log("3. Verify on explorer:");
  console.log(`   https://testnet.explorer.push.org/address/${eventOrganizerAddress}`);
  console.log();
  console.log("4. Test createEvent function:");
  console.log("   - Register as EO (if not already)");
  console.log("   - Create event from any chain via Universal Wallet");
  console.log("   - Mint NFT from any chain");
  console.log();

  // Save to file
  const fs = require("fs");
  const path = require("path");
  const deploymentsDir = path.join(__dirname, "../deployments");

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `event-organizer-v2-factory-${hre.network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to:", filename);
  console.log();

  console.log("✅ Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
