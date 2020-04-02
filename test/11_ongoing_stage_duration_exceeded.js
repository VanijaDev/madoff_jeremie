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

contract("ongoingStageDurationExceeded", (accounts) => {
  const OWNER = accounts[0];
  const DEPLOYER = accounts[1];
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
  });

  describe("ongoingStageDurationExceeded", () => {
    it("should delete ongoingJackpot", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      let jpt_0 = await madoffContract.ongoingJackpot.call();
      let jpt_0_correct = 10000000 * 10 * SHARE_PURCHASE_PERCENT_JACKPOT / 100;
      assert.equal(0, jpt_0.cmp(new BN(jpt_0_correct)), "wrong jpt on 0");

      //  exseed blocks
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      let jpt_1 = await madoffContract.ongoingJackpot.call();
      let jpt_1_correct = 10000000 * 20 * SHARE_PURCHASE_PERCENT_JACKPOT / 100;
      assert.equal(0, jpt_1.cmp(new BN(jpt_1_correct)), "wrong jpt on 1");
    });

    it("should set jackpotForAddr for last purchaser if 1 purchaser", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      let jpt = await madoffContract.ongoingJackpot.call();

      //  exseed blocks
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  2
      let jptPart = jpt.mul(new BN(JACKPOT_PERCENT_WINNER.toString())).div(new BN("100"));
      assert.equal(0, (await madoffContract.jackpotForAddr.call(PURCHASER_0)).cmp(jptPart), "wrong jackpotForAddr");
    });

    it("should set jackpotForAddr for last purchaser if 1 purchaser has made 2 purchases", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      let jpt = await madoffContract.ongoingJackpot.call();
      let jpt_correct = 10000000 * 30 * SHARE_PURCHASE_PERCENT_JACKPOT / 100;
      assert.equal(0, jpt.cmp(new BN(jpt_correct.toString())), "wrong jpt");

      //  exseed blocks
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  2
      let jptPart = jpt.mul(new BN(JACKPOT_PERCENT_WINNER.toString())).div(new BN("100"));
      assert.equal(0, (await madoffContract.jackpotForAddr.call(PURCHASER_0)).cmp(jptPart), "wrong jackpotForAddr");
    });

    it("should set jackpotForAddr for last purchaser if 2 purchasers", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      let jpt = await madoffContract.ongoingJackpot.call();
      let jpt_correct = 10000000 * 30 * SHARE_PURCHASE_PERCENT_JACKPOT / 100;
      assert.equal(0, jpt.cmp(new BN(jpt_correct.toString())), "wrong jpt");

      //  exseed blocks
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  2
      let jptPart = jpt.mul(new BN(JACKPOT_PERCENT_WINNER.toString())).div(new BN("100"));
      assert.equal(0, (await madoffContract.jackpotForAddr.call(PURCHASER_1)).cmp(jptPart), "wrong jackpotForAddr");
    });

    it("should set jackpotForAddr for last purchaser if 2 purchasers in diff Stages", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[1] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      let jpt = await madoffContract.ongoingJackpot.call();
      let jpt_correct = ((10000000 * SHARES_FOR_STAGE_TO_PURCHASE[0] + 20000000 * 20) * SHARE_PURCHASE_PERCENT_JACKPOT / 100);
      assert.equal(0, jpt.cmp(new BN(jpt_correct.toString())), "wrong jpt");

      //  exseed blocks
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  2
      let jptPart = jpt.mul(new BN(JACKPOT_PERCENT_WINNER.toString())).div(new BN("100"));
      assert.equal(0, (await madoffContract.jackpotForAddr.call(PURCHASER_1)).cmp(jptPart), "wrong jackpotForAddr");
    });

    it("should set jackpotForAddr for last purchaser if 2 purchasers in diff Session", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      let jpt = await madoffContract.ongoingJackpot.call();
      let jpt_correct = 10000000 * 10 * SHARE_PURCHASE_PERCENT_JACKPOT / 100;
      assert.equal(0, jpt.cmp(new BN(jpt_correct.toString())), "wrong jpt on 0");

      //  exseed blocks
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      jpt = await madoffContract.ongoingJackpot.call();
      jpt_correct = 10000000 * 20 * SHARE_PURCHASE_PERCENT_JACKPOT / 100;
      assert.equal(0, jpt.cmp(new BN(jpt_correct.toString())), "wrong jpt on 1");

      //  exseed blocks
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      jptPart = jpt.mul(new BN(JACKPOT_PERCENT_WINNER.toString())).div(new BN("100"));
      assert.equal(0, (await madoffContract.jackpotForAddr.call(PURCHASER_1)).cmp(jptPart), "wrong jackpotForAddr on 1");
    });

    it("should call countdownWasReset", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.ongoingSessionIdx.call()).cmp(new BN("0")), "ongoingSessionIdx should be 0");

      //  exseed blocks
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  1
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.ongoingSessionIdx.call()).cmp(new BN("1")), "ongoingSessionIdx should be 1");

      //  exseed blocks
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  2
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.ongoingSessionIdx.call()).cmp(new BN("2")), "ongoingSessionIdx should be 2");
    });

    it("should reset sharesForStageToPurchase to default", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2490")), "should be 2490");

      //  exseed blocks
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 5;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2495")), "should be 2495");

      //  exseed blocks
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2485")), "should be 2485");
    });

    it("should reset ongoingStage to 0", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("2")), "should be 2");

      //  exseed blocks
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 5;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be 0");
    });
  });

});