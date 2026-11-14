import { chromium, open, badText, BASE } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome' });
const { page } = await open(browser);
const NEXT = '.nav-controls-bar .sp-btn-nav >> nth=1';
for (const team of [false,true]) {
  await page.goto(BASE); await page.waitForFunction(()=>!document.querySelector('.engine-status'));
  if (team) await page.locator('.team-setup .sp-btn').nth(1).click();
  await page.locator('.brief-start-btn').click(); await page.waitForTimeout(300);
  for (let i=0;i<2;i++){ if (await page.locator('.handover').count()) await page.locator('.handover button').click(); await page.click(NEXT); await page.waitForTimeout(300);} 
  if (await page.locator('.handover').count()) await page.locator('.handover button').click();
  await page.waitForSelector('.launch-btn:not([disabled])'); await page.click('.launch-btn'); await page.waitForSelector('.screen--flight');
  await page.locator('.flight-controls .sp-btn--primary').click();
  let log=[];
  for (let i=0;i<200 && log.length<12;i++){
    if (await page.locator('.storm-card').count()){
      const day=await page.locator('figure.sp-chart').getAttribute('aria-valuenow');
      const rows=await page.locator('.storm-vote-row').count();
      const btns=await page.locator('.storm-card .sp-btn').allInnerTexts();
      if (rows){ for(let r=0;r<rows;r++) await page.locator('.storm-vote-row').nth(r).locator('.sp-btn').nth(0).click(); await page.waitForTimeout(200);}
      const btns2=await page.locator('.storm-card .sp-btn').allInnerTexts();
      const b=page.locator('.storm-card .sp-btn').first(); await b.click(); await page.waitForTimeout(250);
      log.push(`day${day} rows=${rows} btns=${btns.length}->${btns2} cardAfter=${await page.locator('.storm-card').count()} playing=${await page.locator('.flight-controls .sp-btn--primary').innerText()}`);
    }
    await page.waitForTimeout(100);
  }
  console.log(team?'TEAM':'SOLO', log);
}
await browser.close();
