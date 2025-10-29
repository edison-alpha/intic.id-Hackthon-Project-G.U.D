/**
 * Deploy V3 Optimized Contracts
 * 
 * This script deploys the size-optimized version of V3 contracts
 * which resolves the "Contract code size exceeds 24576 bytes" error
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying V3 Optimized Contracts to Push Chain Testnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const deployedContracts = {};

  try {
    // ===================================
    // 1. Deploy EventOrganizerLibrary
    // ===================================
    console.log("📦 1/4 Deploying EventOrganizerLibrary...");
    const EventOrganizerLibrary = await ethers.getContractFactory("EventOrganizerLibrary");
    const library = await EventOrganizerLibrary.deploy();
    await library.waitForDeployment();
    const libraryAddress = await library.getAddress();
    console.log("✅ EventOrganizerLibrary deployed to:", libraryAddress);
    deployedContracts.EventOrganizerLibrary = libraryAddress;

    // ===================================
    // 2. Deploy EventOrganizerV3 (EventOrganizerV2)
    // ===================================
    console.log("\n📦 2/4 Deploying EventOrganizerV3...");
    const EventOrganizerV3 = await ethers.getContractFactory("contracts/V3/EventOrganizerV3.sol:EventOrganizerV2", {
      libraries: {
        EventOrganizerLibrary: libraryAddress,
      },
    });
    const eventOrganizer = await EventOrganizerV3.deploy();
    await eventOrganizer.waitForDeployment();
    const eventOrganizerAddress = await eventOrganizer.getAddress();
    console.log("✅ EventOrganizerV3 deployed to:", eventOrganizerAddress);
    deployedContracts.EventOrganizerV3 = eventOrganizerAddress;

    // ===================================
    // 3. Deploy NFTMarketplaceV3-Optimized
    // ===================================
    console.log("\n📦 3/4 Deploying NFTMarketplaceV3-Optimized...");
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplaceV3Optimized");
    const marketplace = await NFTMarketplace.deploy();
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("✅ NFTMarketplaceV3-Optimized deployed to:", marketplaceAddress);
    deployedContracts.NFTMarketplaceV3Optimized = marketplaceAddress;

    // Get contract size
    const marketplaceCode = await ethers.provider.getCode(marketplaceAddress);
    const marketplaceSize = (marketplaceCode.length - 2) / 2; // Remove '0x' and convert hex to bytes
    console.log(`   📏 Contract size: ${marketplaceSize} bytes (limit: 24576 bytes)`);
    console.log(`   ${marketplaceSize <= 24576 ? '✅ PASS' : '❌ FAIL'} - Size check`);

    // ===================================
    // 4. Deploy Sample EventTicketV3
    // ===================================
    console.log("\n📦 4/4 Deploying Sample EventTicketV3...");
    
    const eventData = {
      totalSupply: 100,
      ticketPrice: ethers.parseEther("0.01"),
      nftName: "Sample Event V3 Optimized",
      nftSymbol: "SEVTV3",
      eventName: "V3 Optimized Test Event",
      eventDate: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days from now
      eventVenue: "Push Chain Convention Center",
      venueAddress: "123 Blockchain Street, Web3 City",
      venueCoordinates: "40.7128,-74.0060",
      eventImageUri: "ipfs://QmTest123",
      metadataUri: "ipfs://QmMetadata123/",
      eventOrganizerContract: eventOrganizerAddress,
      eventDescription: "Test event for V3 optimized deployment"
    };

    const EventTicketV3 = await ethers.getContractFactory("EventTicketV3");
    const sampleTicket = await EventTicketV3.deploy(
      eventData.totalSupply,
      eventData.ticketPrice,
      eventData.nftName,
      eventData.nftSymbol,
      eventData.eventName,
      eventData.eventDate,
      eventData.eventVenue,
      eventData.venueAddress,
      eventData.venueCoordinates,
      eventData.eventImageUri,
      eventData.metadataUri,
      eventData.eventOrganizerContract,
      eventData.eventDescription
    );
    await sampleTicket.waitForDeployment();
    const sampleTicketAddress = await sampleTicket.getAddress();
    console.log("✅ Sample EventTicketV3 deployed to:", sampleTicketAddress);
    deployedContracts.SampleEventTicketV3 = sampleTicketAddress;

    // ===================================
    // Save Deployment Info
    // ===================================
    const deploymentInfo = {
      network: hre.network.name,
      chainId: (await ethers.provider.getNetwork()).chainId.toString(),
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: deployedContracts,
      contractSizes: {
        NFTMarketplaceV3Optimized: `${marketplaceSize} bytes`,
      },
      notes: "V3 Optimized deployment - resolved contract size limit issue"
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `v3-optimized-${hre.network.name}-${timestamp}.json`;
    const filepath = path.join(deploymentsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
    
    // Also save as latest
    const latestFilepath = path.join(deploymentsDir, `v3-optimized-${hre.network.name}-latest.json`);
    fs.writeFileSync(latestFilepath, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n" + "=".repeat(60));
    console.log("✅ V3 OPTIMIZED DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(60));
    console.log("\n📄 Deployment Details:");
    console.log("   Network:", hre.network.name);
    console.log("   Chain ID:", deploymentInfo.chainId);
    console.log("   Deployer:", deployer.address);
    console.log("\n📝 Deployed Contracts:");
    Object.entries(deployedContracts).forEach(([name, address]) => {
      console.log(`   ${name}: ${address}`);
    });
    console.log("\n💾 Deployment saved to:", filename);
    console.log("💾 Latest deployment:", `v3-optimized-${hre.network.name}-latest.json`);
    console.log("\n🔍 Verify contracts with:");
    console.log(`   npx hardhat verify --network ${hre.network.name} ${marketplaceAddress}`);

    console.log("\n" + "=".repeat(60));
    console.log("📊 SIZE COMPARISON:");
    console.log("=".repeat(60));
    console.log("   NFTMarketplaceV3 (Original):  29134 bytes ❌");
    console.log(`   NFTMarketplaceV3 (Optimized): ${marketplaceSize} bytes ✅`);
    console.log(`   Size Reduction: ${29134 - marketplaceSize} bytes (${((1 - marketplaceSize/29134) * 100).toFixed(1)}%)`);
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
