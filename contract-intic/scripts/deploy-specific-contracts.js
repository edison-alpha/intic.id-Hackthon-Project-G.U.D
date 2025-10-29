const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment of EventOrganizerV2, EventTicketV3, and NFTMarketplaceV2...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  const deploymentResults = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  try {
    // 1. Deploy EventOrganizerLibrary first
    console.log("1️⃣ Deploying EventOrganizerLibrary...");
    const EventOrganizerLibrary = await hre.ethers.getContractFactory("EventOrganizerLibrary");
    const eventOrganizerLibrary = await EventOrganizerLibrary.deploy();
    await eventOrganizerLibrary.waitForDeployment();
    const eventOrganizerLibraryAddress = await eventOrganizerLibrary.getAddress();
    console.log("✅ EventOrganizerLibrary deployed to:", eventOrganizerLibraryAddress);
    deploymentResults.contracts.EventOrganizerLibrary = eventOrganizerLibraryAddress;

    // 2. Deploy EventOrganizerV2 with library linking
    console.log("\n2️⃣ Deploying EventOrganizerV2...");
    const EventOrganizerV2 = await hre.ethers.getContractFactory("EventOrganizerV2", {
      libraries: {
        EventOrganizerLibrary: eventOrganizerLibraryAddress,
      },
    });
    const eventOrganizerV2 = await EventOrganizerV2.deploy();
    await eventOrganizerV2.waitForDeployment();
    const eventOrganizerV2Address = await eventOrganizerV2.getAddress();
    console.log("✅ EventOrganizerV2 deployed to:", eventOrganizerV2Address);
    deploymentResults.contracts.EventOrganizerV2 = eventOrganizerV2Address;

    // 3. Deploy NFTMarketplaceV2
    console.log("\n3️⃣ Deploying NFTMarketplaceV2...");
    const NFTMarketplaceV2 = await hre.ethers.getContractFactory("NFTMarketplaceV2");
    const nftMarketplaceV2 = await NFTMarketplaceV2.deploy();
    await nftMarketplaceV2.waitForDeployment();
    const nftMarketplaceV2Address = await nftMarketplaceV2.getAddress();
    console.log("✅ NFTMarketplaceV2 deployed to:", nftMarketplaceV2Address);
    deploymentResults.contracts.NFTMarketplaceV2 = nftMarketplaceV2Address;

    // 4. Deploy EventTicketV3 (requires EventOrganizerV2 address)
    console.log("\n4️⃣ Deploying EventTicketV3...");

    // Example parameters for EventTicketV3 constructor
    const ticketParams = {
      totalSupply: 1000, // Max supply
      ticketPrice: hre.ethers.parseEther("0.1"), // 0.1 ETH per ticket
      nftName: "Sample Event Tickets",
      nftSymbol: "SET",
      eventName: "Sample Event",
      eventDate: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
      eventVenue: "Sample Venue",
      venueAddress: "123 Sample Street, Sample City",
      venueCoordinates: "40.7128,-74.0060", // NYC coordinates as example
      eventImageUri: "https://example.com/event-image.png",
      metadataUri: "https://example.com/metadata/",
      eventOrganizerContract: eventOrganizerV2Address, // Use deployed EventOrganizerV2
      eventDescription: "This is a sample event for demonstration purposes."
    };

    const EventTicketV3 = await hre.ethers.getContractFactory("EventTicketV3");
    const eventTicketV3 = await EventTicketV3.deploy(
      ticketParams.totalSupply,
      ticketParams.ticketPrice,
      ticketParams.nftName,
      ticketParams.nftSymbol,
      ticketParams.eventName,
      ticketParams.eventDate,
      ticketParams.eventVenue,
      ticketParams.venueAddress,
      ticketParams.venueCoordinates,
      ticketParams.eventImageUri,
      ticketParams.metadataUri,
      ticketParams.eventOrganizerContract,
      ticketParams.eventDescription
    );
    await eventTicketV3.waitForDeployment();
    const eventTicketV3Address = await eventTicketV3.getAddress();
    console.log("✅ EventTicketV3 deployed to:", eventTicketV3Address);
    deploymentResults.contracts.EventTicketV3 = eventTicketV3Address;

    // Save deployment results
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `specific-contracts-${hre.network.name}-${timestamp}.json`;
    const filepath = path.join(deploymentsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(deploymentResults, null, 2));

    // Also save as latest
    const latestFilepath = path.join(deploymentsDir, `specific-contracts-${hre.network.name}-latest.json`);
    fs.writeFileSync(latestFilepath, JSON.stringify(deploymentResults, null, 2));

    console.log("\n" + "=".repeat(80));
    console.log("🎉 SPECIFIC CONTRACTS DEPLOYED SUCCESSFULLY!");
    console.log("=".repeat(80));
    console.log("\n📋 Deployment Summary:");
    console.log("Network:", hre.network.name);
    console.log("Chain ID:", deploymentResults.chainId);
    console.log("Deployer:", deployer.address);
    console.log("\n📜 Contract Addresses:");
    console.log("├─ EventOrganizerLibrary:", eventOrganizerLibraryAddress);
    console.log("├─ EventOrganizerV2:", eventOrganizerV2Address);
    console.log("├─ NFTMarketplaceV2:", nftMarketplaceV2Address);
    console.log("└─ EventTicketV3:", eventTicketV3Address);
    console.log("\n💾 Deployment data saved to:");
    console.log("├─", filename);
    console.log("└─ specific-contracts-" + hre.network.name + "-latest.json");
    console.log("\n" + "=".repeat(80));

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