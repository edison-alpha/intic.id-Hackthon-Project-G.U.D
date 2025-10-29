const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying V3 Contracts to Push Chain Testnet...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  const network = await hre.ethers.provider.getNetwork();
  
  const deploymentResults = {
    network: hre.network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  try {
    // 1. Deploy EventOrganizerLibrary first
    console.log("1️⃣ Deploying EventOrganizerLibrary...");
    const EventOrganizerLibrary = await hre.ethers.getContractFactory("EventOrganizerLibrary");
    const library = await EventOrganizerLibrary.deploy();
    await library.waitForDeployment();
    const libraryAddress = await library.getAddress();
    console.log("✅ EventOrganizerLibrary deployed to:", libraryAddress);
    deploymentResults.contracts.EventOrganizerLibrary = libraryAddress;

    // 2. Deploy EventOrganizerV2 with library link
    console.log("\n2️⃣ Deploying EventOrganizerV2...");
    const EventOrganizerV2 = await hre.ethers.getContractFactory("EventOrganizerV2", {
      libraries: {
        EventOrganizerLibrary: libraryAddress
      }
    });
    const eventOrganizer = await EventOrganizerV2.deploy();
    await eventOrganizer.waitForDeployment();
    const eventOrganizerAddress = await eventOrganizer.getAddress();
    console.log("✅ EventOrganizerV2 deployed to:", eventOrganizerAddress);
    deploymentResults.contracts.EventOrganizerV2 = eventOrganizerAddress;

    // 2. Deploy NFTMarketplaceV2
    console.log("\n3️⃣ Deploying NFTMarketplaceV2...");
    const NFTMarketplaceV2 = await hre.ethers.getContractFactory("NFTMarketplaceV2");
    const marketplace = await NFTMarketplaceV2.deploy();
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("✅ NFTMarketplaceV2 deployed to:", marketplaceAddress);
    deploymentResults.contracts.NFTMarketplaceV2 = marketplaceAddress;

    // 3. Example: Deploy EventTicketV3
    console.log("\n4️⃣ Deploying Example EventTicketV3...");
    console.log("   (Creating sample event for testing)");
    
    const EventTicketV3 = await hre.ethers.getContractFactory("EventTicketV3");
    
    // Sample event parameters
    const totalSupply = 100;  // 100 tickets
    const ticketPrice = hre.ethers.parseEther("0.01");  // 0.01 ETH per ticket
    const nftName = "Rock Festival 2025 Tickets";
    const nftSymbol = "RF2025";
    const eventName = "Rock Festival 2025";
    const eventDate = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);  // 30 days from now
    const eventVenue = "Jakarta International Stadium";
    const venueAddress = "Jl. RE Martadinata, Jakarta Utara";
    const venueCoordinates = "-6.1234,106.7890";
    const eventImageUri = "ipfs://QmSampleEventImage";
    const metadataUri = "ipfs://QmSampleMetadata/";
    const eventDescription = "Indonesia's biggest rock festival";

    const eventTicket = await EventTicketV3.deploy(
      totalSupply,
      ticketPrice,
      nftName,
      nftSymbol,
      eventName,
      eventDate,
      eventVenue,
      venueAddress,
      venueCoordinates,
      eventImageUri,
      metadataUri,
      eventOrganizerAddress,  // Link to EventOrganizer
      eventDescription
    );
    
    await eventTicket.waitForDeployment();
    const eventTicketAddress = await eventTicket.getAddress();
    console.log("✅ EventTicketV3 (Sample) deployed to:", eventTicketAddress);
    deploymentResults.contracts.EventTicketV3_Sample = {
      address: eventTicketAddress,
      eventName: eventName,
      totalSupply: totalSupply,
      ticketPrice: hre.ethers.formatEther(ticketPrice) + " ETH"
    };

    // Save deployment results
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `v3-contracts-${hre.network.name}-${timestamp}.json`;
    const filepath = path.join(deploymentsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(deploymentResults, null, 2));
    
    // Also save as latest
    const latestFilepath = path.join(deploymentsDir, `v3-contracts-${hre.network.name}-latest.json`);
    fs.writeFileSync(latestFilepath, JSON.stringify(deploymentResults, null, 2));

    console.log("\n" + "=".repeat(80));
    console.log("🎉 ALL V3 CONTRACTS DEPLOYED SUCCESSFULLY!");
    console.log("=".repeat(80));
    console.log("\n📋 Deployment Summary:");
    console.log("Network:", hre.network.name);
    console.log("Chain ID:", deploymentResults.chainId);
    console.log("Deployer:", deployer.address);
    console.log("\n📜 Contract Addresses:");
    console.log("├─ EventOrganizerLibrary:", libraryAddress);
    console.log("├─ EventOrganizerV2:", eventOrganizerAddress);
    console.log("├─ NFTMarketplaceV2:", marketplaceAddress);
    console.log("└─ EventTicketV3 (Sample):", eventTicketAddress);
    console.log("\n💾 Deployment data saved to:");
    console.log("├─", filename);
    console.log("└─ v3-contracts-" + hre.network.name + "-latest.json");
    console.log("\n" + "=".repeat(80));

    console.log("\n📝 Next Steps:");
    console.log("1. Update .env file with deployed addresses");
    console.log("2. Verify contracts on Push Chain Explorer:");
    console.log("   npx hardhat verify --network pushTestnet <address> <constructor-args>");
    console.log("3. Create new events using EventOrganizerV2.createEvent()");
    console.log("4. Test ticket minting with EventTicketV3.mintTicketWithURI()");
    console.log("\n✅ Deployment Complete!");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
