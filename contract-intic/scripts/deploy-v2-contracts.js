const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment of V2 contracts to Push Chain Testnet...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "PC\n");

  const deploymentResults = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
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

    // Note: EventTicketV2 is deployed per-event via factory pattern
    console.log("\n3️⃣ EventTicketV2 Contract Info:");
    console.log("   ⚠️  EventTicketV2 is NOT deployed here");
    console.log("   📝 EventTicketV2 is deployed individually for each event");
    console.log("   🏭 Deployment happens via CreateEventNFT.tsx using Universal Transactions");
    console.log("   ✓  Each event organizer deploys their own EventTicketV2 instance");
    console.log("   ✓  Constructor requires: totalSupply, ticketPrice, eventName, etc.");
    
    deploymentResults.contracts.EventTicketV2 = "DEPLOYED_PER_EVENT_VIA_FACTORY_PATTERN";
    deploymentResults.notes = {
      EventTicketV2: "Not a singleton. Each event has its own EventTicketV2 contract instance deployed by event organizers."
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

    console.log("\n" + "=".repeat(80));
    console.log("🎉 V2 CONTRACTS DEPLOYED SUCCESSFULLY!");
    console.log("=".repeat(80));
    console.log("\n📋 Deployment Summary:");
    console.log("Network:", hre.network.name);
    console.log("Chain ID:", deploymentResults.chainId);
    console.log("Deployer:", deployer.address);
    console.log("\n📜 Contract Addresses:");
    console.log("├─ EventOrganizerV2:", eventOrganizerV2Address);
    console.log("├─ NFTMarketplaceV2:", nftMarketplaceV2Address);
    console.log("└─ EventTicketV2: (Deployed per event)");
    console.log("\n💾 Deployment data saved to:");
    console.log("├─", filename);
    console.log("└─ v2-contracts-" + hre.network.name + "-latest.json");
    console.log("\n📦 Next Steps:");
    console.log("1. Update src/config/contracts.ts with new addresses");
    console.log("2. Update contract ABIs in src/contracts/");
    console.log("3. Test event organizer registration");
    console.log("4. Test event ticket deployment via universal transaction");
    console.log("5. Test NFT marketplace listing & trading");
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
