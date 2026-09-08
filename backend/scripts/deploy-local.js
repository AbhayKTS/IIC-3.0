const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  const SBT = await hre.ethers.getContractFactory("CollegeVerseSBT");
  const sbt = await SBT.deploy();
  await sbt.waitForDeployment();

  const address = await sbt.getAddress();

  // Test mint to confirm it works
  const tx = await sbt.mint(deployer.address, "data:application/json;base64,eyJuYW1lIjoiVGVzdCBTQlQifQ==", "Test Mint");
  const receipt = await tx.wait();

  console.log("==========================================");
  console.log("  CollegeVerseSBT deployed successfully!");
  console.log("==========================================");
  console.log("  Contract:", address);
  console.log("  Test mint TX:", receipt.hash);
  console.log("  Owner:", deployer.address);
  console.log("==========================================\n");
  console.log("Add these to your .env.development:\n");
  console.log(`POLYGON_AMOY_RPC_URL=http://127.0.0.1:8545`);
  console.log(`SBT_CONTRACT_ADDRESS=${address}`);
  console.log(`ADMIN_WALLET_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
  console.log(`WALLET_ENCRYPTION_KEY=hardhat-local-dev-key-2024`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
