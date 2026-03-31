import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 700 } });
await page.goto('http://localhost:5173/design-bible', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);

// Scroll to section 11
await page.evaluate(() => {
  const h2s = document.querySelectorAll('h2');
  for (const h of h2s) {
    if (h.textContent.includes('Compact')) {
      h.scrollIntoView({ behavior: 'instant', block: 'start' });
      break;
    }
  }
});

await page.waitForTimeout(300);
await page.screenshot({ path: 'C:/GraceZero.ai.local/FINAL-PHASE-TRAILLOG/phase-2/compact-hero-section.png' });
console.log('Done');
await browser.close();
