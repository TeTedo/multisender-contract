const { ethers } = require("hardhat");

/**
 * CREATE2를 사용하여 컨트랙트 주소를 미리 계산하는 유틸리티
 */
async function calculateAddress() {
  console.log("🔍 MultiSender 주소 계산 중...");

  // Factory 주소 (BSC 테스트넷에 배포된 실제 주소)
  const factoryAddress = "0x3A1E6E96563ef2237ddFf406Dcd0A0Ea57d43CA0"; // BSC 테스트넷 배포 주소

  // Salt 값 (고정값 사용)
  const salt = ethers.keccak256(ethers.toUtf8Bytes("MultiSender-v1.0.0"));

  // MultiSender 컨트랙트의 creation code
  const MultiSender = await ethers.getContractFactory("MultiSender");
  const bytecode = MultiSender.bytecode;

  // CREATE2 주소 계산
  const hash = ethers.keccak256(
    ethers.solidityPacked(
      ["bytes1", "address", "bytes32", "bytes32"],
      ["0xff", factoryAddress, salt, ethers.keccak256(bytecode)]
    )
  );

  // 해시의 마지막 20바이트를 주소로 변환
  const contractAddress = "0x" + hash.slice(-40);

  console.log("📋 계산 결과:");
  console.log("=====================================");
  console.log("Factory 주소:", factoryAddress);
  console.log("Salt:", salt);
  console.log("예상 MultiSender 주소:", contractAddress);
  console.log("=====================================");

  return contractAddress;
}

/**
 * 여러 체인에서 동일한 주소로 배포하기 위한 정보 출력
 */
async function printDeploymentInfo() {
  console.log("\n🌐 다중 체인 배포 가이드:");
  console.log("=====================================");
  console.log("1. 각 체인에서 동일한 Factory 주소로 배포");
  console.log("2. 동일한 salt 값 사용");
  console.log("3. 동일한 배포자 주소 사용 (선택사항)");
  console.log("4. 결과적으로 모든 체인에서 동일한 MultiSender 주소 생성");
  console.log("=====================================");

  console.log("\n📝 배포 명령어:");
  console.log(
    "npx hardhat run scripts/deploy-factory.js --network <network-name>"
  );

  console.log("\n🔧 설정 예시 (hardhat.config.js):");
  console.log(`
networks: {
  ethereum: {
    url: "https://mainnet.infura.io/v3/YOUR_KEY",
    accounts: [process.env.PRIVATE_KEY]
  },
  polygon: {
    url: "https://polygon-rpc.com",
    accounts: [process.env.PRIVATE_KEY]
  },
  bsc: {
    url: "https://bsc-dataseed.binance.org",
    accounts: [process.env.PRIVATE_KEY]
  }
}
  `);
}

// 스크립트 실행
if (require.main === module) {
  calculateAddress()
    .then(() => printDeploymentInfo())
    .catch((error) => {
      console.error("❌ 계산 실패:", error);
      process.exit(1);
    });
}

module.exports = { calculateAddress, printDeploymentInfo };
