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

  app.post<{ Body: { ref_id?: string; ref_ids?: string[] | string; refs?: string[] | string; scrapers?: string[] | string } }>('/search', async (req, reply) => {
    const { ref_id, ref_ids, refs, scrapers } = req.body;
    const refsToSearch = normalizeRefs(ref_id ?? ref_ids ?? refs);
    const selectedScrapers = normalizeRefs(scrapers);

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

  app.post<{ Body: { refs?: string[] | string; scrapers?: string[] | string } }>('/search/batch', async (req, reply) => {
    const { refs, scrapers } = req.body;
    const refsToSearch = normalizeRefs(refs);
    const selectedScrapers = normalizeRefs(scrapers);

    if (refsToSearch.length === 0) {
      return reply.status(400).send({ error: 'At least one reference is required' });
    }

    if (selectedScrapers.length === 0) {
      return reply.status(400).send({ error: 'At least one scraper must be selected' });
    }

    const browser = await chromium.launch({ headless: false });

    try {
      const results = await Promise.all(
        refsToSearch.map(async (reference) => {
          const scraperResults = await Promise.all(
            selectedScrapers.map(async (scraperName) => {
              const normalized = scraperName.toLowerCase();

              if (normalized === 'retrotrac') {
                return { name: 'retrotrac', value: await runRetrotrac(browser, RETROTRAC_EMAIL!, RETROTRAC_PASSWORD!, reference) };
              }

              if (normalized === 'parteequipos') {
                return { name: 'parteequipos', value: await runParteequipos(browser, PARTEEQUIPOS_EMAIL!, PARTEEQUIPOS_PASSWORD!, reference) };
              }

              if (normalized === 'servi') {
                return { name: 'servi', value: await runServi(browser, SERVI_EMAIL!, SERVI_PASSWORD!, reference) };
              }

              if (normalized === 'agrocosta') {
                return { name: 'agrocosta', value: await runAgrocosta(browser, AGRO_EMAIL!, AGRO_PASSWORD!, reference) };
              }

              if (normalized === 'catekom') {
                return { name: 'catekom', value: await runCatekom(browser, CATEKOM_EMAIL!, CATEKOM_PASSWORD!, reference) };
              }

              return { name: normalized, value: null };
            })
          );

          return {
            reference,
            ...Object.fromEntries(scraperResults.map((entry) => [entry.name, entry.value])),
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