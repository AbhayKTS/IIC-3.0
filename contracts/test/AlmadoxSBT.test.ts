import { expect } from "chai";
import { ethers } from "hardhat";
import { AlmadoxSBT } from "../typechain-types";

describe("AlmadoxSBT", function () {
  let sbt: AlmadoxSBT;
  let owner: any;
  let student1: any;
  let student2: any;

  beforeEach(async function () {
    [owner, student1, student2] = await ethers.getSigners();
    const SBTFactory = await ethers.getContractFactory("AlmadoxSBT");
    sbt = await SBTFactory.deploy();
  });

  it("Should deploy with correct name and symbol", async function () {
    expect(await sbt.name()).to.equal("Almadox Soulbound Token");
    expect(await sbt.symbol()).to.equal("ASBT");
  });

  it("Should mint an SBT to a student wallet", async function () {
    const tx = await sbt.mint(
      student1.address,
      "IIC 3.0 Finalist",
      "Manipal University Jaipur",
      "Top 10 finalist in the International Innovation Challenge 3.0"
    );
    await tx.wait();

    expect(await sbt.balanceOf(student1.address)).to.equal(1);
    expect(await sbt.ownerOf(0)).to.equal(student1.address);
  });

  it("Should store achievement metadata correctly", async function () {
    await sbt.mint(student1.address, "Test Award", "Test Issuer", "Test Reason");
    const achievement = await sbt.achievements(0);

    expect(achievement.title).to.equal("Test Award");
    expect(achievement.issuedBy).to.equal("Test Issuer");
    expect(achievement.reason).to.equal("Test Reason");
    expect(achievement.recipient).to.equal(student1.address);
  });

  it("Should report all tokens as locked (ERC-5192)", async function () {
    await sbt.mint(student1.address, "Test", "Issuer", "Reason");
    expect(await sbt.locked(0)).to.be.true;
  });

  it("Should BLOCK token transfers (truly soulbound)", async function () {
    await sbt.mint(student1.address, "Test", "Issuer", "Reason");

    // Any transfer attempt should fail
    await expect(
      sbt.connect(student1).transferFrom(student1.address, student2.address, 0)
    ).to.be.revertedWith("AlmadoxSBT: tokens are non-transferable");
  });

  it("Should only allow owner to mint", async function () {
    await expect(
      sbt.connect(student1).mint(student2.address, "Fake", "Fake", "Fake")
    ).to.be.revertedWithCustomError(sbt, "OwnableUnauthorizedAccount");
  });

  it("Should mint multiple SBTs to same student", async function () {
    await sbt.mint(student1.address, "Award 1", "Issuer", "Reason");
    await sbt.mint(student1.address, "Award 2", "Issuer", "Reason");
    expect(await sbt.balanceOf(student1.address)).to.equal(2);
  });

  it("Should return correct tokensOfOwner", async function () {
    await sbt.mint(student1.address, "Award 1", "Issuer", "Reason");
    await sbt.mint(student2.address, "Award 2", "Issuer", "Reason");
    await sbt.mint(student1.address, "Award 3", "Issuer", "Reason");

    const tokens = await sbt.tokensOfOwner(student1.address);
    expect(tokens.length).to.equal(2);
    expect(tokens[0]).to.equal(0n);
    expect(tokens[1]).to.equal(2n);
  });

  it("Should emit Locked and SBTMinted events on mint", async function () {
    await expect(sbt.mint(student1.address, "Award", "Issuer", "Reason"))
      .to.emit(sbt, "Locked").withArgs(0)
      .and.to.emit(sbt, "SBTMinted").withArgs(0, student1.address, "Award", "Issuer");
  });
});
