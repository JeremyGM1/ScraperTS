import Fastify from "fastify";
import cors from "@fastify/cors";
import { chromium } from "playwright";
import { config } from "dotenv";
import { run as runRetrotrac } from "./scrapers/retrotrac/scraper";
import { run as runParteequipos } from "./scrapers/parteequipos/scraper";
import { run as runServi } from "./scrapers/servi/scraper";

config();

const {
  RETROTRAC_EMAIL,
  RETROTRAC_PASSWORD,
  PARTEEQUIPOS_EMAIL,
  PARTEEQUIPOS_PASSWORD,
  SERVI_EMAIL,
  SERVI_PASSWORD,
} = process.env;

if (!RETROTRAC_EMAIL || !RETROTRAC_PASSWORD) {
  console.error("Error: RETROTRAC_EMAIL and RETROTRAC_PASSWORD must be set in the .env file.");
  process.exit(1);
}

async function main() {

  const app = Fastify({ logger: true });
  await app.register(cors);

  app.post<{ Body: { ref_id: string } }>("/search", async (req, reply) => {
    const { ref_id } = req.body;

    if (!ref_id) {
      return reply.status(400).send({ error: "ref_id is required" });
    }

    const browser = await chromium.launch({ headless: false });

    try {      
      /*
      const [retrotrac, partequipos, servi] = await Promise.all([
        runRetrotrac(browser, RETROTRAC_EMAIL!, RETROTRAC_PASSWORD!, ref_id),
        runParteequipos(browser, PARTEEQUIPOS_EMAIL!, PARTEEQUIPOS_PASSWORD!, ref_id),
        runServi(browser, SERVI_EMAIL!, SERVI_PASSWORD!, ref_id),
      ]);
      */

      const [servi] = await Promise.all([
        //runRetrotrac(browser, RETROTRAC_EMAIL!, RETROTRAC_PASSWORD!, ref_id),
        //runParteequipos(browser, PARTEEQUIPOS_EMAIL!, PARTEEQUIPOS_PASSWORD!, ref_id),   
        runServi(browser, SERVI_EMAIL!, SERVI_PASSWORD!, ref_id),     
      ]);

      //return reply.send({ retrotrac, partequipos, servi });
      return reply.send({ servi });
    } finally {
      await browser.close();
    }
  });

  await app.listen({ port: 3000 });
}

main();