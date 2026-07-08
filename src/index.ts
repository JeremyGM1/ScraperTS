import { chromium } from "playwright";
import { config } from "dotenv";
import { normalizeRefs } from "./helpers/normalize_refs";
import { run as runAgrocosta } from "./scrapers/agrocosta/scraper";
import { run as runCatekom } from "./scrapers/catekom/scraper";
import { run as runParteequipos } from "./scrapers/parteequipos/scraper";
import { run as runRetrotrac } from "./scrapers/retrotrac/scraper";
import { run as runServi } from "./scrapers/servi/scraper";
import cors from "@fastify/cors";
import Fastify from "fastify";

config();

type SearchBody = {
  ref_id?: string;
  refId?: string;
  ref_ids?: string[] | string;
  refIds?: string[] | string;
  refs?: string[] | string;
  references?: string[] | string;
  reference?: string;
  scrapers?: string[] | string;
  scraperNames?: string[] | string;
  selectedScrapers?: string[] | string;
  scraper?: string[] | string;
};

const {
  RETROTRAC_EMAIL,
  RETROTRAC_PASSWORD,
  PARTEEQUIPOS_EMAIL,
  PARTEEQUIPOS_PASSWORD,
  SERVI_EMAIL,
  SERVI_PASSWORD,
  AGRO_EMAIL,
  AGRO_PASSWORD,
  CATEKOM_EMAIL,
  CATEKOM_PASSWORD
} = process.env;

if (!RETROTRAC_EMAIL || !RETROTRAC_PASSWORD) {
  console.error("Error: RETROTRAC_EMAIL and RETROTRAC_PASSWORD must be set in the .env file.");
  process.exit(1);
}

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors);

  app.post<{ Body: SearchBody }>('/search', async (req, reply) => {
    const refsToSearch = normalizeRefs({
      ref_id: req.body.ref_id,
      refId: req.body.refId,
      ref_ids: req.body.ref_ids,
      refIds: req.body.refIds,
      refs: req.body.refs,
      references: req.body.references,
      reference: req.body.reference,
    });
    const selectedScrapers = normalizeRefs({
      scrapers: req.body.scrapers,
      scraperNames: req.body.scraperNames,
      selectedScrapers: req.body.selectedScrapers,
      scraper: req.body.scraper,
    });

    if (refsToSearch.length === 0) {
      return reply.status(400).send({ error: 'At least one reference is required' });
    }

    if (selectedScrapers.length === 0) {
      return reply.status(400).send({ error: 'At least one scraper must be selected' });
    }

    const browser = await chromium.launch({ headless: false });

    try {
      const scraperRuns = selectedScrapers.map((scraperName) => {
        const normalized = scraperName.toLowerCase();

        if (normalized === 'retrotrac') {
          return (ref: string) => runRetrotrac(browser, RETROTRAC_EMAIL!, RETROTRAC_PASSWORD!, ref);
        }

        if (normalized === 'parteequipos') {
          return (ref: string) => runParteequipos(browser, PARTEEQUIPOS_EMAIL!, PARTEEQUIPOS_PASSWORD!, ref);
        }

        if (normalized === 'servi') {
          return (ref: string) => runServi(browser, SERVI_EMAIL!, SERVI_PASSWORD!, ref);
        }

        if (normalized === 'agrocosta') {
          return (ref: string) => runAgrocosta(browser, AGRO_EMAIL!, AGRO_PASSWORD!, ref);
        }

        if (normalized === 'catekom') {
          return (ref: string) => runCatekom(browser, CATEKOM_EMAIL!, CATEKOM_PASSWORD!, ref);
        }

        return null;
      }).filter(Boolean) as Array<(ref: string) => Promise<any>>;

      if (scraperRuns.length === 0) {
        return reply.status(400).send({ error: 'No valid scrapers were selected' });
      }

      const results = await Promise.all(
        refsToSearch.map(async (reference) => {
          const scraperResults = await Promise.all(
            scraperRuns.map(async (runScraper) => {
              const result = await runScraper(reference);
              return result;
            })
          );

          return {
            reference,
            ...Object.fromEntries(
              selectedScrapers.map((scraperName, index) => [scraperName.toLowerCase(), scraperResults[index]])
            ),
          };
        })
      );

      return reply.send({ results });
    } finally {
      await browser.close();
    }
  });

  await app.listen({ port: 3000 });
}

main();