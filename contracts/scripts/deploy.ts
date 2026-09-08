import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying AlmadoxSBT to Polygon Amoy Testnet...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📦 Deployer address:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "POL");

  if (balance === 0n) {
    console.error("\n❌ Deployer wallet has no POL for gas!");
    console.error("   Get testnet POL at: https://faucet.polygon.technology");
    console.error("   Then run this script again.\n");
    process.exit(1);
  }

  // Deploy the contract
  console.log("\n⏳ Deploying contract...");
  const SBTFactory = await ethers.getContractFactory("AlmadoxSBT");
  const sbt = await SBTFactory.deploy();
  await sbt.waitForDeployment();

  const contractAddress = await sbt.getAddress();
  const deployTx = sbt.deploymentTransaction();

  console.log("\n✅ AlmadoxSBT deployed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Tx Hash:         ", deployTx?.hash);
  console.log("🌐 Polygonscan:      https://amoy.polygonscan.com/address/" + contractAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Save deployment info to a JSON file for easy reference
  const deploymentInfo = {
    network: "Polygon Amoy Testnet",
    chainId: 80002,
    contractName: "AlmadoxSBT",
    contractAddress,
    deployerAddress: deployer.address,
    txHash: deployTx?.hash,
    deployedAt: new Date().toISOString(),
    polygonscan: `https://amoy.polygonscan.com/address/${contractAddress}`,
  };

  const outputPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📝 Deployment info saved to: contracts/deployment.json");

  // Print the ABI snippet needed in web3.ts
  console.log("\n📋 Next step: copy this address into your frontend web3.ts:");
  console.log(`   SBT_CONTRACT_ADDRESS = "${contractAddress}"`);
  console.log("\n🔍 Optional: verify source code on Polygonscan:");
  console.log(`   npx hardhat verify --network amoy ${contractAddress}`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
