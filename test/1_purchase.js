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

contract("purchase", (accounts) => {
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


  let token;
  let madoffContract;

  beforeEach("setup", async () => {
    await time.advanceBlock();

    token = await BernardsCutToken.new(OWNER);
    madoffContract = await MadoffContract.new(OWNER, token.address);
  });

  describe("Purchase", () => {
    it("should set latestPurchaseBlock to current block if first purchase", async() => {
      let latestPurchaseBlockBefore = await madoffContract.latestPurchaseBlock.call();
      assert.equal(0, (new BN(latestPurchaseBlockBefore.toString())).cmp(new BN("0")), "wrong latestPurchaseBlockBefore, should be 0 before first purchase");

      const VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      let latestPurchaseBlockAfter = await madoffContract.latestPurchaseBlock.call();
      assert.equal(0, (new BN(latestPurchaseBlockAfter.toString())).cmp(await time.latestBlock()), "wrong latestPurchaseBlockAfter, should be current block number");
    });

    it("should call ongoingStageDurationExceeded & emit GameRestarted event if ongoingStage > maxStageNumber", async() => {
      //  1 - buy all shares in all stages

      //  buy out S0
      let value = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("1")), "should be S1");

      //  buy out S1
      value = SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("2")), "should be S2");

      //  buy out S2
      value = SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("3")), "should be S3");

      //  buy out S3
      value = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("4")), "should be S4");

      //  buy out S4
      value = SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("5")), "should be S5");

      //  buy out S5
      value = SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("6")), "should be S6");

      //  buy out S6
      value = SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("7")), "should be S7");

      //  buy out S7
      value = SHARE_PRICE_FOR_STAGE[7] * SHARES_FOR_STAGE_TO_PURCHASE[7];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("8")), "should be S8");

      //  buy out S8
      value = SHARE_PRICE_FOR_STAGE[8] * SHARES_FOR_STAGE_TO_PURCHASE[8];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("9")), "should be S9");

      //  buy out S9
      value = SHARE_PRICE_FOR_STAGE[9] * SHARES_FOR_STAGE_TO_PURCHASE[9];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("10")), "should be S10");

      //  buy out S10
      value = SHARE_PRICE_FOR_STAGE[10] * SHARES_FOR_STAGE_TO_PURCHASE[10];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("11")), "should be S11");

      //  buy out S11
      value = SHARE_PRICE_FOR_STAGE[11] * SHARES_FOR_STAGE_TO_PURCHASE[11];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("12")), "should be S12");

      //  buy out S12
      value = SHARE_PRICE_FOR_STAGE[12] * SHARES_FOR_STAGE_TO_PURCHASE[12];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("13")), "should be S13");

      //  buy out S13
      value = SHARE_PRICE_FOR_STAGE[13] * SHARES_FOR_STAGE_TO_PURCHASE[13];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("14")), "should be S14");

      //  2 - should call ongoingStageDurationExceeded()

      value = SHARE_PRICE_FOR_STAGE[0];
      const {logs} = await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(2, logs.length, "should be 2 events");
      await expectEvent.inLogs(logs, 'GameRestarted');

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
    });

    it("should call ongoingStageDurationExceeded blocks for stage exceeded", async() => {
      //  buy out S0
      let value = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("1")), "should be S1");

      //  buy out S1
      value = SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("2")), "should be S2");

      //  exseed blocks for S2
      let exceedBlocks = BLOCKS_FOR_STAGE[2] + 1;
      for(let i = 0; i < exceedBlocks; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
    });

    it("should increase ongoingJackpot", async() => {
      const JACKPOT_PERCENT_PART = 0.4;

      //  1
      assert.equal(0, (await madoffContract.ongoingJackpot.call()).cmp(new BN("0")), "should be 0 before");

      let VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      let jpt_0 = new BN((10000000 * JACKPOT_PERCENT_PART).toString());
      assert.equal(0, (await madoffContract.ongoingJackpot.call()).cmp(jpt_0), "wrong jackpot after 0");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 5;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      let jpt_1 = new BN((10000000 * 5 * JACKPOT_PERCENT_PART).toString());
      assert.equal(0, (await madoffContract.ongoingJackpot.call()).cmp(jpt_0.add(jpt_1)), "wrong jackpot after 1");

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 11;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      let jpt_2 = new BN((10000000 * 11 * JACKPOT_PERCENT_PART).toString());
      assert.equal(0, (await madoffContract.ongoingJackpot.call()).cmp(jpt_0.add(jpt_1).add(jpt_2)), "wrong jackpot after 2");
    });

    it("should increase ongoingBernardFee", async() => {
      const BERNARD_FEE_PERCENT_PART = 0.05;
      const SHARE_PURCHASE_PERCENT_PURCHASED_SHARES = 0.5;

      //  1
      assert.equal(0, (await madoffContract.ongoingBernardFee.call()).cmp(new BN("0")), "should be 0 before");

      let VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let bernardFee_0 = new BN((10000000 * (parseFloat(BERNARD_FEE_PERCENT_PART) + parseFloat(SHARE_PURCHASE_PERCENT_PURCHASED_SHARES))));
      assert.equal(0, (await madoffContract.ongoingBernardFee.call()).cmp(bernardFee_0), "wrong bernardFee after 0");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 5;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let bernardFee_1 = new BN(10000000 * 5 * parseFloat(BERNARD_FEE_PERCENT_PART));
      assert.equal(0, (await madoffContract.ongoingBernardFee.call()).cmp(bernardFee_0.add(bernardFee_1)), "wrong bernardFee after 1");

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 11;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let bernardFee_2 = new BN(10000000 * 11 * parseFloat(BERNARD_FEE_PERCENT_PART));
      assert.equal(0, (await madoffContract.ongoingBernardFee.call()).cmp(bernardFee_0.add(bernardFee_1).add(bernardFee_2)), "wrong bernardFee after ");
    });

    it("should increase websiteFee if address != 0", async() => {
      const WEBSITE_FEE_PERCENT_PART = 0.05;

      //  1
      assert.equal(0, (await madoffContract.websiteFee.call(WEBSITE_1)).cmp(new BN("0")), "should be 0 before");

      let VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let websiteFee_0 = new BN((10000000 * parseFloat(WEBSITE_FEE_PERCENT_PART)));
      assert.equal(0, (await madoffContract.websiteFee.call(WEBSITE_1)).cmp(websiteFee_0), "wrong websiteFee after 0");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 5;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let websiteFee_1 = new BN((10000000 * 5 * parseFloat(WEBSITE_FEE_PERCENT_PART)));
      assert.equal(0, (await madoffContract.websiteFee.call(WEBSITE_1)).cmp(websiteFee_0.add(websiteFee_1)), "wrong websiteFee after 1");

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 11;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let websiteFee_2 = new BN((10000000 * 11 * parseFloat(WEBSITE_FEE_PERCENT_PART)));
      assert.equal(0, (await madoffContract.websiteFee.call(WEBSITE_1)).cmp(websiteFee_0.add(websiteFee_1).add(websiteFee_2)), "wrong websiteFee after 2");

      //  3
      assert.equal(0, (await madoffContract.websiteFee.call(WEBSITE_2)).cmp(new BN("0")), "should be 0 for WEBSITE_2 before");

      VALUE = SHARE_PRICE_FOR_STAGE[0] * 6;
      await madoffContract.purchase(WEBSITE_2, {
        from: PURCHASER_1,
        value: VALUE
      });

      let websiteFee_3 = new BN((10000000 * 6 * parseFloat(WEBSITE_FEE_PERCENT_PART)));
      assert.equal(0, (await madoffContract.websiteFee.call(WEBSITE_1)).cmp(websiteFee_0.add(websiteFee_1).add(websiteFee_2)), "wrong websiteFee after 3");
      assert.equal(0, (await madoffContract.websiteFee.call(WEBSITE_2)).cmp(websiteFee_3), "wrong websiteFee after 3");
    });

    it("should increase ongoingBernardFee if website address == 0", async() => {
      const BERNARD_FEE_PERCENT_PART = 0.05;
      const WEBSITE_FEE_PERCENT_PART = 0.05;
      const SHARE_PURCHASE_PERCENT_PURCHASED_SHARES = 0.5;

      //  1
      assert.equal(0, (await madoffContract.ongoingBernardFee.call()).cmp(new BN("0")), "should be 0 before");

      let VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      let bernardFee_0 = new BN((10000000 * (parseFloat(BERNARD_FEE_PERCENT_PART) + parseFloat(WEBSITE_FEE_PERCENT_PART) + parseFloat(SHARE_PURCHASE_PERCENT_PURCHASED_SHARES))));
      assert.equal(0, (await madoffContract.ongoingBernardFee.call()).cmp(bernardFee_0), "wrong bernardFee after 0");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 5;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      let bernardFee_1 = new BN(10000000 * 5 * (parseFloat(BERNARD_FEE_PERCENT_PART) + parseFloat(WEBSITE_FEE_PERCENT_PART)));
      assert.equal(0, (await madoffContract.ongoingBernardFee.call()).cmp(bernardFee_0.add(bernardFee_1)), "wrong bernardFee after 1");

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 11;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      let bernardFee_2 = new BN(10000000 * 11 * (parseFloat(BERNARD_FEE_PERCENT_PART) + parseFloat(WEBSITE_FEE_PERCENT_PART)));
      assert.equal(0, (await madoffContract.ongoingBernardFee.call()).cmp(bernardFee_0.add(bernardFee_1).add(bernardFee_2)), "wrong bernardFee after ");
    });

    it("should fail if 0 shares", async() => {
      //  1
      await expectRevert(madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: 0
      }), "Min 1 share");
    });

    it("should add partPreviousShares to ongoingBernardFee if first purchase in Session", async() => {
      const BERNARD_FEE_PERCENT_PART = 0.05;
      const WEBSITE_FEE_PERCENT_PART = 0.05;
      const SHARE_PURCHASE_PERCENT_PURCHASED_SHARES = 0.5;

      //  1 - S0
      assert.equal(0, (await madoffContract.ongoingBernardFee.call()).cmp(new BN("0")), "should be 0 before");

      let VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let bernardFee_correct = new BN((10000000 * (parseFloat(BERNARD_FEE_PERCENT_PART) + parseFloat(SHARE_PURCHASE_PERCENT_PURCHASED_SHARES))));
      assert.equal(0, (await madoffContract.ongoingBernardFee.call()).cmp(bernardFee_correct), "wrong bernardFee after 0");

      //  buy out S0
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 2499;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  2 - S1
      VALUE = SHARE_PRICE_FOR_STAGE[1];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      //  exseed blocks
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  3 - S0
      let bernardFeeBeforeS1 = await madoffContract.ongoingBernardFee.call();

      VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingBernardFee.call()).sub(bernardFeeBeforeS1).cmp(bernardFee_correct), "wrong bernardFee after 1");

    });

    it("should call sharesPurchased", async() => {
      let purchasesBefore = await madoffContract.purchaseCountInSession.call(0);

      let VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let purchasesAfter = await madoffContract.purchaseCountInSession.call(0);
      assert.equal(0, purchasesAfter.sub(purchasesBefore).cmp(new BN("1")), "should be 1 purchase");
    });

    it("should update latestPurchaseBlock", async() => {
      let blockBefore = await madoffContract.latestPurchaseBlock.call();

      let VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      let blockAfter = await madoffContract.latestPurchaseBlock.call();
      assert.equal(1, blockAfter.cmp(blockBefore), "should be increased");
    });

    it("should update ongoingWinner", async() => {
      let winner = await madoffContract.ongoingWinner.call();

      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      winner = await madoffContract.ongoingWinner.call();
      assert.equal(winner, PURCHASER_0, "wrong winner after 0");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      winner = await madoffContract.ongoingWinner.call();
      assert.equal(winner, PURCHASER_1, "wrong winner after 1");
    });

    it("should update Purchase event", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 11;
      const {logs} = await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      await expectEvent.inLogs(logs, 'Purchase', {
        from: PURCHASER_0,
        sharesNumber: new BN("11")
      });
    });
  });

});
