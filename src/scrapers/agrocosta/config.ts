import path from  "path";
import { fileURLToPath  } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  sessionPath: path.resolve(__dirname, "../../../sessions/agrocosta.json"),
  baseURL: "https://agro-costa.com/consulta/consulta_inventario.php",
  searchURL: "https://agro-costa.com/consulta/consulta_inventario.php",
  retries: 2,
  timeoutMs: 15000
};