const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Compiling contracts...");
  await hre.run("compile");
  
  console.log("Deploying RockPaperScissorsFactory contract...");

  const RockPaperScissorsFactory = await hre.ethers.getContractFactory("RockPaperScissorsFactory");
  const factory = await RockPaperScissorsFactory.deploy();

  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log("RockPaperScissorsFactory deployed to:", factoryAddress);

  // Generate and save the ABIs for the frontend
  await saveContractArtifacts();
  
  // Update the contract address in the frontend code
  await updateContractAddress(factoryAddress);
  
  console.log("Contract ABIs generated and saved to src/contracts/");
  console.log("Contract address updated in frontend code");
  console.log("Deployment complete!");
}

async function saveContractArtifacts() {
  const contractsDir = path.join(__dirname, "../src/contracts");
  
  // Create contracts directory if it doesn't exist
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }
  
  // Get artifacts for both contracts
  const factoryArtifact = require("../artifacts/contracts/RockPaperScissorsFactory.sol/RockPaperScissorsFactory.json");
  const gameArtifact = require("../artifacts/contracts/RockPaperScissors.sol/RockPaperScissors.json");
  
  // Extract and save ABIs
  const factoryAbi = { abi: factoryArtifact.abi };
  const gameAbi = { abi: gameArtifact.abi };
  
  fs.writeFileSync(
    path.join(contractsDir, "RockPaperScissorsFactory.json"),
    JSON.stringify(factoryAbi, null, 2)
  );
  
  fs.writeFileSync(
    path.join(contractsDir, "RockPaperScissors.json"),
    JSON.stringify(gameAbi, null, 2)
  );
}

async function updateContractAddress(factoryAddress) {
  const factoryAppPath = path.join(__dirname, "../src/FactoryApp.js");
  
  // Read the current content of FactoryApp.js
  let content = fs.readFileSync(factoryAppPath, 'utf8');
  
  // Replace the hardcoded factory address with the new one
  const updatedContent = content.replace(
    /const factoryAddress = ['"](0x[a-fA-F0-9]+)['"]/,
    `const factoryAddress = '${factoryAddress}'`
  );
  
  // Write the updated content back to the file
  fs.writeFileSync(factoryAppPath, updatedContent);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 