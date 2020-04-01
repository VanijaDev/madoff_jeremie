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

contract("OngoingStageDurationExceeded", (accounts) => {
  const OWNER = accounts[0];
  const DEPLOYER = accounts[1];
  const WEBSITE_0 = "0x0000000000000000000000000000000000000000";
  const WEBSITE_1 = accounts[2];
  const WEBSITE_2 = accounts[3];
  const PURCHASER_0 = accounts[4];
  const PURCHASER_1 = accounts[5];

  const BLOCKS_FOR_STAGE =                      [100,       90,       80,       70,       60,         50,         45,         40,         35,         30,         25,         20,         10,         5];
  const SHARES_FOR_STAGE_TO_PURCHASE =          [2500,      5000,     3125,     12500,    10000,      62500,      62500,      400000,     390625,     2000000,    562500,     10000000,   12500000,   25000000];
  const SHARES_FOR_STAGE_TO_PURCHASE_ORIGINAL = [2500,      5000,     3125,     12500,    10000,      62500,      62500,      400000,     390625,     2000000,    562500,     10000000,   12500000,   25000000];
  const SHARE_PRICE_FOR_STAGE =                 [10000000,  20000000, 40000000, 80000000, 125000000,  160000000,  200000000,  250000000,  320000000,  500000000,  800000000,  1000000000, 1000000000, 1000000000];
  const EXCEED_BLOCKS =                         111;


  let token;
  let madoffContract;

  beforeEach("setup", async () => {
    await time.advanceBlock();

    token = await BernardsCutToken.new(OWNER);
    madoffContract = await MadoffContract.new(OWNER, token.address);
  });

  describe("Exceed each stage", () => {
    it("should reset after S0 exceed", async() => {
      //  S0
      let value = SHARE_PRICE_FOR_STAGE[0] * 11;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0");

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2499")), "should be 2499 after reset");
    });

    it("should reset after S1 exceed", async() => {
      //  buy out S0
      let value = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("1")), "should be S1");

      //  S1
      value = SHARE_PRICE_FOR_STAGE[1] * 11;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });
      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("1")), "should be S1");

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2499")), "should be 2499 after reset");
    });

    it("should reset after S2 exceed", async() => {
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

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2499")), "should be 2499 after reset");
    });

    it("should reset after S3 exceed", async() => {
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

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2499")), "should be 2499 after reset");
    });

    it("should reset after S4 exceed", async() => {
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

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2499")), "should be 2499 after reset");
    });

    it("should reset after S5 exceed", async() => {
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

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2499")), "should be 2499 after reset");
    });

    it("should reset after S6 exceed", async() => {
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

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2499")), "should be 2499 after reset");
    });

    it("should reset after S7 exceed", async() => {
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

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2499")), "should be 2499 after reset");
    });

    it("should reset after S8 exceed", async() => {
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

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2499")), "should be 2499 after reset");
    });

    it("should reset after S9 exceed", async() => {
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

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2499")), "should be 2499 after reset");
    });

    it("should reset after S10 exceed", async() => {
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

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2499")), "should be 2499 after reset");
    });

    it("should reset after S11 exceed", async() => {
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

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2499")), "should be 2499 after reset");
    });

    it("should reset after S12 exceed", async() => {
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

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2499")), "should be 2499 after reset");
    });

    it("should reset after S13 exceed", async() => {
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

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }

      value = SHARE_PRICE_FOR_STAGE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: value
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "should be S0 after reset");
      assert.equal(0, (await madoffContract.sharesForStageToPurchase.call(0)).cmp(new BN("2499")), "should be 2499 after reset");
    });
  });
});