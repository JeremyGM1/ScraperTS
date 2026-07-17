import { chromium } from "playwright";
import { config as envConfig } from "./helpers/env";
import { normalizeRefs } from "./helpers/normalize_refs";
import { run as runAgrocosta } from "./scrapers/agrocosta/scraper";
import { run as runCatekom } from "./scrapers/catekom/scraper";
import { run as runParteequipos } from "./scrapers/parteequipos/scraper";
import { run as runRetrotrac } from "./scrapers/retrotrac/scraper";
import { run as runServi } from "./scrapers/servi/scraper";
import cors from "@fastify/cors";
import Fastify from "fastify";

type SearchBody = {
  references?: string[];
  scrapers?: string[];
};

async function main() {
  const browser = await chromium.launch({ headless: process.env.HEADLESS !== "false" });
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  app.addHook("onClose", async () => {
    await browser.close();
  });

  await app.register(cors);

  app.post<{ Body: SearchBody }>('/search', async (req, reply) => {
    const refsToSearch = normalizeRefs(req.body.references);
    const selectedScrapers = normalizeRefs(req.body.scrapers);

    if (refsToSearch.length === 0) {
      return reply.status(400).send({ error: 'At least one reference is required' });
    }

    if (selectedScrapers.length === 0) {
      return reply.status(400).send({ error: 'At least one scraper must be selected' });
    }

    try {
      const scraperMap: Record<string, (ref: string) => Promise<any>> = {
        retrotrac: (ref) => runRetrotrac(browser, envConfig.retrotrac.email, envConfig.retrotrac.password, ref, req.log),
        parteequipos: (ref) => runParteequipos(browser, envConfig.parteequipos.email, envConfig.parteequipos.password, ref, req.log),
        servi: (ref) => runServi(browser, envConfig.servi.email, envConfig.servi.password, ref, req.log),
        agrocosta: (ref) => runAgrocosta(browser, envConfig.agrocosta.email, envConfig.agrocosta.password, ref, req.log),
        catekom: (ref) => runCatekom(browser, envConfig.catekom.email, envConfig.catekom.password, ref, req.log),
      };

      const invalidScrapers = selectedScrapers.filter((name) => !scraperMap[name.toLowerCase()]);
      const validScrapers = selectedScrapers.filter((name) => scraperMap[name.toLowerCase()]);

      if (invalidScrapers.length > 0) {
        req.log.warn({ invalidScrapers }, "Unknown scraper names requested");
      }

      if (validScrapers.length === 0) {
        return reply.status(400).send({ error: 'No valid scrapers were selected' });
      }

      const results = await Promise.all(
        refsToSearch.map(async (reference) => {
          const scraperResults = await Promise.allSettled(
            validScrapers.map((name) => scraperMap[name.toLowerCase()](reference))
          );

          return {
            reference,
            ...Object.fromEntries(
              validScrapers.map((scraperName, index) => {
                const result = scraperResults[index];
                if (result.status === "fulfilled") {
                  return [scraperName.toLowerCase(), result.value];
                }
                req.log.warn({ scraperName, reference, err: result.reason }, "Error occurred during scraping");
                return [scraperName.toLowerCase(), { error: "Scraper failed", reason: String(result.reason) }];
              })
            ),
          };
        })
      );

      return reply.send({
        results,
        ...(invalidScrapers.length > 0 && { warnings: { unknownScrapers: invalidScrapers } }),
      });
    } catch (err) {
      req.log.error({ err, refsToSearch, selectedScrapers }, "Error occurred during scraping");
      return reply.status(500).send({ error: 'An error occurred during scraping' });
    }
  });

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen({ port, host });

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();