const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HiBeatsProfile", function () {
  let hiBeatsProfile;
  let owner;
  let user1;
  let user2;
  let user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const HiBeatsProfile = await ethers.getContractFactory("HiBeatsProfile");
    hiBeatsProfile = await HiBeatsProfile.deploy();
    await hiBeatsProfile.deployed();
  });

  describe("Profile Creation", function () {
    it("Should create a profile successfully", async function () {
      const username = "testuser";
      const displayName = "Test User";
      const bio = "This is a test bio";
      const avatar = "https://example.com/avatar.jpg";

      await expect(
        hiBeatsProfile.connect(user1).createProfile(username, displayName, bio, avatar)
      ).to.emit(hiBeatsProfile, "ProfileCreated")
        .withArgs(user1.address, username);

      const profile = await hiBeatsProfile.profiles(user1.address);
      expect(profile.username).to.equal(username);
      expect(profile.displayName).to.equal(displayName);
      expect(profile.bio).to.equal(bio);
      expect(profile.avatar).to.equal(avatar);
      expect(profile.isActive).to.be.true;
      expect(profile.followerCount).to.equal(0);
      expect(profile.followingCount).to.equal(0);
    });

    it("Should prevent duplicate usernames", async function () {
      const username = "duplicate";
      
      await hiBeatsProfile.connect(user1).createProfile(username, "User 1", "Bio 1", "avatar1.jpg");
      
      await expect(
        hiBeatsProfile.connect(user2).createProfile(username, "User 2", "Bio 2", "avatar2.jpg")
      ).to.be.revertedWith("Username already taken");
    });

    it("Should prevent creating multiple profiles for same user", async function () {
      await hiBeatsProfile.connect(user1).createProfile("user1", "User 1", "Bio 1", "avatar1.jpg");
      
      await expect(
        hiBeatsProfile.connect(user1).createProfile("user1new", "User 1 New", "New Bio", "newavatar.jpg")
      ).to.be.revertedWith("Profile already exists");
    });

    it("Should validate username length", async function () {
      // Too short
      await expect(
        hiBeatsProfile.connect(user1).createProfile("ab", "User", "Bio", "avatar.jpg")
      ).to.be.revertedWith("Username too short");

      // Too long (21 characters)
      await expect(
        hiBeatsProfile.connect(user1).createProfile("a".repeat(21), "User", "Bio", "avatar.jpg")
      ).to.be.revertedWith("Username too long");
    });

    it("Should validate bio length", async function () {
      const longBio = "a".repeat(501); // Exceeds MAX_BIO_LENGTH (500)
      
      await expect(
        hiBeatsProfile.connect(user1).createProfile("user1", "User", longBio, "avatar.jpg")
      ).to.be.revertedWith("Bio too long");
    });
  });

  describe("Profile Updates", function () {
    beforeEach(async function () {
      await hiBeatsProfile.connect(user1).createProfile("user1", "User 1", "Original bio", "avatar1.jpg");
    });

    it("Should update profile successfully", async function () {
      const newDisplayName = "Updated User";
      const newBio = "Updated bio";
      const newAvatar = "https://example.com/newavatar.jpg";
      const newCover = "https://example.com/cover.jpg";
      const newWebsite = "https://example.com";

      await expect(
        hiBeatsProfile.connect(user1).updateProfile(newDisplayName, newBio, newAvatar, newCover, newWebsite)
      ).to.emit(hiBeatsProfile, "ProfileUpdated")
        .withArgs(user1.address);

      const profile = await hiBeatsProfile.profiles(user1.address);
      expect(profile.displayName).to.equal(newDisplayName);
      expect(profile.bio).to.equal(newBio);
      expect(profile.avatar).to.equal(newAvatar);
      expect(profile.coverImage).to.equal(newCover);
      expect(profile.website).to.equal(newWebsite);
    });

    it("Should update social links", async function () {
      const socialLinks = ["https://twitter.com/user", "https://instagram.com/user"];

      await expect(
        hiBeatsProfile.connect(user1).updateSocialLinks(socialLinks)
      ).to.emit(hiBeatsProfile, "ProfileUpdated")
        .withArgs(user1.address);
    });

    it("Should prevent updating non-existent profile", async function () {
      await expect(
        hiBeatsProfile.connect(user2).updateProfile("Name", "Bio", "Avatar", "Cover", "Website")
      ).to.be.revertedWith("Profile does not exist");
    });
  });

  describe("Follow System", function () {
    beforeEach(async function () {
      await hiBeatsProfile.connect(user1).createProfile("user1", "User 1", "Bio 1", "avatar1.jpg");
      await hiBeatsProfile.connect(user2).createProfile("user2", "User 2", "Bio 2", "avatar2.jpg");
      await hiBeatsProfile.connect(user3).createProfile("user3", "User 3", "Bio 3", "avatar3.jpg");
    });

    it("Should follow a user successfully", async function () {
      await expect(
        hiBeatsProfile.connect(user1).followUser(user2.address)
      ).to.emit(hiBeatsProfile, "UserFollowed")
        .withArgs(user1.address, user2.address);

      const isFollowing = await hiBeatsProfile.isFollowing(user1.address, user2.address);
      const isFollower = await hiBeatsProfile.isFollower(user2.address, user1.address);
      
      expect(isFollowing).to.be.true;
      expect(isFollower).to.be.true;

      const [user1Following, user1Followers] = await hiBeatsProfile.getFollowStats(user1.address);
      const [user2Following, user2Followers] = await hiBeatsProfile.getFollowStats(user2.address);

      expect(user1Following).to.equal(1);
      expect(user1Followers).to.equal(0);
      expect(user2Following).to.equal(0);
      expect(user2Followers).to.equal(1);
    });

    it("Should unfollow a user successfully", async function () {
      // First follow
      await hiBeatsProfile.connect(user1).followUser(user2.address);

      // Then unfollow
      await expect(
        hiBeatsProfile.connect(user1).unfollowUser(user2.address)
      ).to.emit(hiBeatsProfile, "UserUnfollowed")
        .withArgs(user1.address, user2.address);

      const isFollowing = await hiBeatsProfile.isFollowing(user1.address, user2.address);
      expect(isFollowing).to.be.false;
    });

    it("Should prevent following yourself", async function () {
      await expect(
        hiBeatsProfile.connect(user1).followUser(user1.address)
      ).to.be.revertedWith("Cannot follow yourself");
    });

    it("Should prevent following without profile", async function () {
      const [, , , , noProfile] = await ethers.getSigners();
      
      await expect(
        hiBeatsProfile.connect(noProfile).followUser(user1.address)
      ).to.be.revertedWith("You need a profile to follow");
    });

    it("Should prevent double following", async function () {
      await hiBeatsProfile.connect(user1).followUser(user2.address);
      
      await expect(
        hiBeatsProfile.connect(user1).followUser(user2.address)
      ).to.be.revertedWith("Already following");
    });

    it("Should prevent unfollowing when not following", async function () {
      await expect(
        hiBeatsProfile.connect(user1).unfollowUser(user2.address)
      ).to.be.revertedWith("Not following");
    });
  });

  describe("Creator Verification", function () {
    beforeEach(async function () {
      await hiBeatsProfile.connect(user1).createProfile("user1", "User 1", "Bio 1", "avatar1.jpg");
    });

    it("Should verify a creator", async function () {
      await expect(
        hiBeatsProfile.connect(owner).verifyCreator(user1.address)
      ).to.emit(hiBeatsProfile, "ProfileVerified")
        .withArgs(user1.address);

      const profile = await hiBeatsProfile.profiles(user1.address);
      expect(profile.isVerified).to.be.true;
    });

    it("Should remove verification", async function () {
      await hiBeatsProfile.connect(owner).verifyCreator(user1.address);
      await hiBeatsProfile.connect(owner).removeVerification(user1.address);

      const profile = await hiBeatsProfile.profiles(user1.address);
      expect(profile.isVerified).to.be.false;
    });

    it("Should only allow owner to verify", async function () {
      await expect(
        hiBeatsProfile.connect(user2).verifyCreator(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Creator Levels", function () {
    beforeEach(async function () {
      await hiBeatsProfile.connect(user1).createProfile("user1", "User 1", "Bio 1", "avatar1.jpg");
    });

    it("Should return NEWCOMER for 0-10 tracks", async function () {
      await hiBeatsProfile.connect(owner).updateStats(user1.address, 5, 100, 10);
      const level = await hiBeatsProfile.getCreatorLevel(user1.address);
      expect(level).to.equal(0); // NEWCOMER
    });

    it("Should return RISING for 11-50 tracks", async function () {
      await hiBeatsProfile.connect(owner).updateStats(user1.address, 25, 1000, 50);
      const level = await hiBeatsProfile.getCreatorLevel(user1.address);
      expect(level).to.equal(1); // RISING
    });

    it("Should return ESTABLISHED for 51-99 tracks", async function () {
      await hiBeatsProfile.connect(owner).updateStats(user1.address, 75, 5000, 150);
      const level = await hiBeatsProfile.getCreatorLevel(user1.address);
      expect(level).to.equal(2); // ESTABLISHED
    });

    it("Should return LEGEND for 100+ tracks", async function () {
      await hiBeatsProfile.connect(owner).updateStats(user1.address, 150, 10000, 500);
      const level = await hiBeatsProfile.getCreatorLevel(user1.address);
      expect(level).to.equal(3); // LEGEND
    });
  });

  describe("Username Change", function () {
    beforeEach(async function () {
      await hiBeatsProfile.connect(user1).createProfile("oldusername", "User 1", "Bio 1", "avatar1.jpg");
    });

    it("Should change username successfully", async function () {
      const newUsername = "newusername";
      
      await expect(
        hiBeatsProfile.connect(user1).changeUsername(newUsername)
      ).to.emit(hiBeatsProfile, "UsernameChanged")
        .withArgs(user1.address, "oldusername", newUsername);

      const profile = await hiBeatsProfile.profiles(user1.address);
      expect(profile.username).to.equal(newUsername);

      // Old username should be available
      const oldUsernameAddress = await hiBeatsProfile.usernameToAddress("oldusername");
      expect(oldUsernameAddress).to.equal(ethers.constants.AddressZero);

      // New username should point to user
      const newUsernameAddress = await hiBeatsProfile.usernameToAddress(newUsername);
      expect(newUsernameAddress).to.equal(user1.address);
    });

    it("Should prevent changing to existing username", async function () {
      await hiBeatsProfile.connect(user2).createProfile("existinguser", "User 2", "Bio 2", "avatar2.jpg");
      
      await expect(
        hiBeatsProfile.connect(user1).changeUsername("existinguser")
      ).to.be.revertedWith("Username already taken");
    });
  });

  describe("Profile Queries", function () {
    beforeEach(async function () {
      await hiBeatsProfile.connect(user1).createProfile("user1", "User 1", "Bio 1", "avatar1.jpg");
    });

    it("Should get profile by username", async function () {
      const profile = await hiBeatsProfile.getProfileByUsername("user1");
      expect(profile.displayName).to.equal("User 1");
      expect(profile.username).to.equal("user1");
    });

    it("Should revert for non-existent username", async function () {
      await expect(
        hiBeatsProfile.getProfileByUsername("nonexistent")
      ).to.be.revertedWith("Username not found");
    });
  });

  describe("Contract Pausing", function () {
    it("Should pause and unpause contract", async function () {
      await hiBeatsProfile.connect(owner).pause();
      
      await expect(
        hiBeatsProfile.connect(user1).createProfile("user1", "User 1", "Bio 1", "avatar1.jpg")
      ).to.be.revertedWith("Pausable: paused");

      await hiBeatsProfile.connect(owner).unpause();
      
      await expect(
        hiBeatsProfile.connect(user1).createProfile("user1", "User 1", "Bio 1", "avatar1.jpg")
      ).to.not.be.reverted;
    });
  });
});
