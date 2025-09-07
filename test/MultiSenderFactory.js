const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSenderFactory", function () {
  let factory;
  let owner, user1, user2;
  let mockToken;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // MultiSenderFactory 배포
    const MultiSenderFactory = await ethers.getContractFactory(
      "MultiSenderFactory"
    );
    factory = await MultiSenderFactory.deploy();
    await factory.waitForDeployment();

    // Mock ERC20 토큰 배포
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy(
      "Test Token",
      "TEST",
      ethers.parseEther("1000000"),
      18
    );
    await mockToken.waitForDeployment();
  });

  describe("CREATE2 배포", function () {
    it("동일한 salt로 배포 시 동일한 주소가 나와야 함", async function () {
      const salt = ethers.keccak256(ethers.toUtf8Bytes("test-salt"));

      // 첫 번째 배포
      const tx1 = await factory.deployMultiSender(salt);
      await tx1.wait();
      const address1 = await factory.getDeployedContract(salt);

      // 두 번째 배포 (이미 배포된 경우 기존 주소 반환)
      const tx2 = await factory.deployMultiSender(salt);
      await tx2.wait();
      const address2 = await factory.getDeployedContract(salt);

      expect(address1).to.equal(address2);
      expect(address1).to.not.equal(ethers.ZeroAddress);
    });

    it("다른 salt로 배포 시 다른 주소가 나와야 함", async function () {
      const salt1 = ethers.keccak256(ethers.toUtf8Bytes("salt1"));
      const salt2 = ethers.keccak256(ethers.toUtf8Bytes("salt2"));

      const tx1 = await factory.deployMultiSender(salt1);
      await tx1.wait();
      const address1 = await factory.getDeployedContract(salt1);

      const tx2 = await factory.deployMultiSender(salt2);
      await tx2.wait();
      const address2 = await factory.getDeployedContract(salt2);

      expect(address1).to.not.equal(address2);
    });

    it("미리 계산한 주소와 실제 배포 주소가 일치해야 함", async function () {
      const salt = ethers.keccak256(ethers.toUtf8Bytes("prediction-test"));

      // 미리 주소 계산
      const predictedAddress = await factory.computeMultiSenderAddress(salt);

      // 실제 배포
      const tx = await factory.deployMultiSender(salt);
      await tx.wait();
      const actualAddress = await factory.getDeployedContract(salt);

      expect(actualAddress).to.equal(predictedAddress);
    });
  });

  describe("배포된 컨트랙트 기능", function () {
    let multiSender;
    let salt;

    beforeEach(async function () {
      salt = ethers.keccak256(ethers.toUtf8Bytes("functional-test"));
      const tx = await factory.deployMultiSender(salt);
      await tx.wait();
      multiSender = await ethers.getContractAt(
        "MultiSender",
        await factory.getDeployedContract(salt)
      );
    });

    it("배포된 MultiSender가 정상적으로 작동해야 함", async function () {
      // ETH 전송 테스트
      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("1"), ethers.parseEther("2")];
      const totalAmount = ethers.parseEther("3");
      const fee = await multiSender.calculateFee(totalAmount);
      const requiredAmount = totalAmount + fee;

      // 충분한 ETH를 보내서 수수료도 포함
      await expect(
        multiSender.sendNativeTokens(recipients, amounts, {
          value: requiredAmount,
        })
      ).to.emit(multiSender, "NativeTokensSent");

      // 수수료가 올바르게 차감되었는지 확인
      const feeCollectorBalance = await ethers.provider.getBalance(
        await multiSender.feeCollector()
      );
      expect(feeCollectorBalance).to.be.greaterThan(0);
    });

    it("배포된 MultiSender가 ERC20 토큰을 정상적으로 처리해야 함", async function () {
      // 토큰 분배
      await mockToken.transfer(user1.address, ethers.parseEther("1000"));

      const recipients = [user2.address];
      const amounts = [ethers.parseEther("100")];
      const totalAmount = ethers.parseEther("100");
      const fee = await multiSender.calculateFee(totalAmount);
      const requiredAmount = totalAmount + fee;

      // 토큰 승인
      await mockToken
        .connect(user1)
        .approve(await multiSender.getAddress(), requiredAmount);

      await expect(
        multiSender
          .connect(user1)
          .sendERC20Tokens(await mockToken.getAddress(), recipients, amounts)
      ).to.emit(multiSender, "ERC20TokensSent");
    });
  });

  describe("이벤트", function () {
    it("배포 시 이벤트가 발생해야 함", async function () {
      const salt = ethers.keccak256(ethers.toUtf8Bytes("event-test"));

      await expect(factory.deployMultiSender(salt))
        .to.emit(factory, "MultiSenderDeployed")
        .withArgs(salt, await factory.computeMultiSenderAddress(salt));
    });
  });

  describe("조회 함수", function () {
    it("미배포된 salt에 대해 0 주소를 반환해야 함", async function () {
      const salt = ethers.keccak256(ethers.toUtf8Bytes("not-deployed"));
      const address = await factory.getDeployedContract(salt);
      expect(address).to.equal(ethers.ZeroAddress);
    });

    it("배포된 컨트랙트 주소를 올바르게 반환해야 함", async function () {
      const salt = ethers.keccak256(ethers.toUtf8Bytes("deployed-test"));
      const tx = await factory.deployMultiSender(salt);
      await tx.wait();

      const address = await factory.getDeployedContract(salt);
      expect(address).to.not.equal(ethers.ZeroAddress);

      // 해당 주소에 컨트랙트가 실제로 존재하는지 확인
      const code = await ethers.provider.getCode(address);
      expect(code).to.not.equal("0x");
    });
  });

  describe("다중 체인 시뮬레이션", function () {
    it("동일한 salt로 여러 번 배포해도 동일한 주소가 나와야 함", async function () {
      const salt = ethers.keccak256(ethers.toUtf8Bytes("multi-chain-test"));

      // 첫 번째 "체인"에서 배포
      const tx1 = await factory.deployMultiSender(salt);
      await tx1.wait();
      const address1 = await factory.getDeployedContract(salt);

      // 두 번째 "체인"에서 배포 (실제로는 같은 팩토리지만 시뮬레이션)
      const tx2 = await factory.deployMultiSender(salt);
      await tx2.wait();
      const address2 = await factory.getDeployedContract(salt);

      expect(address1).to.equal(address2);
      console.log("✅ 다중 체인에서 동일한 주소 확인:", address1);
    });
  });
});
