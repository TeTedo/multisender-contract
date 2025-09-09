const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiTokenSender", function () {
  let multiTokenSender;
  let owner;
  let user1, user2, user3;
  let mockToken;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // MultiTokenSender contract deployment
    const MultiTokenSender = await ethers.getContractFactory(
      "MultiTokenSender"
    );
    multiTokenSender = await MultiTokenSender.deploy();
    await multiTokenSender.waitForDeployment();

    // Mock ERC20 token deployment
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy(
      "Test Token",
      "TEST",
      ethers.parseEther("1000000"),
      18
    );
    await mockToken.waitForDeployment();

    // Distribute tokens to users
    await mockToken.transfer(user1.address, ethers.parseEther("1000"));
    await mockToken.transfer(user2.address, ethers.parseEther("1000"));
    await mockToken.transfer(user3.address, ethers.parseEther("1000"));
  });

  describe("Token Transfer", function () {
    it("Should successfully send tokens to multiple addresses", async function () {
      const recipients = [user2.address, user3.address];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];
      const totalAmount = ethers.parseEther("300");

      // Approve tokens
      await mockToken
        .connect(user1)
        .approve(await multiTokenSender.getAddress(), totalAmount);

      const initialBalances = await Promise.all(
        recipients.map((addr) => mockToken.balanceOf(addr))
      );

      await expect(
        multiTokenSender
          .connect(user1)
          .sendTokens(await mockToken.getAddress(), recipients, amounts)
      ).to.emit(multiTokenSender, "ERC20TokensSent");

      const finalBalances = await Promise.all(
        recipients.map((addr) => mockToken.balanceOf(addr))
      );

      for (let i = 0; i < recipients.length; i++) {
        expect(finalBalances[i] - initialBalances[i]).to.equal(amounts[i]);
      }
    });

    it("Should fail with zero token address", async function () {
      const recipients = [user1.address];
      const amounts = [ethers.parseEther("100")];

      await expect(
        multiTokenSender.sendTokens(ethers.ZeroAddress, recipients, amounts)
      ).to.be.revertedWith("MultiTokenSender: token address cannot be zero");
    });

    it("Should fail with empty recipients array", async function () {
      const recipients = [];
      const amounts = [];

      await expect(
        multiTokenSender.sendTokens(
          await mockToken.getAddress(),
          recipients,
          amounts
        )
      ).to.be.revertedWith(
        "MultiTokenSender: recipients array cannot be empty"
      );
    });

    it("Should fail with mismatched array lengths", async function () {
      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("100")]; // Different length

      await expect(
        multiTokenSender.sendTokens(
          await mockToken.getAddress(),
          recipients,
          amounts
        )
      ).to.be.revertedWith(
        "MultiTokenSender: recipients and amounts length mismatch"
      );
    });

    it("Should fail with too many recipients", async function () {
      const recipients = new Array(201).fill(user1.address); // 201 recipients
      const amounts = new Array(201).fill(ethers.parseEther("1"));

      await expect(
        multiTokenSender.sendTokens(
          await mockToken.getAddress(),
          recipients,
          amounts
        )
      ).to.be.revertedWith("MultiTokenSender: too many recipients (max 200)");
    });

    it("Should fail with zero amount", async function () {
      const recipients = [user1.address];
      const amounts = [0]; // Zero amount

      await expect(
        multiTokenSender.sendTokens(
          await mockToken.getAddress(),
          recipients,
          amounts
        )
      ).to.be.revertedWith("MultiTokenSender: amount must be greater than 0");
    });

    it("Should fail with zero address recipient", async function () {
      const recipients = [user1.address, ethers.ZeroAddress];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("100")];

      await expect(
        multiTokenSender.sendTokens(
          await mockToken.getAddress(),
          recipients,
          amounts
        )
      ).to.be.revertedWith(
        "MultiTokenSender: recipient cannot be zero address"
      );
    });

    it("Should fail without approval", async function () {
      const recipients = [user2.address];
      const amounts = [ethers.parseEther("100")];

      await expect(
        multiTokenSender
          .connect(user1)
          .sendTokens(await mockToken.getAddress(), recipients, amounts)
      ).to.be.revertedWithCustomError(mockToken, "ERC20InsufficientAllowance");
    });

    it("Should fail with insufficient balance", async function () {
      const recipients = [user2.address];
      const amounts = [ethers.parseEther("2000")]; // More than user1 has

      // Approve more than balance
      await mockToken
        .connect(user1)
        .approve(await multiTokenSender.getAddress(), amounts[0]);

      await expect(
        multiTokenSender
          .connect(user1)
          .sendTokens(await mockToken.getAddress(), recipients, amounts)
      ).to.be.revertedWithCustomError(mockToken, "ERC20InsufficientBalance");
    });

    it("Should handle maximum recipients (200)", async function () {
      const recipients = new Array(200).fill(user1.address);
      const amounts = new Array(200).fill(ethers.parseEther("1"));
      const totalAmount = ethers.parseEther("200");

      // Approve tokens
      await mockToken
        .connect(user1)
        .approve(await multiTokenSender.getAddress(), totalAmount);

      await expect(
        multiTokenSender
          .connect(user1)
          .sendTokens(await mockToken.getAddress(), recipients, amounts)
      ).to.emit(multiTokenSender, "ERC20TokensSent");
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to withdraw tokens", async function () {
      const tokenAmount = ethers.parseEther("100");
      await mockToken.transfer(
        await multiTokenSender.getAddress(),
        tokenAmount
      );

      const initialBalance = await mockToken.balanceOf(owner.address);
      await multiTokenSender.emergencyWithdraw(
        await mockToken.getAddress(),
        tokenAmount
      );
      const finalBalance = await mockToken.balanceOf(owner.address);

      expect(finalBalance - initialBalance).to.equal(tokenAmount);
    });

    it("Should emit EmergencyWithdraw event", async function () {
      const tokenAmount = ethers.parseEther("100");
      await mockToken.transfer(
        await multiTokenSender.getAddress(),
        tokenAmount
      );

      await expect(
        multiTokenSender.emergencyWithdraw(
          await mockToken.getAddress(),
          tokenAmount
        )
      ).to.emit(multiTokenSender, "EmergencyWithdraw");
    });

    it("Should fail emergency withdraw with zero token address", async function () {
      await expect(
        multiTokenSender.emergencyWithdraw(
          ethers.ZeroAddress,
          ethers.parseEther("100")
        )
      ).to.be.revertedWith("MultiTokenSender: token address cannot be zero");
    });

    it("Should fail emergency withdraw with insufficient balance", async function () {
      await expect(
        multiTokenSender.emergencyWithdraw(
          await mockToken.getAddress(),
          ethers.parseEther("1000")
        )
      ).to.be.revertedWith("MultiTokenSender: insufficient token balance");
    });

    it("Should fail emergency withdraw from non-owner", async function () {
      const tokenAmount = ethers.parseEther("100");
      await mockToken.transfer(
        await multiTokenSender.getAddress(),
        tokenAmount
      );

      await expect(
        multiTokenSender
          .connect(user1)
          .emergencyWithdraw(await mockToken.getAddress(), tokenAmount)
      ).to.be.revertedWithCustomError(
        multiTokenSender,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("View Functions", function () {
    it("Should return correct token balance", async function () {
      const tokenAmount = ethers.parseEther("100");
      await mockToken.transfer(
        await multiTokenSender.getAddress(),
        tokenAmount
      );

      expect(
        await multiTokenSender.getTokenBalance(await mockToken.getAddress())
      ).to.equal(tokenAmount);
    });

    it("Should return zero balance for empty contract", async function () {
      expect(
        await multiTokenSender.getTokenBalance(await mockToken.getAddress())
      ).to.equal(0);
    });
  });

  describe("Event Emissions", function () {
    it("Should emit ERC20TokensSent event with correct parameters", async function () {
      const recipients = [user2.address];
      const amounts = [ethers.parseEther("100")];
      const totalAmount = ethers.parseEther("100");

      await mockToken
        .connect(user1)
        .approve(await multiTokenSender.getAddress(), totalAmount);

      await expect(
        multiTokenSender
          .connect(user1)
          .sendTokens(await mockToken.getAddress(), recipients, amounts)
      )
        .to.emit(multiTokenSender, "ERC20TokensSent")
        .withArgs(
          await mockToken.getAddress(),
          user1.address,
          totalAmount,
          recipients.length
        );
    });
  });

  describe("Gas Optimization", function () {
    it("Should use unchecked increment for gas optimization", async function () {
      const recipients = [user2.address, user3.address];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];
      const totalAmount = ethers.parseEther("300");

      await mockToken
        .connect(user1)
        .approve(await multiTokenSender.getAddress(), totalAmount);

      // This should not revert due to unchecked increment
      await expect(
        multiTokenSender
          .connect(user1)
          .sendTokens(await mockToken.getAddress(), recipients, amounts)
      ).to.not.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle single recipient", async function () {
      const recipients = [user2.address];
      const amounts = [ethers.parseEther("100")];
      const totalAmount = ethers.parseEther("100");

      await mockToken
        .connect(user1)
        .approve(await multiTokenSender.getAddress(), totalAmount);

      await expect(
        multiTokenSender
          .connect(user1)
          .sendTokens(await mockToken.getAddress(), recipients, amounts)
      ).to.emit(multiTokenSender, "ERC20TokensSent");
    });

    it("Should handle same recipient multiple times", async function () {
      const recipients = [user2.address, user2.address, user2.address];
      const amounts = [
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        ethers.parseEther("300"),
      ];
      const totalAmount = ethers.parseEther("600");

      await mockToken
        .connect(user1)
        .approve(await multiTokenSender.getAddress(), totalAmount);

      await expect(
        multiTokenSender
          .connect(user1)
          .sendTokens(await mockToken.getAddress(), recipients, amounts)
      ).to.emit(multiTokenSender, "ERC20TokensSent");

      // Check final balance
      const finalBalance = await mockToken.balanceOf(user2.address);
      expect(finalBalance).to.equal(ethers.parseEther("1600")); // 1000 + 100 + 200 + 300
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

  it("Should have correct basic information", async function () {
    expect(await mockToken.name()).to.equal("Test Token");
    expect(await mockToken.symbol()).to.equal("TEST");
    expect(await mockToken.decimals()).to.equal(18);
    expect(await mockToken.totalSupply()).to.equal(
      ethers.parseEther("1000000")
    );
  });

  it("Should allow minting", async function () {
    const mintAmount = ethers.parseEther("1000");
    await mockToken.mint(owner.address, mintAmount);

    expect(await mockToken.balanceOf(owner.address)).to.equal(
      ethers.parseEther("1001000") // 1000000 + 1000
    );
  });
});
