import * as cheerio from "cheerio";
import axios, { AxiosError } from "axios";

export interface AuctionData {
  auctionId: number;
  name: string;
  level: number;
  vocation: string;
  world: string;
  currentBid: number;
  endDate: string;
  outfitUrl: string;
  skills: string[];
  items: string[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchBazaarPage(
  pageNumber: number = 1,
  retries = 3,
): Promise<string> {
  const url = `https://www.tibia.com/charactertrade/?subtopic=currentcharactertrades&currentpage=${pageNumber}`;

  // Headers expandidos para maior compatibilidade com Cloudflare
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.tibia.com/charactertrade/",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "max-age=0",
  };

  try {
    const { data } = await axios.get(url, { 
      headers,
      timeout: 15000 // 15 segundos de timeout
    });
    return data;
  } catch (error: unknown) {
    if (retries > 0 && error instanceof AxiosError) {
      const status = error.response?.status;
      
      // 403 (Forbidden) ou 429 (Too Many Requests)
      if (status === 403 || status === 429) {
        // Aumenta o tempo de espera exponencialmente: 10s, 20s, 30s...
        const waitTime = (4 - retries) * 10000; 
        console.warn(
          `[SCRAPER] Bloqueio detectado (Status ${status}) na pág ${pageNumber}. Tentando novamente em ${waitTime / 1000}s... (${retries} tentativas restantes)`,
        );
        await sleep(waitTime);
        return fetchBazaarPage(pageNumber, retries - 1);
      }
    }
    throw error;
  }
}

export function parseBazaarHTML(html: string): AuctionData[] {
  const $ = cheerio.load(html);
  const auctions: AuctionData[] = [];

  $(".Auction").each((_, element) => {
    const auctionLink =
      $(element).find(".AuctionCharacterName a").attr("href") || "";
    const auctionId = parseInt(auctionLink.split("auctionid=")[1] || "0");
    const name = $(element).find(".AuctionCharacterName").text().trim();

    const headerText = $(element).find(".AuctionHeader").text().trim();
    const levelMatch = headerText.match(/Level:\s*(\d+)/);
    const vocationMatch = headerText.match(/Vocation:\s*([^|]+)/);
    const world = $(element)
      .find('.AuctionHeader a[target="_blank"]')
      .text()
      .trim();

    const level = levelMatch ? parseInt(levelMatch[1]) : 0;
    const vocation = vocationMatch ? vocationMatch[1].trim() : "Unknown";

    const bidElement = $(element).find(".ShortAuctionDataValue b");
    const bidText = bidElement
      .text()
      .replace(/[,.\s]/g, "")
      .trim();
    const currentBid = parseInt(bidText) || 0;

    const endDate =
      $(element).find(".AuctionTimer").attr("data-timestamp") || "";
    const outfitUrl = $(element).find(".AuctionOutfitImage").attr("src") || "";

    const skills: string[] = [];
    $(element)
      .find(".SpecialCharacterFeatures .Entry")
      .each((_, el) => {
        skills.push($(el).text().trim());
      });

    const itemsFound: string[] = [];
    $(element)
      .find(".AuctionItemsViewBox .CVIcon")
      .each((_, el) => {
        const itemTitle = $(el).attr("title");
        if (itemTitle && !itemTitle.includes("no item")) {
          itemsFound.push(itemTitle);
        }
      });

    if (auctionId > 0 && name) {
      auctions.push({
        auctionId,
        name,
        level,
        vocation,
        world,
        currentBid,
        endDate,
        outfitUrl,
        skills,
        items: itemsFound,
      });
    }
  });

  return auctions;
}

export async function fetchAllActiveAuctions(
  /* eslint-disable-next-line no-unused-vars */
  onPageProcessed: (data: AuctionData[]) => Promise<void>,
): Promise<void> {

  let currentPage = 1;
  let totalPages = 1;

  try {
    do {
      const html = await fetchBazaarPage(currentPage);

      if (currentPage === 1) {
        totalPages = parseTotalPages(html);
        console.log(`[SCRAPER] Total de páginas detectadas: ${totalPages}`);
      }

      const auctionData = parseBazaarHTML(html);

      if (auctionData.length > 0) {
        await onPageProcessed(auctionData);
        console.log(`[SCRAPER] Página ${currentPage} processada (${auctionData.length} leilões).`);
      }

      currentPage++;
      // Aumentamos um pouco o delay entre páginas para evitar flag de bot
      if (currentPage <= totalPages) await sleep(3000); 
    } while (currentPage <= totalPages);
  } catch (error) {
    if (error instanceof Error) {
      console.error("[SCRAPER] Erro fatal durante a execução:", error.message);
    } else {
      console.error("[SCRAPER] Erro fatal desconhecido:", error);
    }
  }

function parseTotalPages(html: string): number {
  const $ = cheerio.load(html);
  const lastPageLink = $(".PageNavigation .PageLink:last-child a").attr("href");

  if (lastPageLink) {
    const match = lastPageLink.match(/currentpage=(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }

  return 1 } }