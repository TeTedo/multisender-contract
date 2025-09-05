const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSender", function () {
  let multiSender;
  let owner;
  let feeCollector;
  let user1, user2, user3;
  let mockToken;

  beforeEach(async function () {
    [owner, feeCollector, user1, user2, user3] = await ethers.getSigners();

    // MultiSender 컨트랙트 배포
    const MultiSender = await ethers.getContractFactory("MultiSender");
    multiSender = await MultiSender.deploy();
    await multiSender.waitForDeployment();

    // Mock ERC20 토큰 배포
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy(
      "Test Token",
      "TEST",
      ethers.parseEther("1000000"),
      18
    );
    await mockToken.waitForDeployment();

    // 사용자들에게 토큰 분배
    await mockToken.transfer(user1.address, ethers.parseEther("1000"));
    await mockToken.transfer(user2.address, ethers.parseEther("1000"));
    await mockToken.transfer(user3.address, ethers.parseEther("1000"));
  });

  describe("네이티브 토큰 전송", function () {
    it("여러 주소에 ETH를 성공적으로 전송해야 함", async function () {
      const recipients = [user1.address, user2.address, user3.address];
      const amounts = [
        ethers.parseEther("1"),
        ethers.parseEther("2"),
        ethers.parseEther("3"),
      ];
      const totalAmount = ethers.parseEther("6");
      const fee = await multiSender.calculateFee(totalAmount);
      const requiredAmount = totalAmount + fee;

      const initialBalances = await Promise.all(
        recipients.map((addr) => ethers.provider.getBalance(addr))
      );

      await expect(
        multiSender.sendNativeTokens(recipients, amounts, {
          value: requiredAmount,
        })
      ).to.emit(multiSender, "NativeTokensSent");

      const finalBalances = await Promise.all(
        recipients.map((addr) => ethers.provider.getBalance(addr))
      );

      for (let i = 0; i < recipients.length; i++) {
        expect(finalBalances[i] - initialBalances[i]).to.equal(amounts[i]);
      }
    });

    it("잘못된 입력값에 대해 실패해야 함", async function () {
      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("1")]; // 길이가 다름

      await expect(
        multiSender.sendNativeTokens(recipients, amounts, {
          value: ethers.parseEther("10"),
        })
      ).to.be.revertedWith(
        "MultiSender: recipients and amounts length mismatch"
      );
    });

    it("0 주소로 전송 시 실패해야 함", async function () {
      const recipients = [user1.address, ethers.ZeroAddress];
      const amounts = [ethers.parseEther("1"), ethers.parseEther("1")];

      await expect(
        multiSender.sendNativeTokens(recipients, amounts, {
          value: ethers.parseEther("10"),
        })
      ).to.be.revertedWith("MultiSender: recipient cannot be zero address");
    });

    it("수수료가 올바르게 계산되어야 함", async function () {
      const amount = ethers.parseEther("100");
      const fee = await multiSender.calculateFee(amount);
      expect(fee).to.equal(ethers.parseEther("0.1")); // 0.1%
    });
  });

  describe("ERC20 토큰 전송", function () {
    it("여러 주소에 ERC20 토큰을 성공적으로 전송해야 함", async function () {
      const recipients = [user2.address, user3.address]; // user1은 송신자이므로 제외
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];
      const totalAmount = ethers.parseEther("300");
      const fee = await multiSender.calculateFee(totalAmount);
      const requiredAmount = totalAmount + fee;

      // 토큰 승인
      await mockToken
        .connect(user1)
        .approve(await multiSender.getAddress(), requiredAmount);

      const initialBalances = await Promise.all(
        recipients.map((addr) => mockToken.balanceOf(addr))
      );

      await expect(
        multiSender
          .connect(user1)
          .sendERC20Tokens(await mockToken.getAddress(), recipients, amounts)
      ).to.emit(multiSender, "ERC20TokensSent");

      const finalBalances = await Promise.all(
        recipients.map((addr) => mockToken.balanceOf(addr))
      );

      for (let i = 0; i < recipients.length; i++) {
        expect(finalBalances[i] - initialBalances[i]).to.equal(amounts[i]);
      }
    });

    it("잘못된 토큰 주소에 대해 실패해야 함", async function () {
      const recipients = [user1.address];
      const amounts = [ethers.parseEther("100")];

      await expect(
        multiSender.sendERC20Tokens(ethers.ZeroAddress, recipients, amounts)
      ).to.be.revertedWith("MultiSender: token address cannot be zero");
    });
  });

  describe("관리자 기능", function () {
    it("소유자만 수수료 비율을 변경할 수 있어야 함", async function () {
      await expect(
        multiSender.connect(user1).setFeePercentage(50)
      ).to.be.revertedWithCustomError(
        multiSender,
        "OwnableUnauthorizedAccount"
      );

      await expect(multiSender.setFeePercentage(50)).to.not.be.reverted;

      expect(await multiSender.feePercentage()).to.equal(50);
    });

    it("최대 수수료 비율을 초과할 수 없어야 함", async function () {
      await expect(
        multiSender.setFeePercentage(200) // 2%
      ).to.be.revertedWith("MultiSender: fee percentage too high");
    });

    it("소유자만 수수료 수집자를 변경할 수 있어야 함", async function () {
      await expect(
        multiSender.connect(user1).setFeeCollector(user2.address)
      ).to.be.revertedWithCustomError(
        multiSender,
        "OwnableUnauthorizedAccount"
      );

      await expect(multiSender.setFeeCollector(user2.address)).to.not.be
        .reverted;

      expect(await multiSender.feeCollector()).to.equal(user2.address);
    });

    it("비상 회수 기능이 작동해야 함", async function () {
      // ERC20 토큰 회수 테스트만 수행 (ETH는 sendNativeTokens에서 모두 전송되므로)
      const tokenAmount = ethers.parseEther("100");
      await mockToken.transfer(await multiSender.getAddress(), tokenAmount);

      const initialTokenBalance = await mockToken.balanceOf(owner.address);
      await multiSender.emergencyWithdraw(
        await mockToken.getAddress(),
        tokenAmount
      );
      const finalTokenBalance = await mockToken.balanceOf(owner.address);

      expect(finalTokenBalance - initialTokenBalance).to.equal(tokenAmount);
    });
  });

  describe("조회 함수", function () {
    it("ETH 잔액을 올바르게 조회해야 함", async function () {
      const amount = ethers.parseEther("1");
      const fee = await multiSender.calculateFee(amount);
      const requiredAmount = amount + fee;

      // sendNativeTokens를 사용해서 ETH를 컨트랙트에 전송
      await multiSender.sendNativeTokens([user1.address], [amount], {
        value: requiredAmount,
      });

      expect(await multiSender.getETHBalance()).to.equal(0); // 모든 ETH가 전송되었으므로 0
    });

    it("토큰 잔액을 올바르게 조회해야 함", async function () {
      const amount = ethers.parseEther("100");
      await mockToken.transfer(await multiSender.getAddress(), amount);

      expect(
        await multiSender.getTokenBalance(await mockToken.getAddress())
      ).to.equal(amount);
    });
  });
});

describe("MockERC20", function () {
  let mockToken;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy(
      "Test Token",
      "TEST",
      ethers.parseEther("1000000"),
      18
    );
    await mockToken.waitForDeployment();
  });

  it("기본 정보가 올바르게 설정되어야 함", async function () {
    expect(await mockToken.name()).to.equal("Test Token");
    expect(await mockToken.symbol()).to.equal("TEST");
    expect(await mockToken.decimals()).to.equal(18);
    expect(await mockToken.totalSupply()).to.equal(
      ethers.parseEther("1000000")
    );
  });
});

describe("SafeERC20 호환성 테스트", function () {
  let multiSender;
  let owner, user1, user2;
  let legacyToken, usdtLikeToken;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // MultiSender 컨트랙트 배포
    const MultiSender = await ethers.getContractFactory("MultiSender");
    multiSender = await MultiSender.deploy();
    await multiSender.waitForDeployment();

    // Legacy ERC20 토큰 배포 (bool 반환값 없음)
    const LegacyToken = await ethers.getContractFactory("LegacyERC20");
    legacyToken = await LegacyToken.deploy(
      "Legacy Token",
      "LEGACY",
      ethers.parseEther("1000000"),
      18
    );
    await legacyToken.waitForDeployment();

    // USDT-like 토큰 배포 (approve 전에 0으로 설정해야 함)
    const USDTLikeToken = await ethers.getContractFactory("USDTLikeToken");
    usdtLikeToken = await USDTLikeToken.deploy(
      "USDT Like Token",
      "USDT",
      ethers.parseEther("1000000"),
      6
    );
    await usdtLikeToken.waitForDeployment();

    // 사용자들에게 토큰 분배
    await legacyToken.transfer(user1.address, ethers.parseEther("1000"));
    await usdtLikeToken.transfer(user1.address, ethers.parseEther("1000", 6));
  });

  describe("Legacy ERC20 토큰 (bool 반환값 없음)", function () {
    it("Legacy ERC20 토큰을 성공적으로 전송해야 함", async function () {
      const recipients = [user2.address];
      const amounts = [ethers.parseEther("100")];
      const totalAmount = ethers.parseEther("100");
      const fee = await multiSender.calculateFee(totalAmount);
      const requiredAmount = totalAmount + fee;

      // 토큰 승인
      await legacyToken
        .connect(user1)
        .approve(await multiSender.getAddress(), requiredAmount);

      const initialBalance = await legacyToken.balanceOf(user2.address);

      await expect(
        multiSender
          .connect(user1)
          .sendERC20Tokens(await legacyToken.getAddress(), recipients, amounts)
      ).to.emit(multiSender, "ERC20TokensSent");

      const finalBalance = await legacyToken.balanceOf(user2.address);
      expect(finalBalance - initialBalance).to.equal(amounts[0]);
    });
  });

  describe("USDT-like 토큰 (approve 전에 0으로 설정해야 함)", function () {
    it("USDT-like 토큰을 성공적으로 전송해야 함", async function () {
      const recipients = [user2.address];
      const amounts = [ethers.parseEther("100", 6)]; // 6 decimals
      const totalAmount = ethers.parseEther("100", 6);
      const fee = await multiSender.calculateFee(totalAmount);
      const requiredAmount = totalAmount + fee;

      // USDT 특성: approve 전에 0으로 설정
      await usdtLikeToken
        .connect(user1)
        .approve(await multiSender.getAddress(), 0);
      await usdtLikeToken
        .connect(user1)
        .approve(await multiSender.getAddress(), requiredAmount);

      const initialBalance = await usdtLikeToken.balanceOf(user2.address);

      await expect(
        multiSender
          .connect(user1)
          .sendERC20Tokens(
            await usdtLikeToken.getAddress(),
            recipients,
            amounts
          )
      ).to.emit(multiSender, "ERC20TokensSent");

      const finalBalance = await usdtLikeToken.balanceOf(user2.address);
      expect(finalBalance - initialBalance).to.equal(amounts[0]);
    });

    it("USDT-like 토큰에서 SafeERC20이 자동으로 approve를 처리해야 함", async function () {
      const recipients = [user2.address];
      const amounts = [ethers.parseEther("100", 6)];
      const totalAmount = ethers.parseEther("100", 6);
      const fee = await multiSender.calculateFee(totalAmount);
      const requiredAmount = totalAmount + fee;

      // SafeERC20이 자동으로 0으로 설정하고 approve를 처리하므로 성공해야 함
      await usdtLikeToken
        .connect(user1)
        .approve(await multiSender.getAddress(), requiredAmount);

      const initialBalance = await usdtLikeToken.balanceOf(user2.address);

      await expect(
        multiSender
          .connect(user1)
          .sendERC20Tokens(
            await usdtLikeToken.getAddress(),
            recipients,
            amounts
          )
      ).to.emit(multiSender, "ERC20TokensSent");

      const finalBalance = await usdtLikeToken.balanceOf(user2.address);
      expect(finalBalance - initialBalance).to.equal(amounts[0]);
    });
  });

  describe("VIP 기능 테스트", function () {
    it("VIP 사용자는 수수료를 내지 않아야 함", async function () {
      // user1을 VIP로 설정
      await multiSender.addVIP(user1.address);

      const recipients = [user2.address];
      const amounts = [ethers.parseEther("100")];
      const totalAmount = ethers.parseEther("100");
      const fee = await multiSender.calculateFee(totalAmount);
      const requiredAmount = totalAmount + fee;

      // 토큰 승인 (VIP여도 requiredAmount만큼 승인해야 함)
      await legacyToken
        .connect(user1)
        .approve(await multiSender.getAddress(), requiredAmount);

      const initialBalance = await legacyToken.balanceOf(user2.address);
      const initialFeeCollectorBalance = await legacyToken.balanceOf(
        await multiSender.feeCollector()
      );

      // VIP는 수수료 없이 전송
      await multiSender
        .connect(user1)
        .sendERC20Tokens(await legacyToken.getAddress(), recipients, amounts);

      const finalBalance = await legacyToken.balanceOf(user2.address);
      const finalFeeCollectorBalance = await legacyToken.balanceOf(
        await multiSender.feeCollector()
      );

      expect(finalBalance - initialBalance).to.equal(amounts[0]);
      // VIP는 수수료를 내지 않으므로 수수료 수집자 잔액이 증가하지 않아야 함
      expect(finalFeeCollectorBalance - initialFeeCollectorBalance).to.equal(0);
    });

    it("VIP가 아닌 사용자는 수수료를 내야 함", async function () {
      const recipients = [user2.address];
      const amounts = [ethers.parseEther("100")];
      const totalAmount = ethers.parseEther("100");
      const fee = await multiSender.calculateFee(totalAmount);
      const requiredAmount = totalAmount + fee;

      // 토큰 승인
      await legacyToken
        .connect(user1)
        .approve(await multiSender.getAddress(), requiredAmount);

      const initialBalance = await legacyToken.balanceOf(user2.address);
      const initialFeeCollectorBalance = await legacyToken.balanceOf(
        await multiSender.feeCollector()
      );

      await multiSender
        .connect(user1)
        .sendERC20Tokens(await legacyToken.getAddress(), recipients, amounts);

      const finalBalance = await legacyToken.balanceOf(user2.address);
      const finalFeeCollectorBalance = await legacyToken.balanceOf(
        await multiSender.feeCollector()
      );

      expect(finalBalance - initialBalance).to.equal(amounts[0]);
      expect(finalFeeCollectorBalance - initialFeeCollectorBalance).to.equal(
        fee
      );
    });
  });
});
