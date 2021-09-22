const puppeteer = require('puppeteer');
const app = require('../app');

describe('landing page', () => {

  const URL = 'http://localhost:3001';

  let browser, page;

  beforeEach(async () => {
    browser = await puppeteer.launch();
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

  describe('metamask not installed', () => {
    it('displays a warning in the navbar', async () => {
      const el = await page.$('header nav ul li');
      const warning = await el.evaluate(e => e.textContent);
      expect(warning).toEqual('Install the Metamask browser plugin');
    });
  });

  describe('metamask installed', () => {
    it('displays a message to authenticate with metamask', async () => {
      const el = await page.$('header nav ul li');
      const warning = await el.evaluate(e => e.textContent);
      expect(warning).toEqual('Authenticate with Metamask');
    });
  });
});
