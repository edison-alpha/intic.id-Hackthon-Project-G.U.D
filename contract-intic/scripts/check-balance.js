/**
 * Check Wallet Balance
 *
 * Quick script to check your wallet balance before deployment
 *
 * Usage:
 * npx hardhat run scripts/check-balance.js --network pushTestnet
 */

const hre = require("hardhat");

async function main() {
  console.log("💰 Checking Wallet Balance...\n");

  // Get account
  const [account] = await hre.ethers.getSigners();
  console.log("📝 Wallet Address:", account.address);
  console.log();

  // Get balance
  const balance = await hre.ethers.provider.getBalance(account.address);
  const balanceInPC = hre.ethers.formatEther(balance);

  console.log("💵 Balance:", balanceInPC, "PC");
  console.log();

  // Check requirements
  const requirements = [
    { name: "Deploy Contract", amount: "0.05", needed: hre.ethers.parseEther("0.05") },
    { name: "Register EO", amount: "0.01", needed: hre.ethers.parseEther("0.01") },
    { name: "Create Event", amount: "0.01", needed: hre.ethers.parseEther("0.01") },
  ];

  console.log("📊 Requirements:");
  console.log();

  let totalNeeded = BigInt(0);
  requirements.forEach((req) => {
    const canAfford = balance >= req.needed;
    const status = canAfford ? "✅" : "❌";
    console.log(`   ${status} ${req.name}: ${req.amount} PC`);
    totalNeeded += req.needed;
  });

  console.log();
  console.log("📈 Total Needed:", hre.ethers.formatEther(totalNeeded), "PC");
  console.log("💰 Your Balance:", balanceInPC, "PC");
  console.log();

  if (balance >= totalNeeded) {
    console.log("✅ You have enough balance for all operations!");
  } else {
    const shortfall = totalNeeded - balance;
    console.log("⚠️  You need", hre.ethers.formatEther(shortfall), "more PC");
    console.log();
    console.log("🚰 Get testnet PC from faucet:");
    console.log("   https://faucet.push.org/");
    console.log();
    console.log("   Your address:", account.address);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
