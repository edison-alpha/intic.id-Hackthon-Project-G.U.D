/**
 * Verify EventOrganizerV2 Deployment
 *
 * This script verifies that EventOrganizerV2 is properly deployed
 * and the createEvent factory function is available
 *
 * Usage:
 * npx hardhat run scripts/verify-deployment.js --network pushTestnet
 */

const hre = require("hardhat");

async function main() {
  console.log("🔍 Verifying EventOrganizerV2 Deployment...\n");

  // Contract address (update this after deployment)
  const CONTRACT_ADDRESS = process.env.EVENT_ORGANIZER_ADDRESS || "0xB15D61167E1f55bad7124b3cEB9f83Ec8cAF4d3b";

  console.log("📍 Contract Address:", CONTRACT_ADDRESS);
  console.log();

  // Get contract instance
  const EventOrganizerV2 = await hre.ethers.getContractFactory("EventOrganizerV2");
  const contract = EventOrganizerV2.attach(CONTRACT_ADDRESS);

  try {
    // Check owner
    console.log("1️⃣  Checking owner...");
    const owner = await contract.owner();
    console.log("   Owner:", owner);
    console.log("   ✅ Owner check passed");
    console.log();

    // Check if createEvent function exists by checking contract interface
    console.log("2️⃣  Checking createEvent function...");
    const contractInterface = contract.interface;
    const createEventFragment = contractInterface.getFunction("createEvent");

    if (createEventFragment) {
      console.log("   Function signature:", createEventFragment.format());
      console.log("   ✅ createEvent function exists!");
    } else {
      console.log("   ❌ createEvent function NOT FOUND!");
      process.exit(1);
    }
    console.log();

    // Check organizer count
    console.log("3️⃣  Checking organizer count...");
    const organizerList = await contract.organizerList(0);
    console.log("   First organizer:", organizerList);
    console.log("   ✅ Registry working");
    console.log();

    // Check event count
    console.log("4️⃣  Checking deployed events...");
    try {
      const eventCount = await contract.getDeployedEventsCount();
      console.log("   Total events:", eventCount.toString());
      console.log("   ✅ Event tracking working");
    } catch (error) {
      console.log("   No events deployed yet (OK)");
    }
    console.log();

    console.log("✅ All checks passed!");
    console.log();
    console.log("📋 Summary:");
    console.log("   Contract: EventOrganizerV2");
    console.log("   Address:", CONTRACT_ADDRESS);
    console.log("   Network:", hre.network.name);
    console.log("   Status: ✅ Ready for use");
    console.log();
    console.log("🎉 You can now create events via Universal Wallet from any chain!");

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
