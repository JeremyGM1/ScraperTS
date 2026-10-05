import path from  "path";
import { fileURLToPath  } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  sessionPath: path.resolve(__dirname, "../../../sessions/retrotrac.json"),
  baseURL: "https://tiendab2b.retrotrac.com/",
  searchURL: "https://admin.retrotrac.com/backend/admin/frontend/web/index.php/categoria-info/show-items-by-cattegory",
  retries: 2,
  timeoutMs: 15000
};