import path from  "path";
import { fileURLToPath  } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  sessionPath: path.resolve(__dirname, "../../../sessions/servitractor.json"),
  baseURL: "https://empresaservitractor.zohocreatorportal.com/",
}