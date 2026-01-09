import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const source = path.join(rootDir, "src", "assets", "logo-bellavia.png");
const destDir = path.join(rootDir, "public");
const dest = path.join(destDir, "logo-bellavia.png");

async function main() {
  try {
    await fs.access(source);
  } catch {
    throw new Error(`Arquivo não encontrado: ${source}`);
  }

  await fs.mkdir(destDir, { recursive: true });
  await fs.copyFile(source, dest);
}

main().catch((err) => {
  console.error("[bellavia] Falha ao sincronizar logo para public:");
  console.error(err);
  process.exit(1);
});
