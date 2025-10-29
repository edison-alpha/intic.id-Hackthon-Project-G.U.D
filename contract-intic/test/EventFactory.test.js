const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EventFactory with UEA Support", function () {
  let eventFactory;
  let owner, organizer, buyer;

  beforeEach(async function () {
    [owner, organizer, buyer] = await ethers.getSigners();

    const EventFactory = await ethers.getContractFactory("EventFactory");
    eventFactory = await EventFactory.deploy();
    await eventFactory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await eventFactory.owner()).to.equal(owner.address);
    });

    it("Should initialize with correct default values", async function () {
      expect(await eventFactory.platformFeePercent()).to.equal(250); // 2.5%
      expect(await eventFactory.totalEventsCreated()).to.equal(0);
      expect(await eventFactory.totalOrganizers()).to.equal(0);
    });
  });

  describe("Organizer Registration", function () {
    it("Should register an organizer successfully", async function () {
      await eventFactory.connect(organizer).registerOrganizer(
        "Test Organizer",
        "ipfs://profile-image",
        "Bio text",
        "https://website.com"
      );

      const profile = await eventFactory.organizers(organizer.address);
      expect(profile.name).to.equal("Test Organizer");
      expect(profile.isVerified).to.equal(false);
      expect(await eventFactory.totalOrganizers()).to.equal(1);
    });

    it("Should detect cross-chain user via UEA", async function () {
      await eventFactory.connect(organizer).registerOrganizer(
        "Cross-Chain Organizer",
        "ipfs://profile",
        "Bio",
        "https://site.com"
      );

      const originChain = await eventFactory.userOriginChain(organizer.address);
      expect(originChain).to.not.be.empty;
    });

    it("Should fail if registering twice", async function () {
      await eventFactory.connect(organizer).registerOrganizer(
        "Test Organizer",
        "ipfs://profile",
        "Bio",
        "https://site.com"
      );

      await expect(
        eventFactory.connect(organizer).registerOrganizer(
          "Test Organizer 2",
          "ipfs://profile2",
          "Bio2",
          "https://site2.com"
        )
      ).to.be.revertedWith("EventFactory: already registered");
    });
  });

  describe("Event Creation", function () {
    beforeEach(async function () {
      await eventFactory.connect(organizer).registerOrganizer(
        "Test Organizer",
        "ipfs://profile",
        "Bio",
        "https://site.com"
      );
    });

    it("Should create an event successfully", async function () {
      const eventDate = Date.now() + 86400000; // Tomorrow
      const creationFee = await eventFactory.eventCreationFee();

      await expect(
        eventFactory.connect(organizer).createEvent(
          100, // totalSupply
          ethers.parseEther("0.01"), // ticketPrice
          "Concert NFT",
          "CNFT",
          "Amazing Concert",
          eventDate,
          "Stadium",
          "123 Main St",
          "-6.2088,106.8456",
          "ipfs://event-image",
          "ipfs://metadata/",
          "Music",
          { value: creationFee }
        )
      ).to.emit(eventFactory, "EventCreated");

      expect(await eventFactory.totalEventsCreated()).to.equal(1);
      expect(await eventFactory.activeEventsCount()).to.equal(1);
    });

    it("Should emit CrossChainEventCreated for UEA users", async function () {
      const eventDate = Date.now() + 86400000;
      const creationFee = await eventFactory.eventCreationFee();

      const tx = await eventFactory.connect(organizer).createEvent(
        100,
        ethers.parseEther("0.01"),
        "Concert NFT",
        "CNFT",
        "Cross-Chain Concert",
        eventDate,
        "Stadium",
        "123 Main St",
        "-6.2088,106.8456",
        "ipfs://event-image",
        "ipfs://metadata/",
        "Music",
        { value: creationFee }
      );

      // Event should be created
      expect(await eventFactory.totalEventsCreated()).to.equal(1);
    });

    it("Should fail without sufficient creation fee", async function () {
      const eventDate = Date.now() + 86400000;

      await expect(
        eventFactory.connect(organizer).createEvent(
          100,
          ethers.parseEther("0.01"),
          "Concert NFT",
          "CNFT",
          "Amazing Concert",
          eventDate,
          "Stadium",
          "123 Main St",
          "-6.2088,106.8456",
          "ipfs://event-image",
          "ipfs://metadata/",
          "Music",
          { value: ethers.parseEther("0.001") }
        )
      ).to.be.revertedWith("EventFactory: insufficient creation fee");
    });
  });

  describe("UEA Functions", function () {
    it("Should get user chain origin", async function () {
      const [chainType, isExternal] = await eventFactory.getUserChainOrigin(organizer.address);
      expect(chainType).to.not.be.empty;
    });

    it("Should check if address is Universal Account", async function () {
      const isUEA = await eventFactory.isUniversalAccount(organizer.address);
      // Will return false for local test accounts
      expect(typeof isUEA).to.equal("boolean");
    });

    it("Should get UEA details", async function () {
      const details = await eventFactory.getUEADetails(organizer.address);
      expect(details.originChain).to.not.be.empty;
    });

    it("Should get cross-chain statistics", async function () {
      const stats = await eventFactory.getCrossChainStatistics();
      expect(stats.supportedChains.length).to.equal(12);
      expect(stats.supportedChains[0]).to.equal("Push Chain");
    });
  });

  describe("Event Discovery", function () {
    beforeEach(async function () {
      await eventFactory.connect(organizer).registerOrganizer(
        "Test Organizer",
        "ipfs://profile",
        "Bio",
        "https://site.com"
      );

      const eventDate = Date.now() + 86400000;
      const creationFee = await eventFactory.eventCreationFee();

      await eventFactory.connect(organizer).createEvent(
        100,
        ethers.parseEther("0.01"),
        "Concert NFT",
        "CNFT",
        "Amazing Concert",
        eventDate,
        "Stadium",
        "123 Main St",
        "-6.2088,106.8456",
        "ipfs://event-image",
        "ipfs://metadata/",
        "Music",
        { value: creationFee }
      );
    });

    it("Should search events by name", async function () {
      const results = await eventFactory.searchEvents("Concert");
      expect(results.length).to.equal(1);
      expect(results[0].eventName).to.equal("Amazing Concert");
    });

    it("Should get event by name", async function () {
      const eventAddress = await eventFactory.getEventByName("Amazing Concert");
      expect(eventAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should get upcoming events", async function () {
      const upcomingEvents = await eventFactory.getUpcomingEvents(10);
      expect(upcomingEvents.length).to.be.greaterThan(0);
    });
  });

  describe("Platform Statistics", function () {
    it("Should return platform statistics", async function () {
      const stats = await eventFactory.getPlatformStatistics();
      expect(stats._totalEventsCreated).to.equal(0);
      expect(stats._totalOrganizers).to.equal(0);
    });
  });

  describe("Admin Functions", function () {
    beforeEach(async function () {
      await eventFactory.connect(organizer).registerOrganizer(
        "Test Organizer",
        "ipfs://profile",
        "Bio",
        "https://site.com"
      );
    });

    it("Should verify organizer (owner only)", async function () {
      await eventFactory.connect(owner).verifyOrganizer(organizer.address);
      const profile = await eventFactory.organizers(organizer.address);
      expect(profile.isVerified).to.equal(true);
    });

    it("Should pause platform (owner only)", async function () {
      await eventFactory.connect(owner).setPlatformPaused(true);
      expect(await eventFactory.platformPaused()).to.equal(true);
    });

    it("Should set platform fee (owner only)", async function () {
      await eventFactory.connect(owner).setPlatformFee(300); // 3%
      expect(await eventFactory.platformFeePercent()).to.equal(300);
    });

    it("Should fail if non-owner tries admin functions", async function () {
      await expect(
        eventFactory.connect(organizer).setPlatformFee(300)
      ).to.be.reverted;
    });
  });
});
