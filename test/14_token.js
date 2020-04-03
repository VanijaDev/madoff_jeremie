const BernardsCutToken = artifacts.require("./BernardsCutToken");
const MadoffContract = artifacts.require("./MadoffContract");

const {
  BN,
  time,
  ether,
  balance,
  constants,
  expectEvent,
  expectRevert
} = require('@openzeppelin/test-helpers');
const {
  expect
} = require('chai');

contract("token", (accounts) => {
  const DEPLOYER = accounts[0];
  const OWNER = accounts[1];
  const WEBSITE_0 = "0x0000000000000000000000000000000000000000";
  const WEBSITE_1 = accounts[2];
  const WEBSITE_2 = accounts[3];
  const PURCHASER_0 = accounts[4];
  const PURCHASER_1 = accounts[5];

  const BLOCKS_FOR_STAGE =                      [99,        90,       80,       70,       60,         50,         45,         40,         35,         30,         25,         20,         10,         5];
  const SHARES_FOR_STAGE_TO_PURCHASE =          [2500,      5000,     3125,     12500,    10000,      62500,      62500,      400000,     390625,     2000000,    562500,     10000000,   12500000,   25000000];
  const SHARES_FOR_STAGE_TO_PURCHASE_ORIGINAL = [2500,      5000,     3125,     12500,    10000,      62500,      62500,      400000,     390625,     2000000,    562500,     10000000,   12500000,   25000000];
  const SHARE_PRICE_FOR_STAGE =                 [10000000,  20000000, 40000000, 80000000, 125000000,  160000000,  200000000,  250000000,  320000000,  500000000,  800000000,  1000000000, 1000000000, 1000000000];
  const EXCEED_BLOCKS =                         111;

  const SHARE_PURCHASE_PERCENT_JACKPOT = 40;
  const SHARE_PURCHASE_PERCENT_PURCHASED_SHARES = 50;
  const SHARE_PURCHASE_PERCENT_BERNARD_WEBSITE = 5;  //  both has 5%

  const JACKPOT_PERCENT_WINNER = 80;

  let token;
  let madoffContract;

  beforeEach("setup", async () => {
    await time.advanceBlock();

    token = await BernardsCutToken.new(OWNER);

    madoffContract = await MadoffContract.new(OWNER, token.address);
    await token.updateBernardEscrow(madoffContract.address);
  });

  describe("constructor", () => {
    it("should mint 7000 to owner", async() => {
      assert.equal(0, (await token.balanceOf(OWNER)).cmp(new BN("7000")), "balance should be 7000");
    });

    it("should mint 3000 to sender", async() => {
      assert.equal(0, (await token.balanceOf(DEPLOYER)).cmp(new BN("3000")), "balance should be 3000");
    });
  });

  describe("updateBernardEscrow", () => {
    it("should fail if already set", async() => {
      let tokenTmp = await BernardsCutToken.new(OWNER);
      await tokenTmp.updateBernardEscrow(madoffContract.address);
      await expectRevert(tokenTmp.updateBernardEscrow(madoffContract.address), "Already set");
      await expectRevert(tokenTmp.updateBernardEscrow(WEBSITE_1), "Already set");
    });

    it("should set correct address", async() => {
      assert.equal(await token.escrow(), madoffContract.address, "wrong escrow address");
    });
  });

  describe("transfer", () => {
    it("should prior withdraw pending token profit for sender", async() => {
      //  0 - purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      // console.log("ongoingBernardFee:   ", ongoingBernardFee.toString());

      //  1 - calculate Bernard fraction profit
      await madoffContract.calculateTokenFractionProfit();
      let senderBernardProfitBefore = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      // console.log("senderBernardProfitBefore: ", senderBernardProfitBefore.toString());
      const OWNER_PART_CORRECT = new BN(ongoingBernardFee.toString()).mul(new BN("70")).div(new BN("100"));
      // console.log("OWNER_PART_CORRECT:  ", OWNER_PART_CORRECT.toString());
      assert.equal(0, OWNER_PART_CORRECT.cmp(new BN(senderBernardProfitBefore.toString())), "wrong OWNER_PART");

      //  2 - should withdraw pending profit before token transfer
      await token.transfer(PURCHASER_0, 10, 100, {
        from: OWNER
      });
      let senderBernardProfitAfter = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      // console.log("senderBernardProfitAfter:  ", senderBernardProfitAfter.toString());

      assert.equal(0, senderBernardProfitAfter.cmp(new BN("0")), "should be 0");
    });

    it("should prior withdraw pending token profit for receiver", async() => {
      //  0 - purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      // console.log("ongoingBernardFee:   ", ongoingBernardFee.toString());

      //  1 - calculate Bernard fraction profit
      await madoffContract.calculateTokenFractionProfit();
      let receiverBernardProfitBefore = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      // console.log("receiverBernardProfitBefore: ", receiverBernardProfitBefore.toString());
      const OWNER_PART_CORRECT = new BN(ongoingBernardFee.toString()).mul(new BN("70")).div(new BN("100"));
      // console.log("OWNER_PART_CORRECT:  ", OWNER_PART_CORRECT.toString());
      assert.equal(0, OWNER_PART_CORRECT.cmp(new BN(receiverBernardProfitBefore.toString())), "wrong OWNER_PART");

      //  2 - should withdraw pending profit before token transfer
      await token.transfer(OWNER, 10, 100, {
        from: DEPLOYER
      });
      let receiverBernardProfitAfter = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      // console.log("receiverBernardProfitAfter:  ", receiverBernardProfitAfter.toString());

      assert.equal(0, receiverBernardProfitAfter.cmp(new BN("0")), "should be 0");
    });

    it("should prior withdraw pending token profit for sender & receiver", async() => {
      //  0 - purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      // console.log("ongoingBernardFee:   ", ongoingBernardFee.toString());

      //  1 - calculate Bernard fraction profit
      await madoffContract.calculateTokenFractionProfit();
      let senderBernardProfitBefore = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: DEPLOYER
      });
      let receiverBernardProfitBefore = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      // console.log("senderBernardProfitBefore:   ", senderBernardProfitBefore.toString());
      // console.log("receiverBernardProfitBefore: ", receiverBernardProfitBefore.toString());
      assert.equal(1, senderBernardProfitBefore.cmp(new BN("0")), "should be > 0 for sender");
      assert.equal(1, receiverBernardProfitBefore.cmp(new BN("0")), "should be > 0 for receiver");
      
      //  2 - should withdraw pending profit before token transfer
      await token.transfer(OWNER, 10, 100, {
        from: DEPLOYER
      });
      let senderBernardProfitAfter = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: DEPLOYER
      });
      let receiverBernardProfitAfter = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      // console.log("senderBernardProfitAfter:    ", senderBernardProfitAfter.toString());
      // console.log("receiverBernardProfitAfter:  ", receiverBernardProfitAfter.toString());

      assert.equal(0, senderBernardProfitAfter.cmp(new BN("0")), "should be 0 for sender");
      assert.equal(0, receiverBernardProfitAfter.cmp(new BN("0")), "should be 0 for receiver");
    });

    it("should transfer token from sender to receiver", async() => {
      //  0 - purchase
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      
      //  1 -  check balances
      let OWNER_balanceBefore = await token.balanceOf(OWNER);
      assert.equal(0, OWNER_balanceBefore.cmp(new BN("7000")), "shold be 7000");

      let DEPLOYER_balanceBefore = await token.balanceOf(DEPLOYER);
      assert.equal(0, DEPLOYER_balanceBefore.cmp(new BN("3000")), "shold be 3000");
      
      //  2 - transfer
      await token.transfer(DEPLOYER, 10, 100, {
        from: OWNER
      });

      //  3 -  check balances
      let OWNER_balanceAfter = await token.balanceOf(OWNER);
      assert.equal(0, OWNER_balanceAfter.cmp(new BN("6990")), "shold be 6990");

      let DEPLOYER_balanceAfter = await token.balanceOf(DEPLOYER);
      assert.equal(0, DEPLOYER_balanceAfter.cmp(new BN("3010")), "shold be 3010");
    });
  });

});