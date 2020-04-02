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

contract("getSharesAndUpdateOngoingStageInfo", (accounts) => {
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

  describe("correct share number", () => {
    it("should return correct share number for purchase", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(0,0))[1].cmp(new BN("10")), "wrong share number");
    });

    it("should return correct share number for 3 purchases within single stage", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(0, 0))[1].cmp(new BN("10")), "wrong share number, should be 10");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 11;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(1, 0))[1].cmp(new BN("11")), "wrong share number, should be 11");

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(2, 0))[1].cmp(new BN("15")), "wrong share number, should be 15");
    });

    it("should return correct share number for 3 purchases for S0, S0, S1", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(0, 0))[1].cmp(new BN("10")), "wrong share number, should be 10");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 2490;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(1, 0))[1].cmp(new BN("2490")), "wrong share number, should be 2490");

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[1] * 2;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(2, 0))[1].cmp(new BN("2")), "wrong share number, should be 2");
    });

    it("should return correct share number for 3 purchases for S0, S1, S2", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 2500;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(0, 0))[1].cmp(new BN("2500")), "wrong share number, should be 2500");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[1] * 5000;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(1, 0))[1].cmp(new BN("5000")), "wrong share number, should be 5000");

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[2] * 3125;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(2, 0))[1].cmp(new BN("3125")), "wrong share number, should be 3125");
    });

    it("should return correct share number for 3 purchases for S0 + S1, S2, 10 shares of S3", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(0, 0))[1].cmp(new BN("7500")), "wrong share number, should be 7500");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(1, 0))[1].cmp(new BN("3125")), "wrong share number, should be 3125");

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[3] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(2, 0))[1].cmp(new BN("10")), "wrong share number, should be 10");
    });

    it("should return correct share number for 5 purchases for S0, S1, S2+S3, S4, S4, S4+S5", async() => {
      // buy out  S0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(0, 0))[1].cmp(new BN("2500")), "wrong share number, should be 2500");

      //  buy out S1
      VALUE = SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(1, 0))[1].cmp(new BN("5000")), "wrong share number, should be 5000");

      //  S2+S3
      VALUE = SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(2, 0))[1].cmp(new BN("15625")), "wrong share number, should be 15625");

      //  S4
      VALUE = SHARE_PRICE_FOR_STAGE[4] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(3, 0))[1].cmp(new BN("20")), "wrong share number, should be 20");

      //  S4
      VALUE = SHARE_PRICE_FOR_STAGE[4] * 9900;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(4, 0))[1].cmp(new BN("9900")), "wrong share number, should be 9900");

      //  S4+S5
      VALUE = SHARE_PRICE_FOR_STAGE[4] * 80 + SHARE_PRICE_FOR_STAGE[5] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseInfoInSession.call(5, 0))[1].cmp(new BN("95")), "wrong share number, should be 95");
    });
  });

  describe("correct ongoingStage", () => {
    it("should set ongoingStage to 0", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "wrong ongoingStage, should be 0");
    });

    it("should set ongoingStage to 0", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "wrong ongoingStage, should be 0");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 11;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "wrong ongoingStage, should be 0 after 1");

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "wrong ongoingStage, should be 0 after 2");
    });

    it("should set ongoingStage to 0, 1, 1", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("0")), "wrong ongoingStage, should be 0");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 2490;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("1")), "wrong ongoingStage, should be 1");

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[1] * 2;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("1")), "wrong ongoingStage, should be 1 after 2");
    });

    it("should set ongoingStage to 1, 2, 3", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 2500;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("1")), "wrong ongoingStage, should be 1");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[1] * 5000;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("2")), "wrong ongoingStage, should be 2");

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[2] * 3125;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("3")), "wrong ongoingStage, should be 3");
    });

    it("should set ongoingStage to 2, 3, 3", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("2")), "wrong ongoingStage, should be 2");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("3")), "wrong ongoingStage, should be 3");

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[3] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("3")), "wrong ongoingStage, should be 3 after 2");
    });

    it("should set ongoingStage to 1, 2, 4, ", async() => {
      // buy out  S0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("1")), "wrong ongoingStage, should be 1");

      //  buy out S1
      VALUE = SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("2")), "wrong ongoingStage, should be 2");

      //  S2+S3
      VALUE = SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("4")), "wrong ongoingStage, should be 4");

      //  S4
      VALUE = SHARE_PRICE_FOR_STAGE[4] * 20;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("4")), "wrong ongoingStage, should be 4 after S4_1");

      //  S4
      VALUE = SHARE_PRICE_FOR_STAGE[4] * 9900;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("4")), "wrong ongoingStage, should be 4 after S4_2");

      //  S4+S5
      VALUE = SHARE_PRICE_FOR_STAGE[4] * 80 + SHARE_PRICE_FOR_STAGE[5] * 15;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.ongoingStage.call()).cmp(new BN("5")), "wrong ongoingStage, should be 5");
    });
  });

  describe("ERROR: Wrong value sent", () => {
    it("should revert on S0", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10 + 1;
      await expectRevert(madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      }), "Wrong value sent");
    });

    it("should revert on S1+S2", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] +
                  SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + 1;
      await expectRevert(madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      }), "Wrong value sent");
    });

    it("should revert on S3", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] +
                  SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] + 1;
      await expectRevert(madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      }), "Wrong value sent");
    });

    it("should revert on S3+S4", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] +
                  SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] +
                  SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4] + 1;
      await expectRevert(madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      }), "Wrong value sent");
    });

    it("should revert on S5", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] +
                  SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] +
                  SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4] + SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5] + 1;
      await expectRevert(madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      }), "Wrong value sent");
    });

    it("should revert on S5+S6", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] +
                  SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] +
                  SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4] + SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5] +
                  SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6] + 1;
      await expectRevert(madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      }), "Wrong value sent");
    });

    it("should revert on S7", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] +
                  SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] +
                  SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4] + SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5] +
                  SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6] + SHARE_PRICE_FOR_STAGE[7] * SHARES_FOR_STAGE_TO_PURCHASE[7] + 1;
      await expectRevert(madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      }), "Wrong value sent");
    });

    it("should revert on S8", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] +
                  SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] +
                  SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4] + SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5] +
                  SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6] + SHARE_PRICE_FOR_STAGE[7] * SHARES_FOR_STAGE_TO_PURCHASE[7] + 
                  SHARE_PRICE_FOR_STAGE[8];
      madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[8] + 1;
      await expectRevert(madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      }), "Wrong value sent");
    });

    it("should revert on S9", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] +
                  SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] +
                  SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4] + SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5] +
                  SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6] + SHARE_PRICE_FOR_STAGE[7] * SHARES_FOR_STAGE_TO_PURCHASE[7] + 
                  SHARE_PRICE_FOR_STAGE[8] * SHARES_FOR_STAGE_TO_PURCHASE[8] + SHARE_PRICE_FOR_STAGE[9] * SHARES_FOR_STAGE_TO_PURCHASE[9] + 1;
      await expectRevert(madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      }), "Wrong value sent");
    });

    it("should revert on S10+S11", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] +
                  SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] +
                  SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4] + SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5] +
                  SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6] + SHARE_PRICE_FOR_STAGE[7] * SHARES_FOR_STAGE_TO_PURCHASE[7] + 
                  SHARE_PRICE_FOR_STAGE[8] * SHARES_FOR_STAGE_TO_PURCHASE[8] + SHARE_PRICE_FOR_STAGE[9] * SHARES_FOR_STAGE_TO_PURCHASE[9];
      madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[10] * SHARES_FOR_STAGE_TO_PURCHASE[10] + SHARE_PRICE_FOR_STAGE[11] * 12 + 1;
      await expectRevert(madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      }), "Wrong value sent");
    });

    it("should revert on S12", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] +
                  SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] +
                  SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4] + SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5] +
                  SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6] + SHARE_PRICE_FOR_STAGE[7] * SHARES_FOR_STAGE_TO_PURCHASE[7] + 
                  SHARE_PRICE_FOR_STAGE[8] * SHARES_FOR_STAGE_TO_PURCHASE[8] + SHARE_PRICE_FOR_STAGE[9] * SHARES_FOR_STAGE_TO_PURCHASE[9] +
                  SHARE_PRICE_FOR_STAGE[10] * SHARES_FOR_STAGE_TO_PURCHASE[10] + SHARE_PRICE_FOR_STAGE[11] * SHARES_FOR_STAGE_TO_PURCHASE[11] +
                  SHARE_PRICE_FOR_STAGE[12];
      madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[12] + 1;
      await expectRevert(madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      }), "Wrong value sent");
    });

    it("should revert on S12+S13", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] +
                  SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] +
                  SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4] + SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5] +
                  SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6] + SHARE_PRICE_FOR_STAGE[7] * SHARES_FOR_STAGE_TO_PURCHASE[7] + 
                  SHARE_PRICE_FOR_STAGE[8] * SHARES_FOR_STAGE_TO_PURCHASE[8] + SHARE_PRICE_FOR_STAGE[9] * SHARES_FOR_STAGE_TO_PURCHASE[9] +
                  SHARE_PRICE_FOR_STAGE[10] * SHARES_FOR_STAGE_TO_PURCHASE[10] + SHARE_PRICE_FOR_STAGE[11] * SHARES_FOR_STAGE_TO_PURCHASE[11] +
                  SHARE_PRICE_FOR_STAGE[12];
      madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[12] * 12499999 + SHARE_PRICE_FOR_STAGE[13] + 11;
      await expectRevert(madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      }), "Wrong value sent");
    });

    it("should revert on S13 + overflow", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] +
                  SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2] + SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] +
                  SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4] + SHARE_PRICE_FOR_STAGE[5] * SHARES_FOR_STAGE_TO_PURCHASE[5] +
                  SHARE_PRICE_FOR_STAGE[6] * SHARES_FOR_STAGE_TO_PURCHASE[6] + SHARE_PRICE_FOR_STAGE[7] * SHARES_FOR_STAGE_TO_PURCHASE[7] + 
                  SHARE_PRICE_FOR_STAGE[8] * SHARES_FOR_STAGE_TO_PURCHASE[8] + SHARE_PRICE_FOR_STAGE[9] * SHARES_FOR_STAGE_TO_PURCHASE[9] +
                  SHARE_PRICE_FOR_STAGE[10] * SHARES_FOR_STAGE_TO_PURCHASE[10] + SHARE_PRICE_FOR_STAGE[11] * SHARES_FOR_STAGE_TO_PURCHASE[11] +
                  SHARE_PRICE_FOR_STAGE[12] * SHARES_FOR_STAGE_TO_PURCHASE[12] + SHARE_PRICE_FOR_STAGE[13] * 24999999;
      madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      VALUE = SHARE_PRICE_FOR_STAGE[13] * 2;
      await expectRevert(madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      }), "Stage overflow");
    });
  });

});