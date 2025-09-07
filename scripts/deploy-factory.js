const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 MultiSenderFactory 배포 시작...");

  // 배포자 정보
  const [deployer] = await ethers.getSigners();
  console.log("배포자 주소:", deployer.address);
  console.log(
    "배포자 잔액:",
    ethers.formatEther(await deployer.provider.getBalance(deployer.address)),
    "ETH"
  );

  // MultiSenderFactory 배포
  const MultiSenderFactory = await ethers.getContractFactory(
    "MultiSenderFactory"
  );
  const factory = await MultiSenderFactory.deploy();
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("✅ MultiSenderFactory 배포 완료!");
  console.log("팩토리 주소:", factoryAddress);

  // MultiSender 배포를 위한 salt 값 (고정값 사용)
  const salt = ethers.keccak256(ethers.toUtf8Bytes("MultiSender-v1.0.0"));
  console.log("사용할 salt:", salt);

  // 미리 주소 계산
  const predictedAddress = await factory.computeMultiSenderAddress(salt);
  console.log("예상 MultiSender 주소:", predictedAddress);

  // MultiSender 배포
  console.log("\n🔨 MultiSender 배포 중...");
  const tx = await factory.deployMultiSender(salt);
  const receipt = await tx.wait();

  console.log("✅ MultiSender 배포 완료!");
  console.log("실제 배포 주소:", await factory.getDeployedContract(salt));
  console.log(
    "예상 주소와 일치:",
    (await factory.getDeployedContract(salt)) === predictedAddress
  );

  // 배포 정보 출력
  console.log("\n📋 배포 정보:");
  console.log("=====================================");
  console.log("Factory 주소:", factoryAddress);
  console.log("MultiSender 주소:", await factory.getDeployedContract(salt));
  console.log("Salt:", salt);
  console.log("Gas 사용량:", receipt.gasUsed.toString());
  console.log("=====================================");

  // 다른 체인에서도 동일한 주소로 배포 가능한지 확인
  console.log("\n🌐 다른 체인에서 동일한 주소로 배포하려면:");
  console.log("1. Factory 주소:", factoryAddress);
  console.log("2. Salt:", salt);
  console.log("3. 배포자 주소:", deployer.address);
  console.log(
    "4. 이 정보들을 사용하여 다른 체인에서도 동일한 주소로 배포 가능합니다!"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 배포 실패:", error);
    process.exit(1);
  });
