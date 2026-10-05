import path from  "path";
import { fileURLToPath  } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  sessionPath: path.resolve(__dirname, "../../../sessions/catekom.json"),
  baseURL: "http://179.33.191.211:8090/",
  searchURL: "http://179.33.191.211:8090/Pages/CLIENTES.aspx",
  retries: 2,
  timeoutMs: 15000
};