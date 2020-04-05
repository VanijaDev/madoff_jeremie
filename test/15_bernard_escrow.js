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
      }), "Not token holder");
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

  describe("pendingProfitInBernardCut", () => {
    it("should return correct sum after single tokenFractionProfitCalculatedTimes", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let ongoingBernardFee = await madoffContract.ongoingBernardFee.call();
      assert.equal(1, ongoingBernardFee.cmp(new BN("0")), "ongoingBernardFee should be > 0");
      // console.log(ongoingBernardFee.toString());

      const CORRECT_SUM = ongoingBernardFee.mul(await token.balanceOf(OWNER)).div(new BN("10000"));
      // console.log(CORRECT_SUM.toString());

      //  1
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      let profit = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      assert.equal(0, profit.cmp(CORRECT_SUM), "wrong profit");
      
    });
    
    it("should return correct sum after 3 tokenFractionProfitCalculatedTimes", async() => {
      //  0 - 2500 * 10000000 + 5000 * 20000000 + 3125 * 40000000 = 250 000 000 000 * 0.55 = 137500000000
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      let ongoingBernardFee_0 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_0.toString());
      assert.equal(0, ongoingBernardFee_0.cmp(new BN("137500000000")), "wrong ongoingBernardFee_0");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      //  1
      //  12500 * 80000000 * 0.05 = 50000000000
      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  10000 * 125000000 * 0.05 = 62500000000
      //  Total: 50000000000 + 62500000000 = 112500000000
      VALUE = SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      let ongoingBernardFee_1 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_1.toString());
      assert.equal(0, ongoingBernardFee_1.cmp(new BN("112500000000")), "wrong ongoingBernardFee_1");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      //  2
      //  62500 * 160000000 * 0.05 = 500000000000
      VALUE = SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  62500 * 200000000 * 0.05 = 625000000000
      //  Total: 500000000000 + 625000000000 = 1125000000000
      VALUE = SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      let ongoingBernardFee_2 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_2.toString());
      assert.equal(0, ongoingBernardFee_2.cmp(new BN("1125000000000")), "wrong ongoingBernardFee_2");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      //  3
      //  137500000000 + 112500000000 + 1125000000000 = 1375000000000 * 7000 / 10000 = 962500000000
      const CORRECT_SUM = ongoingBernardFee_0.add(ongoingBernardFee_1).add(ongoingBernardFee_2).mul(await token.balanceOf(OWNER)).div(new BN("10000"));
      // console.log(CORRECT_SUM.toString());
      assert.equal(0, CORRECT_SUM.cmp(new BN("962500000000")), "wrong CORRECT_SUM");

      //  4
      let profit = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      assert.equal(0, profit.cmp(CORRECT_SUM), "wrong profit");
    });
    
    it("should return correct sum if loopLimit is less, than tokenFractionProfitCalculatedTimes number", async() => {
      //  0 - 2500 * 10000000 + 5000 * 20000000 + 3125 * 40000000 = 250 000 000 000 * 0.55 = 137500000000
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      let ongoingBernardFee_0 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_0.toString());
      assert.equal(0, ongoingBernardFee_0.cmp(new BN("137500000000")), "wrong ongoingBernardFee_0");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      //  1
      //  12500 * 80000000 * 0.05 = 50000000000
      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  10000 * 125000000 * 0.05 = 62500000000
      //  Total: 50000000000 + 62500000000 = 112500000000
      VALUE = SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      let ongoingBernardFee_1 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_1.toString());
      assert.equal(0, ongoingBernardFee_1.cmp(new BN("112500000000")), "wrong ongoingBernardFee_1");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      //  2
      //  62500 * 160000000 * 0.05 = 500000000000
      VALUE = SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  62500 * 200000000 * 0.05 = 625000000000
      //  Total: 500000000000 + 625000000000 = 1125000000000
      VALUE = SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      let ongoingBernardFee_2 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_2.toString());
      assert.equal(0, ongoingBernardFee_2.cmp(new BN("1125000000000")), "wrong ongoingBernardFee_2");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      //  3
      //  137500000000 * 7000 / 10000 = 96250000000
      let CORRECT_SUM = ongoingBernardFee_0.mul(await token.balanceOf(OWNER)).div(new BN("10000"));
      // console.log(CORRECT_SUM.toString());
      assert.equal(0, CORRECT_SUM.cmp(new BN("96250000000")), "wrong CORRECT_SUM on 3");

      let profit = await madoffContract.pendingProfitInBernardCut.call(1, {
        from: OWNER
      });
      assert.equal(0, profit.cmp(CORRECT_SUM), "wrong profit");

      //  4
      //  137500000000 + 112500000000 = 250000000000 * 7000 / 10000 = 175000000000
      CORRECT_SUM = ongoingBernardFee_0.add(ongoingBernardFee_1).mul(await token.balanceOf(OWNER)).div(new BN("10000"));
      // console.log(CORRECT_SUM.toString());
      assert.equal(0, CORRECT_SUM.cmp(new BN("175000000000")), "wrong CORRECT_SUM on 4");

      profit = await madoffContract.pendingProfitInBernardCut.call(2, {
        from: OWNER
      });
      assert.equal(0, profit.cmp(CORRECT_SUM), "wrong profit");
    });

    it("should return correct sum after single tokenFractionProfitCalculatedTimes after withdrawal", async() => {
      //  0 - 2500 * 10000000 + 5000 * 20000000 + 3125 * 40000000 = 250 000 000 000 * 0.55 = 137500000000
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      let ongoingBernardFee_0 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_0.toString());
      assert.equal(0, ongoingBernardFee_0.cmp(new BN("137500000000")), "wrong ongoingBernardFee_0");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      await madoffContract.withdrawProfit(10, {
        from: OWNER
      })

      //  1
      //  12500 * 80000000 * 0.05 = 50000000000
      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  10000 * 125000000 * 0.05 = 62500000000
      //  Total: 50000000000 + 62500000000 = 112500000000
      VALUE = SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      let ongoingBernardFee_1 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_1.toString());
      assert.equal(0, ongoingBernardFee_1.cmp(new BN("112500000000")), "wrong ongoingBernardFee_1");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      //  112500000000 * 7000 / 10000 = 78750000000
      let CORRECT_SUM = ongoingBernardFee_1.mul(await token.balanceOf(OWNER)).div(new BN("10000"));
      // console.log(CORRECT_SUM.toString());
      assert.equal(0, CORRECT_SUM.cmp(new BN("78750000000")), "wrong CORRECT_SUM");

      let profit = await madoffContract.pendingProfitInBernardCut.call(1, {
        from: OWNER
      });
      assert.equal(0, profit.cmp(CORRECT_SUM), "wrong profit");
    });
    
    it("should return correct sum after 3 tokenFractionProfitCalculatedTimes after withdrawal", async() => {
      //  0 - 2500 * 10000000 + 5000 * 20000000 + 3125 * 40000000 = 250 000 000 000 * 0.55 = 137500000000
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      let ongoingBernardFee_0 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_0.toString());
      assert.equal(0, ongoingBernardFee_0.cmp(new BN("137500000000")), "wrong ongoingBernardFee_0");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      await madoffContract.withdrawProfit(10, {
        from: OWNER
      })



      //  1
      //  12500 * 80000000 * 0.05 = 50000000000
      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  10000 * 125000000 * 0.05 = 62500000000
      //  Total: 50000000000 + 62500000000 = 112500000000
      VALUE = SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      let ongoingBernardFee_1 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_1.toString());
      assert.equal(0, ongoingBernardFee_1.cmp(new BN("112500000000")), "wrong ongoingBernardFee_1");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      //  2
      //  62500 * 160000000 * 0.05 = 500000000000
      VALUE = SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  62500 * 200000000 * 0.05 = 625000000000
      //  Total: 500000000000 + 625000000000 = 1125000000000
      VALUE = SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      let ongoingBernardFee_2 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_2.toString());
      assert.equal(0, ongoingBernardFee_2.cmp(new BN("1125000000000")), "wrong ongoingBernardFee_2");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      //  3
      //  400000 * 250000000 * 0.05 = 5000000000000
      VALUE = SHARE_PRICE_FOR_STAGE[7] * SHARES_FOR_STAGE_TO_PURCHASE[7];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  390625 * 320000000 * 0.05 = 6250000000000
      //  Total: 5000000000000 + 6250000000000 = 11250000000000
      VALUE = SHARE_PRICE_FOR_STAGE[8] * SHARES_FOR_STAGE_TO_PURCHASE[8];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      let ongoingBernardFee_3 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_3.toString());
      assert.equal(0, ongoingBernardFee_3.cmp(new BN("11250000000000")), "wrong ongoingBernardFee_3");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      //  4
      //  112500000000 + 1125000000000 + 11250000000000 = 12487500000000 * 7000 / 10000 = 8741250000000
      let CORRECT_SUM = ongoingBernardFee_1.add(ongoingBernardFee_2).add(ongoingBernardFee_3).mul(await token.balanceOf(OWNER)).div(new BN("10000"));
      // console.log(CORRECT_SUM.toString());
      assert.equal(0, CORRECT_SUM.cmp(new BN("8741250000000")), "wrong CORRECT_SUM");

      let profit = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: OWNER
      });
      assert.equal(0, profit.cmp(CORRECT_SUM), "wrong profit");
    });
    
    it("should return correct sum if loopLimit is less, than tokenFractionProfitCalculatedTimes number after withdrawal", async() => {
      //  0 - 2500 * 10000000 + 5000 * 20000000 + 3125 * 40000000 = 250 000 000 000 * 0.55 = 137500000000
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      let ongoingBernardFee_0 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_0.toString());
      assert.equal(0, ongoingBernardFee_0.cmp(new BN("137500000000")), "wrong ongoingBernardFee_0");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      await madoffContract.withdrawProfit(10, {
        from: OWNER
      })



      //  1
      //  12500 * 80000000 * 0.05 = 50000000000
      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  10000 * 125000000 * 0.05 = 62500000000
      //  Total: 50000000000 + 62500000000 = 112500000000
      VALUE = SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      let ongoingBernardFee_1 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_1.toString());
      assert.equal(0, ongoingBernardFee_1.cmp(new BN("112500000000")), "wrong ongoingBernardFee_1");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      //  2
      //  62500 * 160000000 * 0.05 = 500000000000
      VALUE = SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  62500 * 200000000 * 0.05 = 625000000000
      //  Total: 500000000000 + 625000000000 = 1125000000000
      VALUE = SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      let ongoingBernardFee_2 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_2.toString());
      assert.equal(0, ongoingBernardFee_2.cmp(new BN("1125000000000")), "wrong ongoingBernardFee_2");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      //  3
      //  400000 * 250000000 * 0.05 = 5000000000000
      VALUE = SHARE_PRICE_FOR_STAGE[7] * SHARES_FOR_STAGE_TO_PURCHASE[7];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  390625 * 320000000 * 0.05 = 6250000000000
      //  Total: 5000000000000 + 6250000000000 = 11250000000000
      VALUE = SHARE_PRICE_FOR_STAGE[8] * SHARES_FOR_STAGE_TO_PURCHASE[8];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      let ongoingBernardFee_3 = await madoffContract.ongoingBernardFee.call();
      // console.log(ongoingBernardFee_3.toString());
      assert.equal(0, ongoingBernardFee_3.cmp(new BN("11250000000000")), "wrong ongoingBernardFee_3");

      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      //  4
      //  112500000000 + 1125000000000 = 1237500000000 * 7000 / 10000 = 866250000000
      let CORRECT_SUM = ongoingBernardFee_1.add(ongoingBernardFee_2).mul(await token.balanceOf(OWNER)).div(new BN("10000"));
      // console.log(CORRECT_SUM.toString());
      assert.equal(0, CORRECT_SUM.cmp(new BN("866250000000")), "wrong CORRECT_SUM");

      let profit = await madoffContract.pendingProfitInBernardCut.call(2, {
        from: OWNER
      });
      assert.equal(0, profit.cmp(CORRECT_SUM), "wrong profit");
    });
    
    it("should return 0 if no tokens for address", async() => {
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
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      let profit = await madoffContract.pendingProfitInBernardCut.call(10, {
        from: PURCHASER_0
      });
      assert.equal(0, profit.cmp(new BN("0")), "wrong profit");
    });
  });

  describe("withdrawProfit by user", () => {
    it("should fail if not token holder", async() => {
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
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      await expectRevert(madoffContract.withdrawProfit(10, {
        from: PURCHASER_0
      }), "Not token holder");
    });

    it("should fail if Nothing to withdraw", async() => {
      //  0
      await expectRevert(madoffContract.withdrawProfit(10, {
        from: OWNER
      }), "Nothing to withdraw");

      //  1
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

      madoffContract.withdrawProfit(10, {
        from: OWNER
      });

      //  2
      await expectRevert(madoffContract.withdrawProfit(10, {
        from: OWNER
      }), "Nothing to withdraw");
    });

    it("should update profitWithdrawnOnCalculationIdx for sender in multiple withdrawals", async() => {
      //  0 - 2500 * 10000000 + 5000 * 20000000 + 3125 * 40000000 = 250 000 000 000 * 0.55 = 137500000000
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(OWNER)).cmp(new BN("0")), "wrong profitWithdrawnOnCalculationIdx before 0");
      await madoffContract.withdrawProfit(10, {
        from: OWNER
      })
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(OWNER)).cmp(new BN("1")), "wrong profitWithdrawnOnCalculationIdx after 0");

      //  1
      //  12500 * 80000000 * 0.05 = 50000000000
      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  10000 * 125000000 * 0.05 = 62500000000
      //  Total: 50000000000 + 62500000000 = 112500000000
      VALUE = SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(OWNER)).cmp(new BN("1")), "wrong profitWithdrawnOnCalculationIdx before 1");
      await madoffContract.withdrawProfit(10, {
        from: OWNER
      })
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(OWNER)).cmp(new BN("2")), "wrong profitWithdrawnOnCalculationIdx after 1");

      //  2
      //  62500 * 160000000 * 0.05 = 500000000000
      VALUE = SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  62500 * 200000000 * 0.05 = 625000000000
      //  Total: 500000000000 + 625000000000 = 1125000000000
      VALUE = SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: DEPLOYER
      });
      
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(DEPLOYER)).cmp(new BN("0")), "wrong profitWithdrawnOnCalculationIdx before 2");
      await madoffContract.withdrawProfit(10, {
        from: DEPLOYER
      })
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(DEPLOYER)).cmp(new BN("3")), "wrong profitWithdrawnOnCalculationIdx after 2");

      //  3
      //  400000 * 250000000 * 0.05 = 5000000000000
      VALUE = SHARE_PRICE_FOR_STAGE[7] * SHARES_FOR_STAGE_TO_PURCHASE[7];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  390625 * 320000000 * 0.05 = 6250000000000
      //  Total: 5000000000000 + 6250000000000 = 11250000000000
      VALUE = SHARE_PRICE_FOR_STAGE[8] * SHARES_FOR_STAGE_TO_PURCHASE[8];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(OWNER)).cmp(new BN("2")), "wrong profitWithdrawnOnCalculationIdx before 3");
      await madoffContract.withdrawProfit(10, {
        from: OWNER
      })
      assert.equal(0, (await madoffContract.profitWithdrawnOnCalculationIdx.call(OWNER)).cmp(new BN("4")), "wrong profitWithdrawnOnCalculationIdx after 3");
    });

    it("should transfer correct amount", async() => {
      //  0 - 2500 * 10000000 + 5000 * 20000000 + 3125 * 40000000 = 250 000 000 000 * 0.55 = 137500000000
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      let OWNER_balance_before_1 = new BN(await web3.eth.getBalance(OWNER));
      // console.log("OWNER_balance_before_1: ", OWNER_balance_before_1.toString());
      let OWNER_profit_1 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });
      // console.log("OWNER_profit_1:         ", OWNER_profit_1.toString());
      let tx = await madoffContract.withdrawProfit(11, {
        from: OWNER
      })
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);
      // console.log("gasSpent:               ", gasSpent.toString());

      let OWNER_balance_after_1 = new BN(await web3.eth.getBalance(OWNER));
      // console.log("OWNER_balance_after_1:  ", OWNER_balance_after_1.toString());
      assert.equal(0, OWNER_balance_before_1.sub(gasSpent).add(OWNER_profit_1).cmp(OWNER_balance_after_1), "wrong OWNER balance after 0");


      //  1
      //  12500 * 80000000 * 0.05 = 50000000000
      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  10000 * 125000000 * 0.05 = 62500000000
      //  Total: 50000000000 + 62500000000 = 112500000000
      VALUE = SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      
      let OWNER_balance_before_2 = new BN(await web3.eth.getBalance(OWNER));
      let OWNER_profit_2 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });

      tx = await madoffContract.withdrawProfit(10, {
        from: OWNER
      })
      gasUsed = new BN(tx.receipt.gasUsed);
      txInfo = await web3.eth.getTransaction(tx.tx);
      gasPrice = new BN(txInfo.gasPrice);
      gasSpent = gasUsed.mul(gasPrice);

      let OWNER_balance_after_2 = new BN(await web3.eth.getBalance(OWNER));
      assert.equal(0, OWNER_balance_before_2.sub(gasSpent).add(OWNER_profit_2).cmp(OWNER_balance_after_2), "wrong OWNER balance after 1");


      //  2
      //  62500 * 160000000 * 0.05 = 500000000000
      VALUE = SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  62500 * 200000000 * 0.05 = 625000000000
      //  Total: 500000000000 + 625000000000 = 1125000000000
      VALUE = SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: DEPLOYER
      });

      let DEPLOYER_balance_before_1 = new BN(await web3.eth.getBalance(DEPLOYER));
      let DEPLOYER_profit_1 = await madoffContract.pendingProfitInBernardCut(11, {
        from: DEPLOYER
      });

      tx = await madoffContract.withdrawProfit(10, {
        from: DEPLOYER
      })

      gasUsed = new BN(tx.receipt.gasUsed);
      txInfo = await web3.eth.getTransaction(tx.tx);
      gasPrice = new BN(txInfo.gasPrice);
      gasSpent = gasUsed.mul(gasPrice);

      let DEPLOYER_balance_after_1 = new BN(await web3.eth.getBalance(DEPLOYER));
      assert.equal(0, DEPLOYER_balance_before_1.sub(gasSpent).add(DEPLOYER_profit_1).cmp(DEPLOYER_balance_after_1), "wrong DEPLOYER balance after 2");


      //  3
      //  400000 * 250000000 * 0.05 = 5000000000000
      VALUE = SHARE_PRICE_FOR_STAGE[7] * SHARES_FOR_STAGE_TO_PURCHASE[7];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  390625 * 320000000 * 0.05 = 6250000000000
      //  Total: 5000000000000 + 6250000000000 = 11250000000000
      VALUE = SHARE_PRICE_FOR_STAGE[8] * SHARES_FOR_STAGE_TO_PURCHASE[8];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      
      let OWNER_balance_before_3 = new BN(await web3.eth.getBalance(OWNER));
      let OWNER_profit_3 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });

      tx = await madoffContract.withdrawProfit(10, {
        from: OWNER
      })
      gasUsed = new BN(tx.receipt.gasUsed);
      txInfo = await web3.eth.getTransaction(tx.tx);
      gasPrice = new BN(txInfo.gasPrice);
      gasSpent = gasUsed.mul(gasPrice);

      let OWNER_balance_after_3 = new BN(await web3.eth.getBalance(OWNER));
      assert.equal(0, OWNER_balance_before_3.sub(gasSpent).add(OWNER_profit_3).cmp(OWNER_balance_after_3), "wrong OWNER balance after 3");
    });

    it("should emit BernardFeeWithdrawn", async() => {
      //  0 - 2500 * 10000000 + 5000 * 20000000 + 3125 * 40000000 = 250 000 000 000 * 0.55 = 137500000000
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });

      let OWNER_profit_0 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });
      assert.equal(0, OWNER_profit_0.cmp(new BN("96250000000")), "wrong OWNER_profit_0 on 0"); //  137500000000 * 0.7 = 96250000000

      let DEPLOYER_profit_0 = await madoffContract.pendingProfitInBernardCut(11, {
        from: DEPLOYER
      });
      assert.equal(0, DEPLOYER_profit_0.cmp(new BN("41250000000")), "wrong DEPLOYER_profit_0 on 0"); //  137500000000 * 0.3 = 41250000000
      let {logs} = await madoffContract.withdrawProfit(11, {
        from: OWNER
      })

      await expectEvent.inLogs(logs, 'BernardFeeWithdrawn', {
        by: OWNER,
        amount: OWNER_profit_0
      });
      assert.equal(0, logs[0].args.amount.cmp(OWNER_profit_0), "wrong BernardFeeWithdrawn amount");


      //  1
      //  12500 * 80000000 * 0.05 = 50000000000
      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  10000 * 125000000 * 0.05 = 62500000000
      //  Total: 50000000000 + 62500000000 = 112500000000
      VALUE = SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      
      let OWNER_profit_1 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });
      // console.log("OWNER_profit_1:             ", OWNER_profit_1.toString());
      assert.equal(0, OWNER_profit_1.cmp(new BN("78750000000")), "wrong OWNER_profit_1 on 1") //  112500000000 * 0.7 = 78750000000

      let DEPLOYER_profit_1 = await madoffContract.pendingProfitInBernardCut(11, {
        from: DEPLOYER
      });
      // console.log("DEPLOYER_profit_1:             ", DEPLOYER_profit_1.toString());
      assert.equal(0, DEPLOYER_profit_1.cmp(new BN("75000000000")), "wrong DEPLOYER_profit_1 on 1") //  112500000000 * 0.3 = 33750000000 + 41250000000 (DEPLOYER_profit_0) = 75000000000
     
      let tx_1 = await madoffContract.withdrawProfit(11, {
        from: OWNER
      });
      let logs_1 = tx_1.logs[0];
      // console.log(tx_1);
      // console.log(logs_1);

      assert.equal(logs_1.event, "BernardFeeWithdrawn", "wrong event name in 1");
      assert.equal(logs_1.args.by, OWNER, "wrong by arg in 1");
      assert.equal(0, logs_1.args.amount.cmp(OWNER_profit_1), "wrong amount arg in 1");


      //  2
      //  62500 * 160000000 * 0.05 = 500000000000
      VALUE = SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  62500 * 200000000 * 0.05 = 625000000000
      //  Total: 500000000000 + 625000000000 = 1125000000000
      VALUE = SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: DEPLOYER
      });

      let OWNER_profit_2 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });
      // console.log("OWNER_profit_2:             ", OWNER_profit_2.toString());
      assert.equal(0, OWNER_profit_2.cmp(new BN("787500000000")), "wrong OWNER_profit_2 on 2") //  1125000000000 * 0.7 = 787500000000

      let DEPLOYER_profit_2 = await madoffContract.pendingProfitInBernardCut(11, {
        from: DEPLOYER
      });
      // console.log("DEPLOYER_profit_2:             ", DEPLOYER_profit_2.toString());
      assert.equal(0, DEPLOYER_profit_2.cmp(new BN("412500000000")), "wrong DEPLOYER_profit_2 on 2")  //  1125000000000 * 0.3 = 337500000000 + 75000000000 (DEPLOYER_profit_1) = 412500000000
     
      let tx_2 = await madoffContract.withdrawProfit(11, {
        from: DEPLOYER
      });
      let logs_2 = tx_2.logs[0];
      // console.log(tx_2);
      // console.log(logs_2);

      assert.equal(logs_2.event, "BernardFeeWithdrawn", "wrong event name in 2");
      assert.equal(logs_2.args.by, DEPLOYER, "wrong by arg in 2");
      assert.equal(0, logs_2.args.amount.cmp(DEPLOYER_profit_2), "wrong amount arg in 2");


      //  3
      //  400000 * 250000000 * 0.05 = 5000000000000
      VALUE = SHARE_PRICE_FOR_STAGE[7] * SHARES_FOR_STAGE_TO_PURCHASE[7];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  390625 * 320000000 * 0.05 = 6250000000000
      //  Total: 5000000000000 + 6250000000000 = 11250000000000
      VALUE = SHARE_PRICE_FOR_STAGE[8] * SHARES_FOR_STAGE_TO_PURCHASE[8];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });
      
      for(let i = 0; i < 5; i ++) {
        await time.advanceBlock();
      }
      await madoffContract.calculateTokenFractionProfit({
        from: OWNER
      });
      
      let OWNER_profit_3 = await madoffContract.pendingProfitInBernardCut(11, {
        from: OWNER
      });
      // console.log("OWNER_profit_3:             ", OWNER_profit_3.toString());
      assert.equal(0, OWNER_profit_3.cmp(new BN("8662500000000")), "wrong OWNER_profit_3 on 3") //  11250000000000 * 0.7 = 7875000000000 + 787500000000 (OWNER_profit_2) = 8662500000000

      let DEPLOYER_profit_3 = await madoffContract.pendingProfitInBernardCut(11, {
        from: DEPLOYER
      });
      // console.log("DEPLOYER_profit_3:             ", DEPLOYER_profit_3.toString());
      assert.equal(0, DEPLOYER_profit_3.cmp(new BN("3375000000000")), "wrong DEPLOYER_profit_3 on 3")  //  11250000000000 * 0.3 = 3375000000000
     
      let tx_3 = await madoffContract.withdrawProfit(11, {
        from: OWNER
      });
      let logs_3 = tx_3.logs[0];
      // console.log(tx_3);
      // console.log(logs_3);

      assert.equal(logs_3.event, "BernardFeeWithdrawn", "wrong event name in 3");
      assert.equal(logs_3.args.by, OWNER, "wrong by arg in 2");
      assert.equal(0, logs_3.args.amount.cmp(OWNER_profit_3), "wrong amount arg in 3");
    });
  });

});