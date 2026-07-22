import { config } from "./config";
import { IAgrocostaProduct } from "../../types/agrocosta_product";
import * as cheerio from "cheerio";
import fetch from "node-fetch";
import fs from "fs";

const NOT_FOUND_TEXT = "No se encontraron resultados para la referencia";

function cookieHeaderFromStorageState(path: string): string {
  const raw = JSON.parse(fs.readFileSync(path, "utf-8"));
  return raw.cookies
    .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
    .join("; ");
}

export async function queryViaHttp(refId: string): Promise<{ html: string; loggedOut: boolean }> {
  const cookieHeader = cookieHeaderFromStorageState(config.sessionPath);

  const body = new URLSearchParams({
    tipo_busqueda: "referencia",
    referencia: refId,
    descripcion: "",
    buscar: "",
  });

  const res = await fetch(config.searchURL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer: config.searchURL,
      cookie: cookieHeader,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    body: body.toString(),
    redirect: "manual",
  });

  const html = await res.text();
  const loggedOut = (res.status >= 300 && res.status < 400) || html.includes("Iniciar sesión");

  return { html, loggedOut };
}

export function isNotFoundHtml(html: string): boolean {
  const $ = cheerio.load(html);
  return $("div.alert.alert-danger").text().includes(NOT_FOUND_TEXT);
}

export function parseProducts(html: string): IAgrocostaProduct[] {
  const $ = cheerio.load(html);
  const results: IAgrocostaProduct[] = [];

  $("table").each((_, table) => {
    const columnMap: Record<string, number> = {};
    $(table)
      .find("thead tr th")
      .each((i, th) => {
        const text = $(th).text().trim().toLowerCase().replace(/\s+/g, " ");
        columnMap[text] = i;
      });

    $(table)
      .find("tbody tr")
      .each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length < 4) return;

        const textLikeInnerText = (el: cheerio.Cheerio<any>): string => {
          const clone = el.clone();
          clone.find("br").replaceWith("\n");
          return clone.text().trim();
        };

        const getCell = (headerKey: string): string => {
          const idx = columnMap[headerKey];
          if (idx === undefined || idx >= cells.length) return "";
          return textLikeInnerText($(cells[idx]));
        };

        const extractStock = (idx: number | undefined): string => {
          if (idx === undefined) return "";
          const cell = $(cells[idx]);
          const badge = cell.find("div.stock-badge");
          if (badge.length > 0) {
            return textLikeInnerText(badge);
          }
          return cell
            .contents()
            .filter((_, n) => n.type === "text")
            .text()
            .trim();
        };

        const barranquillaIdx = columnMap["bodega barranquilla"] ?? columnMap["disponible"];
        const bogotaIdx = columnMap["bodega bogotá"];

        results.push({
          Referencia: getCell("referencia"),
          Nombre: getCell("descripción"),
          Barranquilla: extractStock(barranquillaIdx),
          Bogota: extractStock(bogotaIdx),
          Marca: getCell("marca"),
          Precio: getCell("precio antes de iva"),
        });
      });
  });

  return results;
}