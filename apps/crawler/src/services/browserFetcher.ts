import { chromium, type Browser, type BrowserContext } from "playwright";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Patches leves pra reduzir sinais óbvios de automação (não é stealth completo,
// mas cobre os fingerprints mais checados por challenges de Cloudflare).
const STEALTH_INIT_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  window.chrome = { runtime: {} };
`;

let browser: Browser | null = null;
let context: BrowserContext | null = null;

export async function initBrowser(): Promise<void> {
  browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
  });
  await context.addInitScript(STEALTH_INIT_SCRIPT);
}

export async function fetchBazaarPageViaBrowser(
  pageNum: number,
): Promise<string> {
  if (!context) {
    throw new Error("Browser não inicializado. Chame initBrowser() antes.");
  }

  const url = `https://www.tibia.com/charactertrade/?subtopic=currentcharactertrades&currentpage=${pageNum}`;
  const page = await context.newPage();

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    // Aguarda o desafio do Cloudflare sumir (título deixa de ser "Just a moment...")
    await page
      .waitForFunction(() => !document.title.includes("Just a moment"), {
        timeout: 25000,
      })
      .catch(() => {
        console.warn(
          `[BROWSER] Título ainda parece um challenge na página ${pageNum}, seguindo mesmo assim.`,
        );
      });

    // Espera o conteúdo real do bazar aparecer
    const foundAuctions = await page
      .waitForSelector(".Auction", { timeout: 15000 })
      .then(() => true)
      .catch(() => false);

    if (!foundAuctions) {
      const title = await page.title().catch(() => "?");
      const bodySnippet = await page
        .evaluate(() => document.body?.innerText?.slice(0, 800) ?? "")
        .catch(() => "");
      console.warn(
        `[BROWSER] Seletor .Auction não apareceu na página ${pageNum}.\n` +
          `  status HTTP: ${response?.status()}\n` +
          `  URL final: ${page.url()}\n` +
          `  título: "${title}"\n` +
          `  início do body:\n${bodySnippet}`,
      );
    }

    const html = await page.content();

    if (html.includes("Just a moment")) {
      throw new Error(
        `Challenge do Cloudflare não foi resolvido na página ${pageNum}.`,
      );
    }

    return html;
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  await context?.close();
  await browser?.close();
  context = null;
  browser = null;
}
