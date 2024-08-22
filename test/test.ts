import { expect } from "chai";
import { ethers } from "hardhat";
import { CCIPLocalSimulator, CrossChainNameServiceLookup, CrossChainNameServiceReceiver, CrossChainNameServiceRegister } from "../typechain-types";

describe("CCIP Cross Chain Name Service", function () {
  let alice: any;
  let ccipSimulator: CCIPLocalSimulator;
  let ccnsRegister: CrossChainNameServiceRegister;
  let ccnsReceiver: CrossChainNameServiceReceiver;
  let sourceLookup: CrossChainNameServiceLookup;
  let destinationLookup: CrossChainNameServiceLookup;
  const domain = "alice.ccns";

  before(async function () {
    // Get signers
    [alice] = await ethers.getSigners();

    // Deploy CCIPLocalSimulator
    const CCIPLocalSimulator = await ethers.getContractFactory("CCIPLocalSimulator");
    ccipSimulator = await CCIPLocalSimulator.deploy();
    await ccipSimulator.deployed();
    const config = await ccipSimulator.configuration();
    const {
      chainSelector_,
      sourceRouter_,
      destinationRouter_,
    } = config;

    // Deploy CrossChainNameServiceLookup (Source & Destination)
    const CCNSLookup = await ethers.getContractFactory("CrossChainNameServiceLookup");
    sourceLookup = await CCNSLookup.deploy();
    await sourceLookup.deployed();
    destinationLookup = await CCNSLookup.deploy();
    await destinationLookup.deployed();

    // Deploy CrossChainNameServiceRegister
    const CCNSRegister = await ethers.getContractFactory("CrossChainNameServiceRegister");
    ccnsRegister = await CCNSRegister.deploy(sourceRouter_, sourceLookup.address);
    await ccnsRegister.deployed();
    await sourceLookup.setCrossChainNameServiceAddress(ccnsRegister.address);

    // Deploy CrossChainNameServiceReceiver
    const CCNSReceiver = await ethers.getContractFactory("CrossChainNameServiceReceiver");
    ccnsReceiver = await CCNSReceiver.deploy(destinationRouter_, destinationLookup.address, chainSelector_);
    await ccnsReceiver.deployed();
    await destinationLookup.setCrossChainNameServiceAddress(ccnsReceiver.address);

    // Enable Chain
    await ccnsRegister.enableChain(chainSelector_, ccnsReceiver.address, 500000);
  });

  it("should be able to register the domain on the source chain and lookup the domain on the destination chain", async function () {
    await ccnsRegister.register(domain);
    const resolvedAddress = await destinationLookup.lookup(domain);
    console.log(resolvedAddress)
    expect(resolvedAddress).to.equal(alice.address);
  });
});
