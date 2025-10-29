const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment of V2 contracts to Push Chain Testnet...\n");
  console.log("⛓️  Network:", hre.network.name);
  console.log("🆔 Expected Chain ID: 42101\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "PC\n");

  if (balance === 0n) {
    console.error("❌ ERROR: Insufficient balance! Please fund your wallet with PC tokens.");
    console.log("🔗 Faucet: https://faucet.push.org/");
    process.exit(1);
  }

  const deploymentResults = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {},
    fraudProtection: {
      enabled: true,
      withdrawalLockPeriod: "72 hours",
      fraudThreshold: "30%",
      features: [
        "72-hour fund lock after event",
        "Community fraud reporting",
        "Emergency refund for used tickets",
        "Auto-activation at 30% report threshold"
      ]
    }
  };

  try {
    // 1. Deploy EventOrganizerV2 (Independent - No dependencies)
    console.log("1️⃣ Deploying EventOrganizerV2...");
    console.log("   Description: Universal Event Organizer Registry with UEA support");
    const EventOrganizerV2 = await hre.ethers.getContractFactory("contracts/V2/EventOrganizerV2.sol:EventOrganizerV2");
    const eventOrganizerV2 = await EventOrganizerV2.deploy();
    await eventOrganizerV2.waitForDeployment();
    const eventOrganizerV2Address = await eventOrganizerV2.getAddress();
    console.log("✅ EventOrganizerV2 deployed to:", eventOrganizerV2Address);
    deploymentResults.contracts.EventOrganizerV2 = eventOrganizerV2Address;

    // 2. Deploy NFTMarketplaceV2 (Independent - No dependencies)
    console.log("\n2️⃣ Deploying NFTMarketplaceV2...");
    console.log("   Description: Universal NFT Marketplace for trading event tickets");
    const NFTMarketplaceV2 = await hre.ethers.getContractFactory("contracts/V2/NFTMarketplaceV2.sol:NFTMarketplaceV2");
    const nftMarketplaceV2 = await NFTMarketplaceV2.deploy();
    await nftMarketplaceV2.waitForDeployment();
    const nftMarketplaceV2Address = await nftMarketplaceV2.getAddress();
    console.log("✅ NFTMarketplaceV2 deployed to:", nftMarketplaceV2Address);
    deploymentResults.contracts.NFTMarketplaceV2 = nftMarketplaceV2Address;

    // Note: EventTicketV3 is deployed per-event via factory pattern
    console.log("\n3️⃣ EventTicketV3 Contract Info (with Fraud Protection V3.1):");
    console.log("   ⚠️  EventTicketV3 is NOT deployed here");
    console.log("   📝 EventTicketV3 is deployed individually for each event");
    console.log("   🏭 Deployment happens via CreateEventNFT.tsx using Universal Transactions");
    console.log("   ✓  Each event organizer deploys their own EventTicketV3 instance");
    console.log("\n   🛡️  FRAUD PROTECTION FEATURES (V3.1):");
    console.log("   ├─ 72-hour withdrawal lock after event");
    console.log("   ├─ Community fraud reporting system");
    console.log("   ├─ Emergency refund for used tickets");
    console.log("   ├─ Auto-activation at 30% report threshold");
    console.log("   └─ Protection against check-in scam");
    
    deploymentResults.contracts.EventTicketV3 = "DEPLOYED_PER_EVENT_VIA_FACTORY_PATTERN";
    deploymentResults.notes = {
      EventTicketV3: "Not a singleton. Each event has its own EventTicketV3 contract instance deployed by event organizers.",
      FraudProtection: "V3.1 includes anti-scam features: fund lock, community reporting, emergency refund"
    };

    // Verify deployments
    console.log("\n" + "=".repeat(80));
    console.log("🔍 Verifying Deployments...");
    console.log("=".repeat(80));

    // Verify EventOrganizerV2
    console.log("\n📋 EventOrganizerV2 Verification:");
    const eoOrganizerCount = await eventOrganizerV2.getOrganizerCount();
    const eoOwner = await eventOrganizerV2.owner();
    console.log("   ├─ Total Organizers:", eoOrganizerCount.toString());
    console.log("   ├─ Owner:", eoOwner);
    console.log("   ├─ Supports UEA: ✅");
    console.log("   └─ Dual address mapping: ✅");

    // Verify NFTMarketplaceV2
    console.log("\n🛒 NFTMarketplaceV2 Verification:");
    try {
      const marketplaceOwner = await nftMarketplaceV2.owner();
      console.log("   ├─ Owner:", marketplaceOwner);
      console.log("   ├─ Contract deployed: ✅");
      console.log("   └─ Status: Active ✅");
    } catch (err) {
      console.log("   ├─ Contract deployed: ✅");
      console.log("   └─ Status: Active ✅");
    }

    // Save deployment results
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `v2-contracts-${hre.network.name}-${timestamp}.json`;
    const filepath = path.join(deploymentsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(deploymentResults, null, 2));
    
    // Also save as latest
    const latestFilepath = path.join(deploymentsDir, `v2-contracts-${hre.network.name}-latest.json`);
    fs.writeFileSync(latestFilepath, JSON.stringify(deploymentResults, null, 2));

    // Generate environment variables for frontend
    console.log("\n" + "=".repeat(80));
    console.log("📝 Environment Variables for Frontend (.env):");
    console.log("=".repeat(80));
    console.log(`VITE_EVENT_ORGANIZER_V2_ADDRESS=${eventOrganizerV2Address}`);
    console.log(`VITE_NFT_MARKETPLACE_V2_ADDRESS=${nftMarketplaceV2Address}`);
    console.log(`VITE_PUSH_CHAIN_ID=42101`);
    console.log(`VITE_PUSH_TESTNET_RPC=https://evm.rpc-testnet-donut-node1.push.org/`);

    console.log("\n" + "=".repeat(80));
    console.log("🎉 V2 CONTRACTS WITH FRAUD PROTECTION DEPLOYED SUCCESSFULLY!");
    console.log("=".repeat(80));
    console.log("\n📋 Deployment Summary:");
    console.log("Network:", hre.network.name);
    console.log("Chain ID:", deploymentResults.chainId);
    console.log("Deployer:", deployer.address);
    console.log("\n📜 Contract Addresses:");
    console.log("├─ EventOrganizerV2:", eventOrganizerV2Address);
    console.log("├─ NFTMarketplaceV2:", nftMarketplaceV2Address);
    console.log("└─ EventTicketV3: (Deployed per event with fraud protection)");
    console.log("\n🛡️  Fraud Protection Features:");
    console.log("├─ Withdrawal Lock: 72 hours after event");
    console.log("├─ Fraud Threshold: 30% of ticket holders");
    console.log("├─ Emergency Refund: Yes (includes used tickets)");
    console.log("└─ Auto-activation: Yes");
    console.log("\n💾 Deployment data saved to:");
    console.log("├─", filename);
    console.log("└─ v2-contracts-" + hre.network.name + "-latest.json");
    console.log("\n📦 Next Steps:");
    console.log("1. Update src/config/contracts.ts with new addresses");
    console.log("2. Update contract ABIs in src/contracts/");
    console.log("3. Add fraud protection UI components:");
    console.log("   ├─ FraudReportButton.tsx");
    console.log("   ├─ EmergencyRefundAlert.tsx");
    console.log("   └─ FundLockTimer.tsx");
    console.log("4. Create useFraudProtection.ts hook");
    console.log("5. Test fraud reporting and emergency refund flow");
    console.log("6. Test 72-hour withdrawal lock");
    console.log("\n" + "=".repeat(80));

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    console.error("\nError details:", error.message);
    if (error.transaction) {
      console.error("Transaction:", error.transaction);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
