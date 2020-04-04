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

contract("BernardEscrow", (accounts) => {
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
    it("should set correct token address", async() => {
      assert.equal(await madoffContract.token.call(), token.address, "wrong token address");
    });

    it("should set tokenFractionProfitCalculatedTimes to 1", async() => {
      assert.equal(0, (await madoffContract.tokenFractionProfitCalculatedTimes.call()).cmp(new BN("1")), "wrong tokenFractionProfitCalculatedTimes");
    });
  });

  describe("calculateTokenFractionProfit", () => {
    it("should fail if sender has no tokens", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      assert.equal(1, ongoingBernardFee.cmp(new BN("0")), "ongoingBernardFee should be > 0");
      // console.log(ongoingBernardFee.toString());

      //  1
      await expectRevert(madoffContract.calculateTokenFractionProfit({
        from: PURCHASER_0
      }), "Not token owner");
    });

    it("should fail if calculation is disabled yet", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      assert.equal(1, ongoingBernardFee.cmp(new BN("0")), "ongoingBernardFee should be > 0");
      // console.log(ongoingBernardFee.toString());

      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      //  1
      for(let i = 0; i < 2; i ++) {
        await time.advanceBlock();
      }

      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] + SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      assert.equal(1, ongoingBernardFee.cmp(new BN("0")), "ongoingBernardFee should be > 0");
      // console.log(ongoingBernardFee.toString());

      await expectRevert(madoffContract.calculateTokenFractionProfit({
        from: OWNER
      }), "Calculation disabled");
    });

    it("should fail if not enough of ongoingBernardFee", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      assert.equal(1, ongoingBernardFee.cmp(new BN("0")), "ongoingBernardFee should be > 0");
      // console.log(ongoingBernardFee.toString());

      //  1
      await expectRevert(madoffContract.calculateTokenFractionProfit({
        from: OWNER
      }), "Not enough Bernardcut");
    });

    it("should update tokenFractionProfitForCalculatedIdx for calculation time idx", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      assert.equal(1, ongoingBernardFee.cmp(new BN("0")), "ongoingBernardFee should be > 0");
      // console.log(ongoingBernardFee.toString());
      let FRACTION_PROFIT_CORRECT = ongoingBernardFee.div(new BN("10000"));

      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      assert.equal(0, (await madoffContract.tokenFractionProfitForCalculatedIdx.call(1)).cmp(FRACTION_PROFIT_CORRECT), "wrong tokenFractionProfitForCalculatedIdx on 0");

      //  1
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }

      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] + SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      assert.equal(1, ongoingBernardFee.cmp(new BN("0")), "ongoingBernardFee should be > 0 on 1");
      // console.log(ongoingBernardFee.toString());
      FRACTION_PROFIT_CORRECT = ongoingBernardFee.div(new BN("10000"));

      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      assert.equal(0, (await madoffContract.tokenFractionProfitForCalculatedIdx.call(2)).cmp(FRACTION_PROFIT_CORRECT), "wrong tokenFractionProfitForCalculatedIdx on 1");
    });

    it("should increase tokenFractionProfitCalculatedTimes", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      assert.equal(1, ongoingBernardFee.cmp(new BN("0")), "ongoingBernardFee should be > 0");
      // console.log(ongoingBernardFee.toString());
      let FRACTION_PROFIT_CORRECT = ongoingBernardFee.div(new BN("10000"));

      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      assert.equal(0, (await madoffContract.tokenFractionProfitCalculatedTimes.call()).cmp(new BN("2")), "tokenFractionProfitCalculatedTimes should be 2 on 0");

      //  1
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }

      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] + SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      assert.equal(1, ongoingBernardFee.cmp(new BN("0")), "ongoingBernardFee should be > 0 on 1");
      // console.log(ongoingBernardFee.toString());
      FRACTION_PROFIT_CORRECT = ongoingBernardFee.div(new BN("10000"));

      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      assert.equal(0, (await madoffContract.tokenFractionProfitCalculatedTimes.call()).cmp(new BN("3")), "tokenFractionProfitCalculatedTimes should be 3 on 2");
    });

    it("should update prevCalculationBlock", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      assert.equal(1, ongoingBernardFee.cmp(new BN("0")), "ongoingBernardFee should be > 0");
      // console.log(ongoingBernardFee.toString());

      assert.equal(0, (await madoffContract.prevCalculationBlock.call()).cmp(new BN("0")), "wrong prevCalculationBlock on 0");
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      assert.equal(0, (await madoffContract.prevCalculationBlock.call()).cmp(await time.latestBlock()), "wrong prevCalculationBlock on 0");
      
      //  1
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }

      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] + SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      assert.equal(1, ongoingBernardFee.cmp(new BN("0")), "ongoingBernardFee should be > 0 on 1");
      // console.log(ongoingBernardFee.toString());

      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      assert.equal(0, (await madoffContract.prevCalculationBlock.call()).cmp(await time.latestBlock()), "wrong prevCalculationBlock on 1");
    });
    
    it("should delete ongoingBernardFee", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(1, (await madoffContract.ongoingBernardFee.call()).cmp(new BN("0")), "ongoingBernardFee should be > 0");
      // console.log(ongoingBernardFee.toString());

      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      assert.equal(0, (await madoffContract.ongoingBernardFee.call()).cmp(new BN("0")), "ongoingBernardFee should be == 0 on 0");

      //  1
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }

      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] + SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      assert.equal(1, ongoingBernardFee.cmp(new BN("0")), "ongoingBernardFee should be > 0 on 1");
      // console.log(ongoingBernardFee.toString());

      assert.equal(1, (await madoffContract.ongoingBernardFee.call()).cmp(new BN("0")), "ongoingBernardFee should be > 0 on 1");

      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      assert.equal(0, (await madoffContract.ongoingBernardFee.call()).cmp(new BN("0")), "ongoingBernardFee should be == 0 on 1");
    });
  });

});