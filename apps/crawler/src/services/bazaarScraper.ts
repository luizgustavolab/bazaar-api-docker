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

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

export async function fetchBazaarPage(
  page: number = 1,
  retries: number = 3,
): Promise<string> {
  const url = `https://www.tibia.com/charactertrade/?subtopic=currentcharactertrades&currentpage=${page}`;
  const headers = { "User-Agent": USER_AGENTS[0] };

  try {
    const { data } = await axios.get<string>(url, { headers, timeout: 20000 });
    return data;
  } catch (error: unknown) {
    if (retries > 0 && error instanceof AxiosError) {
      const status = error.response?.status;
      
      if (status === 403 || status === 429) {
        console.warn(`[SCRAPER] Rate limit atingido na página ${page}. Aguardando 30s...`);
        await sleep(30000);
        return fetchBazaarPage(page, retries - 1);
      }
    }
    throw error;
  }
}

export function parseBazaarHTML(html: string): AuctionData[] {
  const $ = cheerio.load(html);
  const auctions: AuctionData[] = [];

  $(".Auction").each((_, el) => {
    const auctionLink = $(el).find(".AuctionCharacterName a").attr("href") ?? "";
    const auctionId = parseInt(auctionLink.split("auctionid=")[1] ?? "0");
    const name = $(el).find(".AuctionCharacterName").text().trim();

    if (auctionId > 0 && name) {
      const headerText = $(el).find(".AuctionHeader").text().trim();
      const level = parseInt(headerText.match(/Level:\s*(\d+)/)?.[1] ?? "0");
      const vocation = headerText.match(/Vocation:\s*([^|]+)/)?.[1]?.trim() ?? "Unknown";
      const world = $(el).find('.AuctionHeader a[target="_blank"]').text().trim();
      
      const currentBid = parseInt(
        $(el).find(".ShortAuctionDataValue b").text().replace(/[,.\s]/g, ""),
      ) || 0;
      
      const endDate = $(el).find(".AuctionTimer").attr("data-timestamp") ?? "";
      const outfitUrl = $(el).find(".AuctionOutfitImage").attr("src") ?? "";

      const skills: string[] = [];
      $(el).find(".SpecialCharacterFeatures .Entry").each((_, e) => {
        skills.push($(e).text().trim());
      });

      const items: string[] = [];
      $(el).find(".AuctionItemsViewBox .CVIcon").each((_, e) => {
        const title = $(e).attr("title");
        if (title && !title.includes("no item")) {
          items.push(title);
        }
      });

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
        items,
      });
    }
  });
  return auctions;
}

export async function fetchAllActiveAuctions(
  onPageProcessed: (data: AuctionData[]) => Promise<void>,
): Promise<void> {
  let currentPage = 1;
  let totalPages = 1;

  try {
    do {
      console.log(`[SCRAPER] Lendo página ${currentPage}...`);
      const html = await fetchBazaarPage(currentPage);
      
      // Na primeira página, identificamos o total de páginas existentes
      if (currentPage === 1) {
        const $ = cheerio.load(html);
        const paginationText = $(".PageNavigation .PageCaption").first().text();
       
        const totalPagesMatch = paginationText.match(/of\s(\d+)/i);
        
        if (totalPagesMatch) {
          totalPages = parseInt(totalPagesMatch[1], 10);
        } else {
          
          const lastPageLink = $(".PageNavigation .PageLink a").last().attr("href");
          totalPages = lastPageLink?.match(/currentpage=(\d+)/)
            ? parseInt(RegExp.$1, 10)
            : 1;
        }
        console.log(`[SCRAPER] Total de páginas detectadas: ${totalPages}`);
      }

      const auctionData = parseBazaarHTML(html);
      
      if (auctionData.length > 0) {
        
        await onPageProcessed(auctionData);
        console.log(`[SCRAPER] Página ${currentPage} enviada para a fila.`);
      }

      currentPage++;
      
      
      if (currentPage <= totalPages) {
        await sleep(5000); 
      }
    } while (currentPage <= totalPages);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[SCRAPER] Erro durante a varredura:", msg);
    throw error;
  }
}