const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 MultiTokenSender 배포 시작...");

  // 배포자 정보
  const [deployer] = await ethers.getSigners();
  console.log("배포자 주소:", deployer.address);
  console.log(
    "배포자 잔액:",
    ethers.formatEther(await deployer.provider.getBalance(deployer.address)),
    "ETH"
  );

  // MultiTokenSender 배포
  const MultiTokenSender = await ethers.getContractFactory("MultiTokenSender");
  const multiTokenSender = await MultiTokenSender.deploy();
  await multiTokenSender.waitForDeployment();

  const contractAddress = await multiTokenSender.getAddress();
  console.log("✅ MultiTokenSender 배포 완료!");
  console.log("컨트랙트 주소:", contractAddress);

  // 배포 정보 출력
  console.log("\n📋 배포 정보:");
  console.log("=====================================");
  console.log("MultiTokenSender 주소:", contractAddress);
  console.log("배포자 주소:", deployer.address);
  console.log("네트워크:", await deployer.provider.getNetwork());
  console.log("=====================================");

  // 컨트랙트 기본 정보 확인
  console.log("\n🔍 컨트랙트 정보:");
  console.log("소유자:", await multiTokenSender.owner());

  // 배포 성공 메시지
  console.log("\n🎉 MultiTokenSender 배포가 성공적으로 완료되었습니다!");
  console.log("이제 ERC20 토큰을 여러 주소에 동시에 전송할 수 있습니다.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 배포 실패:", error);
    process.exit(1);
  });
