const hre = require("hardhat");

async function main() {
  console.log("Deploying RockPaperScissors contract...");

  const RockPaperScissors = await hre.ethers.getContractFactory("RockPaperScissors");
  const rockPaperScissors = await RockPaperScissors.deploy();

  await rockPaperScissors.waitForDeployment();

  console.log("RockPaperScissors deployed to:", await rockPaperScissors.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 