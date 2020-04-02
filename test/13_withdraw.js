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

contract("withdraw", (accounts) => {
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
  });

  describe("withdrawWebsiteFee", () => {
    it("should revert with error: No fee if nothing to withdraw", async() => {
      await expectRevert(madoffContract.withdrawWebsiteFee({
        from: WEBSITE_1
      }), "No fee");
    });

    it("should delete websiteFee after withdrawal", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(1, (await madoffContract.websiteFee.call(WEBSITE_1)).cmp(new BN("0")), "wrong websiteFee");

      await madoffContract.withdrawWebsiteFee({
        from: WEBSITE_1
      });

      assert.equal(0, (await madoffContract.websiteFee.call(WEBSITE_1)).cmp(new BN("0")), "wrong websiteFee, should be 0");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 50;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      assert.equal(1, (await madoffContract.websiteFee.call(WEBSITE_1)).cmp(new BN("0")), "wrong websiteFee on 1");

      await madoffContract.withdrawWebsiteFee({
        from: WEBSITE_1
      });

      assert.equal(0, (await madoffContract.websiteFee.call(WEBSITE_1)).cmp(new BN("0")), "wrong websiteFee, should be 0 on 1");
    });

    it("should transfer corret amount", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      const CORRECT_FEE = SHARE_PRICE_FOR_STAGE[0] * 10 * SHARE_PURCHASE_PERCENT_BERNARD_WEBSITE / 100;
      await time.increase(2);
      const BALANCE_BEFORE = new BN(await web3.eth.getBalance(WEBSITE_1));

      let tx = await madoffContract.withdrawWebsiteFee({
        from: WEBSITE_1
      });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      const BALANCE_AFTER = new BN(await web3.eth.getBalance(WEBSITE_1));

      assert.equal(0, BALANCE_BEFORE.sub(gasSpent).add(new BN(CORRECT_FEE.toString())).cmp(BALANCE_AFTER), "wrong fee transferred");
    });

    it("should emit WebsiteFeeWithdrawn", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });
      const CORRECT_FEE = SHARE_PRICE_FOR_STAGE[0] * 10 * SHARE_PURCHASE_PERCENT_BERNARD_WEBSITE / 100;
      await time.increase(2);

      const {logs} = await madoffContract.withdrawWebsiteFee({
        from: WEBSITE_1
      });
      await expectEvent.inLogs(logs, 'WebsiteFeeWithdrawn', {
        to: WEBSITE_1,
        amount: new BN(CORRECT_FEE)
      });
    });
  });

  describe("withdrawJackpot", () => {
    it("should revert with error: No jackpot if nothing to withdraw", async() => {
      await expectRevert(madoffContract.withdrawJackpot({
        from: PURCHASER_0
      }), "No jackpot");
    });

    it("should delete jackpotForAddr after withdrawal", async() => {
      //  0
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }
      await time.increase(2);

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(1, (await madoffContract.jackpotForAddr.call(PURCHASER_0)).cmp(new BN("0")), "wrong jackpotForAddr");
      
      await madoffContract.withdrawJackpot({
        from: PURCHASER_0
      });

      assert.equal(0, (await madoffContract.jackpotForAddr.call(PURCHASER_0)).cmp(new BN("0")), "wrong jackpotForAddr, should be 0");

      //  1
      VALUE = SHARE_PRICE_FOR_STAGE[0] * 5;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }
      await time.increase(2);

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      assert.equal(1, (await madoffContract.jackpotForAddr.call(PURCHASER_0)).cmp(new BN("0")), "wrong jackpotForAddr on 1");
      
      await madoffContract.withdrawJackpot({
        from: PURCHASER_0
      });

      assert.equal(0, (await madoffContract.jackpotForAddr.call(PURCHASER_0)).cmp(new BN("0")), "wrong jackpotForAddr, should be 0 on 1");
    });

    it("should transfer correct amount", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }
      await time.increase(2);
      const BALANCE_BEFORE = new BN(await web3.eth.getBalance(PURCHASER_0));

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      const CORRECT_JPT = await madoffContract.jackpotForAddr.call(PURCHASER_0);
      
      let tx = await madoffContract.withdrawJackpot({
        from: PURCHASER_0
      });

      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      const BALANCE_AFTER = new BN(await web3.eth.getBalance(PURCHASER_0));

      assert.equal(0, BALANCE_BEFORE.sub(gasSpent).add(new BN(CORRECT_JPT.toString())).cmp(BALANCE_AFTER), "wrong jackpot transferred");
    });

    it("should emit JackpotWithdrawn", async() => {
      let VALUE = SHARE_PRICE_FOR_STAGE[0] * 10;
      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_0,
        value: VALUE
      });

      //  exseed blocks
      for(let i = 0; i < EXCEED_BLOCKS; i ++) {
        await time.advanceBlock();
      }
      await time.increase(2);

      await madoffContract.purchase(WEBSITE_1, {
        from: PURCHASER_1,
        value: VALUE
      });

      const CORRECT_JPT = await madoffContract.jackpotForAddr.call(PURCHASER_0);
      
      const {logs} = await madoffContract.withdrawJackpot({
        from: PURCHASER_0
      });

      await expectEvent.inLogs(logs, 'JackpotWithdrawn', {
        to: PURCHASER_0,
        amount: new BN(CORRECT_JPT)
      });
    });
  });
});