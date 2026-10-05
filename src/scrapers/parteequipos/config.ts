import path from  "path";
import { fileURLToPath  } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  sessionPath: path.resolve(__dirname, "../../../sessions/parteequipos.json"),
  baseURL: "https://tienda.partequipos.com/",
  searchURL: "https://tienda.partequipos.com/catalogsearch/result/?q=",
  inventoryURL: "https://tienda.partequipos.com/getinventory/index/inventory/sku",
  URLgraphQL: "https://tienda.partequipos.com/graphql",
  retries: 2,
  timeoutMs: 15000
};