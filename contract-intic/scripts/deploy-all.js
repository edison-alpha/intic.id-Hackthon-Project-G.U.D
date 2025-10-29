const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment of all contracts to Push Chain Testnet...\n");

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
    // 1. Deploy UserProfile
    console.log("1️⃣ Deploying UserProfile...");
    const UserProfile = await hre.ethers.getContractFactory("UserProfile");
    const userProfile = await UserProfile.deploy();
    await userProfile.waitForDeployment();
    const userProfileAddress = await userProfile.getAddress();
    console.log("✅ UserProfile deployed to:", userProfileAddress);
    deploymentResults.contracts.UserProfile = userProfileAddress;

    // 2. Deploy EventStatistics
    console.log("\n3️⃣ Deploying EventStatistics...");
    const EventStatistics = await hre.ethers.getContractFactory("EventStatistics");
    const eventStatistics = await EventStatistics.deploy();
    await eventStatistics.waitForDeployment();
    const eventStatisticsAddress = await eventStatistics.getAddress();
    console.log("✅ EventStatistics deployed to:", eventStatisticsAddress);
    deploymentResults.contracts.EventStatistics = eventStatisticsAddress;

    // 4. Deploy EventReview
    console.log("\n4️⃣ Deploying EventReview...");
    const EventReview = await hre.ethers.getContractFactory("EventReview");
    const eventReview = await EventReview.deploy();
    await eventReview.waitForDeployment();
    const eventReviewAddress = await eventReview.getAddress();
    console.log("✅ EventReview deployed to:", eventReviewAddress);
    deploymentResults.contracts.EventReview = eventReviewAddress;

    // 5. Deploy EventRefund
    console.log("\n5️⃣ Deploying EventRefund...");
    const EventRefund = await hre.ethers.getContractFactory("EventRefund");
    const eventRefund = await EventRefund.deploy();
    await eventRefund.waitForDeployment();
    const eventRefundAddress = await eventRefund.getAddress();
    console.log("✅ EventRefund deployed to:", eventRefundAddress);
    deploymentResults.contracts.EventRefund = eventRefundAddress;

    // 6. Deploy TicketManagement
    console.log("\n6️⃣ Deploying TicketManagement...");
    const TicketManagement = await hre.ethers.getContractFactory("TicketManagement");
    const ticketManagement = await TicketManagement.deploy();
    await ticketManagement.waitForDeployment();
    const ticketManagementAddress = await ticketManagement.getAddress();
    console.log("✅ TicketManagement deployed to:", ticketManagementAddress);
    deploymentResults.contracts.TicketManagement = ticketManagementAddress;

    // 7. Deploy UniversalTicketValidator
    console.log("\n7️⃣ Deploying UniversalTicketValidator...");
    const UniversalTicketValidator = await hre.ethers.getContractFactory("UniversalTicketValidator");
    const universalValidator = await UniversalTicketValidator.deploy();
    await universalValidator.waitForDeployment();
    const universalValidatorAddress = await universalValidator.getAddress();
    console.log("✅ UniversalTicketValidator deployed to:", universalValidatorAddress);
    deploymentResults.contracts.UniversalTicketValidator = universalValidatorAddress;

    // 8. Deploy EventOrganizer
    console.log("\n8️⃣ Deploying EventOrganizer...");
    const EventOrganizer = await hre.ethers.getContractFactory("EventOrganizer");
    const eventOrganizer = await EventOrganizer.deploy();
    await eventOrganizer.waitForDeployment();
    const eventOrganizerAddress = await eventOrganizer.getAddress();
    console.log("✅ EventOrganizer deployed to:", eventOrganizerAddress);
    deploymentResults.contracts.EventOrganizer = eventOrganizerAddress;

    // 9. Deploy NFTMarketplace
    console.log("\n9️⃣ Deploying NFTMarketplace...");
    const NFTMarketplace = await hre.ethers.getContractFactory("NFTMarketplace");
    const nftMarketplace = await NFTMarketplace.deploy();
    await nftMarketplace.waitForDeployment();
    const nftMarketplaceAddress = await nftMarketplace.getAddress();
    console.log("✅ NFTMarketplace deployed to:", nftMarketplaceAddress);
    deploymentResults.contracts.NFTMarketplace = nftMarketplaceAddress;

    // 10. Deploy PushChainEticketingPlatform (Master Contract)
    console.log("\n🔟 Deploying PushChainEticketingPlatform (Master Contract)...");
    const PushChainPlatform = await hre.ethers.getContractFactory("PushChainEticketingPlatform");
    const platform = await PushChainPlatform.deploy();
    await platform.waitForDeployment();
    const platformAddress = await platform.getAddress();
    console.log("✅ PushChainEticketingPlatform deployed to:", platformAddress);
    deploymentResults.contracts.PushChainEticketingPlatform = platformAddress;

    // 11. Configure the Platform with all contract addresses
    console.log("\n⚙️ Configuring PushChainEticketingPlatform with all contract addresses...");
    const setupTx = await platform.setupPlatform(
      eventOrganizerAddress,
      universalValidatorAddress,
      userProfileAddress,
      eventReviewAddress,
      eventStatisticsAddress,
      ticketManagementAddress
    );
    await setupTx.wait();
    console.log("✅ Platform configured with core contracts!");
    
    // 12. Register additional contracts
    console.log("\n⚙️ Registering additional contracts...");
    const additionalTx = await platform.registerAdditionalContracts(
      nftMarketplaceAddress,
      eventRefundAddress
    );
    await additionalTx.wait();
    console.log("✅ Additional contracts registered!");

    // 13. Setup Platform Contract Addresses in all contracts
    console.log("\n🔗 Setting up platform contract address in all contracts...");
    
    console.log("  ├─ Setting platform in EventOrganizer...");
    await (await eventOrganizer.setPlatformContract(platformAddress)).wait();
    
    console.log("  ├─ Setting platform in UserProfile...");
    await (await userProfile.setPlatformContract(platformAddress)).wait();
    
    console.log("  ├─ Setting platform in EventStatistics...");
    await (await eventStatistics.setPlatformContract(platformAddress)).wait();

    console.log("  ├─ Setting platform in EventReview...");
    await (await eventReview.setPlatformContract(platformAddress)).wait();
    
    console.log("  ├─ Setting platform in EventRefund...");
    await (await eventRefund.setPlatformContract(platformAddress)).wait();
    
    console.log("  ├─ Setting platform in UniversalTicketValidator...");
    await (await universalValidator.setPlatformContract(platformAddress)).wait();
    
    console.log("  ├─ Setting platform in NFTMarketplace...");
    await (await nftMarketplace.setPlatformContract(platformAddress)).wait();
    
    console.log("✅ All contracts linked to platform!");

    // 14. Grant Permissions for Inter-Contract Communication
    console.log("\n🔐 Setting up permissions for inter-contract communication...");
    
    // EventOrganizer can access UserProfile, EventStatistics
    console.log("  ├─ Granting EventOrganizer permissions...");
    await (await platform.grantPermission(eventOrganizerAddress, "UserProfile")).wait();
    await (await platform.grantPermission(eventOrganizerAddress, "EventStatistics")).wait();

    // EventTicket contracts can access UserProfile, EventStatistics, EventOrganizer
    console.log("  ├─ Note: EventTicket contracts will be granted permissions when deployed");
    
    // EventReview can access EventStatistics, UserProfile
    console.log("  ├─ Granting EventReview permissions...");
    await (await platform.grantPermission(eventReviewAddress, "EventStatistics")).wait();
    await (await platform.grantPermission(eventReviewAddress, "UserProfile")).wait();
    
    // UniversalTicketValidator can access EventStatistics, TicketManagement
    console.log("  ├─ Granting UniversalTicketValidator permissions...");
    await (await platform.grantPermission(universalValidatorAddress, "EventStatistics")).wait();
    await (await platform.grantPermission(universalValidatorAddress, "TicketManagement")).wait();
    
    // EventRefund can access EventStatistics
    console.log("  ├─ Granting EventRefund permissions...");
    await (await platform.grantPermission(eventRefundAddress, "EventStatistics")).wait();
    
    // NFTMarketplace can access UserProfile
    console.log("  ├─ Granting NFTMarketplace permissions...");
    await (await platform.grantPermission(nftMarketplaceAddress, "UserProfile")).wait();
    
    console.log("✅ All permissions configured!");

    // Save deployment results
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `all-contracts-${hre.network.name}-${timestamp}.json`;
    const filepath = path.join(deploymentsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(deploymentResults, null, 2));
    
    // Also save as latest
    const latestFilepath = path.join(deploymentsDir, `all-contracts-${hre.network.name}-latest.json`);
    fs.writeFileSync(latestFilepath, JSON.stringify(deploymentResults, null, 2));

    console.log("\n" + "=".repeat(80));
    console.log("🎉 ALL CONTRACTS DEPLOYED SUCCESSFULLY!");
    console.log("=".repeat(80));
    console.log("\n📋 Deployment Summary:");
    console.log("Network:", hre.network.name);
    console.log("Chain ID:", deploymentResults.chainId);
    console.log("Deployer:", deployer.address);
    console.log("\n📜 Contract Addresses:");
    console.log("├─ UserProfile:", userProfileAddress);
    console.log("├─ NotificationSystem:", notificationSystemAddress);
    console.log("├─ EventStatistics:", eventStatisticsAddress);
    console.log("├─ EventReview:", eventReviewAddress);
    console.log("├─ EventRefund:", eventRefundAddress);
    console.log("├─ TicketManagement:", ticketManagementAddress);
    console.log("├─ UniversalTicketValidator:", universalValidatorAddress);
    console.log("├─ EventOrganizer:", eventOrganizerAddress);
    console.log("├─ NFTMarketplace:", nftMarketplaceAddress);
    console.log("└─ PushChainEticketingPlatform:", platformAddress);
    console.log("\n💾 Deployment data saved to:");
    console.log("├─", filename);
    console.log("└─ all-contracts-" + hre.network.name + "-latest.json");
    console.log("\n" + "=".repeat(80));

    // Verify Platform Setup
    console.log("\n🔍 Verifying Platform Setup...");
    const platformContracts = await platform.getPlatformContracts();
    console.log("✅ EventOrganizer registered:", platformContracts[0]);
    console.log("✅ UniversalValidator registered:", platformContracts[1]);
    console.log("✅ UserProfile registered:", platformContracts[2]);
    console.log("✅ EventReview registered:", platformContracts[3]);
    console.log("✅ NotificationSystem registered:", platformContracts[4]);
    console.log("✅ EventStatistics registered:", platformContracts[5]);
    console.log("✅ TicketManagement registered:", platformContracts[6]);

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
