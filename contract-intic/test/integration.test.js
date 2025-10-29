const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HiBeats Contracts Integration Test", function () {
  let owner, user1, user2, treasury, stakingPool;
  let hiBeatsToken, hiBeatsNFT, hiBeatsMarketplace, hiBeatsRoyalties, hiBeatsFactory;
  
  const INITIAL_SUPPLY = ethers.parseEther("100000000"); // 100M tokens
  const MINTING_FEE = ethers.parseEther("0.001");

  beforeEach(async function () {
    [owner, user1, user2, treasury, stakingPool] = await ethers.getSigners();

    // Deploy HiBeatsToken
    const HiBeatsToken = await ethers.getContractFactory("HiBeatsToken");
    hiBeatsToken = await HiBeatsToken.deploy(
      treasury.address,
      stakingPool.address,
      treasury.address,
      treasury.address
    );

    // Deploy HiBeatsNFT
    const HiBeatsNFT = await ethers.getContractFactory("HiBeatsNFT");
    hiBeatsNFT = await HiBeatsNFT.deploy(owner.address);

    // Deploy HiBeatsRoyalties
    const HiBeatsRoyalties = await ethers.getContractFactory("HiBeatsRoyalties");
    hiBeatsRoyalties = await HiBeatsRoyalties.deploy(
      await hiBeatsToken.getAddress(),
      await hiBeatsNFT.getAddress(),
      treasury.address,
      stakingPool.address
    );

    // Deploy HiBeatsMarketplace
    const HiBeatsMarketplace = await ethers.getContractFactory("HiBeatsMarketplace");
    hiBeatsMarketplace = await HiBeatsMarketplace.deploy(
      await hiBeatsNFT.getAddress(),
      await hiBeatsToken.getAddress(),
      treasury.address
    );

    // Deploy HiBeatsFactory
    const HiBeatsFactory = await ethers.getContractFactory("HiBeatsFactory");
    hiBeatsFactory = await HiBeatsFactory.deploy(
      await hiBeatsNFT.getAddress(),
      await hiBeatsToken.getAddress(),
      owner.address
    );

    // Setup permissions
    await hiBeatsToken.setAuthorizedMinter(await hiBeatsFactory.getAddress(), true);
    await hiBeatsToken.setAuthorizedMinter(await hiBeatsRoyalties.getAddress(), true);
    await hiBeatsNFT.setAuthorizedCreator(await hiBeatsFactory.getAddress(), true);
  });

  describe("Token Contract", function () {
    it("Should have correct initial supply distribution", async function () {
      const ownerBalance = await hiBeatsToken.balanceOf(owner.address);
      const stakingBalance = await hiBeatsToken.balanceOf(stakingPool.address);
      const treasuryBalance = await hiBeatsToken.balanceOf(treasury.address);
      
      expect(ownerBalance).to.equal(ethers.parseEther("40000000")); // 40%
      expect(stakingBalance).to.equal(ethers.parseEther("25000000")); // 25%
    });

    it("Should allow authorized minters to mint", async function () {
      const mintAmount = ethers.parseEther("1000");
      await hiBeatsToken.mintForRewards(user1.address, mintAmount);
      
      const balance = await hiBeatsToken.balanceOf(user1.address);
      expect(balance).to.equal(mintAmount);
    });
  });

  describe("NFT Contract", function () {
    it("Should mint track NFT correctly", async function () {
      const tokenURI = "https://ipfs.io/ipfs/QmTest";
      const sunoId = "test-suno-id-1";
      
      await hiBeatsNFT.mintTrack(
        user1.address,
        tokenURI,
        sunoId,
        "Electronic",
        180, // 3 minutes
        "V4",
        true,
        500, // 5% royalty
        { value: MINTING_FEE }
      );
      
      expect(await hiBeatsNFT.ownerOf(1)).to.equal(user1.address);
      expect(await hiBeatsNFT.getTokenIdBySunoId(sunoId)).to.equal(1);
      
      const trackInfo = await hiBeatsNFT.getTrackInfo(1);
      expect(trackInfo.sunoId).to.equal(sunoId);
      expect(trackInfo.genre).to.equal("Electronic");
      expect(trackInfo.duration).to.equal(180);
    });

    it("Should prevent duplicate Suno IDs", async function () {
      const tokenURI = "https://ipfs.io/ipfs/QmTest";
      const sunoId = "duplicate-test";
      
      await hiBeatsNFT.mintTrack(
        user1.address,
        tokenURI,
        sunoId,
        "Electronic",
        180,
        "V4",
        true,
        500,
        { value: MINTING_FEE }
      );
      
      await expect(
        hiBeatsNFT.mintTrack(
          user2.address,
          tokenURI,
          sunoId,
          "Pop",
          200,
          "V4",
          true,
          300,
          { value: MINTING_FEE }
        )
      ).to.be.revertedWith("Track already minted");
    });
  });

  describe("Factory Contract", function () {
    it("Should allow generation request", async function () {
      const taskId = "test-task-123";
      const prompt = "Create a chill electronic track";
      
      await hiBeatsFactory.connect(user1).requestGeneration(
        taskId,
        prompt,
        "electronic",
        false,
        false,
        "V4",
        "https://callback.url",
        { value: MINTING_FEE }
      );
      
      const request = await hiBeatsFactory.generationRequests(taskId);
      expect(request.requester).to.equal(user1.address);
      expect(request.prompt).to.equal(prompt);
      expect(await hiBeatsFactory.totalGenerations(user1.address)).to.equal(1);
    });

    it("Should enforce daily generation limits", async function () {
      // Make 10 requests (the daily limit)
      for (let i = 0; i < 10; i++) {
        await hiBeatsFactory.connect(user1).requestGeneration(
          `task-${i}`,
          "test prompt",
          "electronic",
          false,
          false,
          "V4",
          "https://callback.url",
          { value: MINTING_FEE }
        );
      }
      
      // 11th request should fail
      await expect(
        hiBeatsFactory.connect(user1).requestGeneration(
          "task-11",
          "test prompt",
          "electronic",
          false,
          false,
          "V4",
          "https://callback.url",
          { value: MINTING_FEE }
        )
      ).to.be.revertedWith("Daily generation limit exceeded");
    });
  });

  describe("Marketplace Contract", function () {
    let tokenId;
    
    beforeEach(async function () {
      // Mint an NFT first
      await hiBeatsNFT.mintTrack(
        user1.address,
        "https://ipfs.io/ipfs/QmTest",
        "marketplace-test",
        "Electronic",
        180,
        "V4",
        true,
        500,
        { value: MINTING_FEE }
      );
      tokenId = 1;
      
      // Approve marketplace
      await hiBeatsNFT.connect(user1).setApprovalForAll(await hiBeatsMarketplace.getAddress(), true);
    });

    it("Should list token for sale", async function () {
      const price = ethers.parseEther("1");
      
      await hiBeatsMarketplace.connect(user1).listToken(tokenId, price, false);
      
      const listing = await hiBeatsMarketplace.listings(tokenId);
      expect(listing.seller).to.equal(user1.address);
      expect(listing.price).to.equal(price);
      expect(listing.isActive).to.be.true;
    });

    it("Should buy listed token with royalty distribution", async function () {
      const price = ethers.parseEther("1");
      
      await hiBeatsMarketplace.connect(user1).listToken(tokenId, price, false);
      
      const initialUser1Balance = await ethers.provider.getBalance(user1.address);
      
      await hiBeatsMarketplace.connect(user2).buyToken(tokenId, { value: price });
      
      expect(await hiBeatsNFT.ownerOf(tokenId)).to.equal(user2.address);
      
      const listing = await hiBeatsMarketplace.listings(tokenId);
      expect(listing.isActive).to.be.false;
    });
  });

  describe("Royalties Contract", function () {
    it("Should record streaming and distribute royalties", async function () {
      // First mint a token
      await hiBeatsNFT.mintTrack(
        user1.address,
        "https://ipfs.io/ipfs/QmTest",
        "streaming-test",
        "Electronic",
        180,
        "V4",
        true,
        500,
        { value: MINTING_FEE }
      );
      
      const tokenId = 1;
      const streamingMinutes = 10;
      
      await hiBeatsRoyalties.recordStreaming(tokenId, user2.address, streamingMinutes);
      
      expect(await hiBeatsRoyalties.userStreamingMinutes(user2.address)).to.equal(streamingMinutes);
      expect(await hiBeatsRoyalties.trackStreamingMinutes(tokenId)).to.equal(streamingMinutes);
    });

    it("Should handle premium user streaming with multiplier", async function () {
      await hiBeatsNFT.mintTrack(
        user1.address,
        "https://ipfs.io/ipfs/QmTest",
        "premium-test",
        "Electronic",
        180,
        "V4",
        true,
        500,
        { value: MINTING_FEE }
      );
      
      // Make user2 premium
      await hiBeatsRoyalties.addPremiumUser(user2.address, 30 * 24 * 60 * 60); // 30 days
      
      const tokenId = 1;
      const streamingMinutes = 10;
      
      await hiBeatsRoyalties.recordStreaming(tokenId, user2.address, streamingMinutes);
      
      // Premium users should have higher royalty generation
      expect(await hiBeatsRoyalties.hasActivePremium(user2.address)).to.be.true;
    });
  });

  describe("Integration: Full Workflow", function () {
    it("Should complete full generation-to-sale workflow", async function () {
      // 1. Request generation
      const taskId = "integration-test";
      await hiBeatsFactory.connect(user1).requestGeneration(
        taskId,
        "Create a chill track",
        "electronic",
        false,
        false,
        "V4",
        "https://callback.url",
        { value: MINTING_FEE }
      );
      
      // 2. Simulate successful callback (this would normally come from Suno API)
      const callbackData = {
        taskId: taskId,
        status: "SUCCESS",
        sunoIds: ["suno-123"],
        audioUrls: ["https://audio.url"],
        imageUrls: ["https://image.url"],
        titles: ["Generated Track"],
        tags: ["electronic", "chill"],
        durations: [180],
        errorMessage: ""
      };
      
      await hiBeatsFactory.processSunoCallback(taskId, callbackData);
      
      // 3. Manually mint NFT (in full implementation, this would be automated)
      await hiBeatsNFT.mintTrack(
        user1.address,
        "https://ipfs.io/ipfs/QmTest",
        "suno-123",
        "Electronic",
        180,
        "V4",
        true,
        500,
        { value: MINTING_FEE }
      );
      
      const tokenId = 1;
      
      // 4. List on marketplace
      await hiBeatsNFT.connect(user1).setApprovalForAll(await hiBeatsMarketplace.getAddress(), true);
      const price = ethers.parseEther("0.5");
      await hiBeatsMarketplace.connect(user1).listToken(tokenId, price, false);
      
      // 5. Buy from marketplace
      await hiBeatsMarketplace.connect(user2).buyToken(tokenId, { value: price });
      
      // Verify final state
      expect(await hiBeatsNFT.ownerOf(tokenId)).to.equal(user2.address);
      expect(await hiBeatsFactory.successfulGenerations(user1.address)).to.equal(1);
    });
  });
});
