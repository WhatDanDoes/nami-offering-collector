require('dotenv-flow').config();

describe('landing page', () => {

  const URL = 'http://localhost:3000';

//  let browser, page;

//  describe('metamask not installed', () => {
//
//    beforeEach(async () => {
//      browser = await puppeteer.launch();
//      page = await browser.newPage();
//      await page.goto(URL);
//    });
//
//    afterEach(async () => {
//      await browser.close();
//    });
//
//    it('displays the configured app title', async () => {
//      expect(process.env.TITLE).toBeDefined();
//      const el = await page.$('title');
//      const title = await el.evaluate(e => e.textContent);
//      expect(title).toEqual(process.env.TITLE);
//    });
//
//    it('displays a warning in the navbar', async () => {
//      const el = await page.$('header nav ul li');
//      const warning = await el.evaluate(e => e.textContent);
//      expect(warning).toEqual('Install the Metamask browser plugin');
//    });
//  });

  context('metamask installed', () => {
//    let metamask;
//
    beforeEach(() => {
      cy.visit('/');

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
    });

//    afterEach(async () => {
//      await browser.close();
//    });
//
    it('displays a message to authenticate with metamask', async () => {
      cy.get('header nav ul li').contains('Authenticate with Metamask');

//      const el = await page.$('header nav ul li');
//      const warning = await el.evaluate(e => e.textContent);
//      expect(warning).toEqual('Authenticate with Metamask');
    });
  });
});
