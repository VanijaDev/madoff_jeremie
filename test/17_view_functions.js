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

const { expect } = require('chai');
const assert = require('assert');

contract("sharesPurchased", (accounts) => {
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

  describe.only("view functions", () => {
    it("should update purchaseCountInSession", async() => {
      //  0
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("0")), "purchaseCountInSession should be 0 for S0 in 0");

      //  1
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("1")), "purchaseCountInSession should be 1 for S0 in 1");

      //  2
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 14;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S0 in 2");
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  3
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 4;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S0 in 3");
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(1)).cmp(new BN("1")), "purchaseCountInSession should be 1 for S1 in 3");

      //  4
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 41;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_1,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S0 in 4");
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(1)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S1 in 4");

      //  5
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 4;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 4;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 4;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S0 in 5");
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(1)).cmp(new BN("5")), "purchaseCountInSession should be 5 for S1 in 5");
      //  exceed
      for(let i = 0; i < 100; i ++) {
        await time.advanceBlock();
      }

      //  6
      VALUE = SHARE_PRICE_FOR_STAGE[0] * SHARES_FOR_STAGE_TO_PURCHASE[0] + SHARE_PRICE_FOR_STAGE[1] * SHARES_FOR_STAGE_TO_PURCHASE[1] + SHARE_PRICE_FOR_STAGE[2] * SHARES_FOR_STAGE_TO_PURCHASE[2];
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S0 in 6");
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(1)).cmp(new BN("5")), "purchaseCountInSession should be 5 for S1 in 6");
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(2)).cmp(new BN("1")), "purchaseCountInSession should be 1 for S2 in 6");

      //  7
      VALUE = SHARE_PRICE_FOR_STAGE[3] * SHARES_FOR_STAGE_TO_PURCHASE[3] + SHARE_PRICE_FOR_STAGE[4] * SHARES_FOR_STAGE_TO_PURCHASE[4] + SHARE_PRICE_FOR_STAGE[5] * 5;
      await madoffContract.purchase(WEBSITE_0, {
        from: PURCHASER_0,
        value: VALUE
      });

      assert.equal(0, (await madoffContract.purchaseCountInSession.call(0)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S0 in 7");
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(1)).cmp(new BN("5")), "purchaseCountInSession should be 5 for S1 in 7");
      assert.equal(0, (await madoffContract.purchaseCountInSession.call(2)).cmp(new BN("2")), "purchaseCountInSession should be 2 for S2 in 7");
    });

    it("should ", async() => {
      
    });

    it("should ", async() => {
      
    });

    it("should ", async() => {
      
    });
  });
});