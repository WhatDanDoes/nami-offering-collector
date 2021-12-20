const puppeteer = require('puppeteer');
//const dappeteer = require('dappeteer');
const app = require('../../app');

describe('landing page', () => {

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

  const URL = 'http://localhost:3000';

  let browser, page;

  describe('nami not installed', () => {

    beforeEach(async () => {
      browser = await puppeteer.launch(/* { dumpio: true, } */);
      page = await browser.newPage();
      await page.goto(URL);
    });

    afterEach(async () => {
      await browser.close();
    });

    it('displays the configured app title', async () => {
      expect(process.env.TITLE).toBeDefined();
      const el = await page.$('title');
      const title = await el.evaluate(e => e.textContent);
      expect(title).toEqual(process.env.TITLE);
    });

    it('displays a warning in the navbar', async () => {
      const el = await page.$('header #connect-nami');

      let warning = await el.evaluate(e => e.textContent);
      expect(warning).toEqual('');

      await page.click('#introduction-form-top .connect-nami-button');

      warning = await el.evaluate(e => e.textContent);
      expect(warning).toEqual('Install the Nami↗ browser plugin');
    });

    it('does not display a .messages element', async () => {
      let messages = await page.evaluate(() => {
        return document.querySelector(".messages")
      });

      expect(messages).toBe(null);
    });
  });


// 2021-9-23 Going to leave this here for awhile.
// Dappeteer seems like a better tool than Synpress, if it's ever updated...
//
//  describe('metamask installed', () => {
//    let metamask;
//
//    beforeEach(async () => {
//
//      browser = await dappeteer.launch(puppeteer)
//      metamask = await dappeteer.getMetamask(browser)
//
//      await metamask.createAccount();
//      metamask.addNetwork('127.0.0.1:8545');
//      await metamask.switchNetwork('localhost');
//
//      //browser = await puppeteer.launch();
//      page = await browser.newPage();
//      await page.goto(URL);
//    });
//
//    afterEach(async () => {
//      await browser.close();
//    });
//
//    it('displays a message to authenticate with metamask', async () => {
//      const el = await page.$('header nav ul li');
//      const warning = await el.evaluate(e => e.textContent);
//      expect(warning).toEqual('Authenticate with getMetamask');
//    });
//  });
});
