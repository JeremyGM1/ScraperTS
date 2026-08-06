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

  const scraperMap: Record<string, (ref: string, log: any) => Promise<any>> = {
      retrotrac: (ref, log) => runRetrotrac(browser, envConfig.retrotrac.email, envConfig.retrotrac.password, ref, log),
      parteequipos: (ref, log) => runParteequipos(browser, envConfig.parteequipos.email, envConfig.parteequipos.password, ref, log),
      servi: (ref, log) => runServi(browser, envConfig.servi.email, envConfig.servi.password, ref, log),
      agrocosta: (ref, log) => runAgrocosta(browser, envConfig.agrocosta.email, envConfig.agrocosta.password, ref, log),
      catekom: (ref, log) => runCatekom(browser, envConfig.catekom.email, envConfig.catekom.password, ref, log),
    };

    function validateSearchBody(req: { body: SearchBody }, reply: any) {
      const refsToSearch = normalizeRefs(req.body.references);
      const selectedScrapers = normalizeRefs(req.body.scrapers);

      if (refsToSearch.length === 0) {
       reply.status(400).send({ error: 'At least one reference is required' });
       return null;
      }
  
      if (selectedScrapers.length === 0) {
        reply.status(400).send({ error: 'At least one scraper must be selected' });
        return null;
      }
      
      const invalidScrapers = selectedScrapers.filter((name) => !scraperMap[name.toLowerCase()]);
      const validScrapers = selectedScrapers.filter((name) => scraperMap[name.toLowerCase()]);

      if (validScrapers.length === 0) {
        reply.status(400).send({ error: 'No valid scrapers were selected' });
        return null;
      }

      return { refsToSearch, validScrapers, invalidScrapers };
    }

  app.post<{ Body: SearchBody }>('/search', async (req, reply) => {
    const parsed = validateSearchBody(req, reply);
    if(!parsed) return;
    const { refsToSearch, validScrapers, invalidScrapers } = parsed;
    try {
      const results = await Promise.all(
        refsToSearch.map(async (reference) => {
          const scraperResults = await Promise.allSettled(
            validScrapers.map((name) => scraperMap[name.toLowerCase()](reference, req.log))
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
      req.log.error({ err, refsToSearch, selectedScrapers: validScrapers }, "Error occurred during scraping");
      return reply.status(500).send({ error: 'An error occurred during scraping' });
    }
  });

  app.post<{ Body: SearchBody }>("/search/stream", async (req, reply) => {
    const parsed = validateSearchBody(req, reply);
    if (!parsed) return;
    const { refsToSearch, validScrapers, invalidScrapers } = parsed;
    
    const headers = {
      ...reply.getHeaders(),
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    };

    for(const [key, value] of Object.entries(headers)) {
      if (value != undefined) {
        reply.raw.setHeader(key, value);
      }
    }

    reply.raw.writeHead(200);

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    if (invalidScrapers.length > 0) {
      send("warning", { unknownScrapers: invalidScrapers })
    }

    const tasks = refsToSearch.flatMap((reference) =>
      validScrapers.map((scraperName) => ({ reference, scraperName }))
    );

    await Promise.allSettled(
      tasks.map(async ({ reference, scraperName }) => {
        try{
          const data = await scraperMap[scraperName.toLowerCase()](reference, req.log);
          send("result", { reference, scraper: scraperName.toLowerCase(), status: "ok", data});        
        } catch(err){
          req.log.warn({ scraperName, reference, err }, "Error occurred while scraping");
          send("result", {
            reference,
            scraper: scraperName.toLowerCase(),
            status: "error",
            error: err instanceof Error ? err.message : String(err)
          });
        }
      })
    );

    send("done", {});
    reply.raw.end();
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