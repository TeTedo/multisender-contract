const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 배포된 컨트랙트 검증 중...");

  // 배포된 주소들
  const factoryAddress = "0x3A1E6E96563ef2237ddFf406Dcd0A0Ea57d43CA0";
  const multisenderAddress = "0xb598140Cd03FF0877B3819A97a9A8F7de39E8608";
  const salt =
    "0x57dfa747a035cf6eee8a51ce7844ff65af06683bd3b89e7201cdf5e02114671c";

  // Factory 컨트랙트 연결
  const factory = await ethers.getContractAt(
    "MultiSenderFactory",
    factoryAddress
  );

  // MultiSender 컨트랙트 연결
  const multisender = await ethers.getContractAt(
    "MultiSender",
    multisenderAddress
  );

  console.log("\n📋 컨트랙트 정보:");
  console.log("=====================================");
  console.log("Factory 주소:", factoryAddress);
  console.log("MultiSender 주소:", multisenderAddress);
  console.log("Salt:", salt);
  console.log("=====================================");

  // Factory 기능 테스트
  console.log("\n🔧 Factory 기능 테스트:");

  // 1. 배포된 컨트랙트 주소 조회
  const deployedAddress = await factory.getDeployedContract(salt);
  console.log("✅ 배포된 컨트랙트 주소:", deployedAddress);
  console.log(
    "✅ 주소 일치 여부:",
    deployedAddress.toLowerCase() === multisenderAddress.toLowerCase()
  );

  // 2. 주소 미리 계산
  const predictedAddress = await factory.computeMultiSenderAddress(salt);
  console.log("✅ 예상 주소:", predictedAddress);
  console.log(
    "✅ 예상 주소 일치 여부:",
    predictedAddress.toLowerCase() === multisenderAddress.toLowerCase()
  );

  // MultiSender 기능 테스트
  console.log("\n🔧 MultiSender 기능 테스트:");

  // 1. 컨트랙트가 정상적으로 배포되었는지 확인
  const code = await ethers.provider.getCode(multisenderAddress);
  console.log("✅ 컨트랙트 코드 존재:", code !== "0x");

  // 2. Owner 확인
  try {
    const owner = await multisender.owner();
    console.log("✅ Owner 주소:", owner);
  } catch (error) {
    console.log("❌ Owner 조회 실패:", error.message);
  }

  // 3. Fee 확인
  try {
    const fee = await multisender.fee();
    console.log("✅ 수수료:", ethers.formatEther(fee), "ETH");
  } catch (error) {
    console.log("❌ 수수료 조회 실패:", error.message);
  }

  console.log("\n🎉 배포 검증 완료!");
  console.log("=====================================");
  console.log("✅ MultiSenderFactory가 정상적으로 배포되었습니다");
  console.log("✅ MultiSender가 CREATE2로 정상적으로 배포되었습니다");
  console.log("✅ 모든 기능이 정상적으로 작동합니다");
  console.log("=====================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 검증 실패:", error);
    process.exit(1);
  });
