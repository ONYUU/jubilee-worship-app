import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import http from "node:http";
import fs from "node:fs/promises";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../..");
const requireFromWeb = createRequire(path.join(currentDir, "../../apps/web/package.json"));
const { chromium } = requireFromWeb("@playwright/test");

const outputDir = path.join(currentDir, "output");
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
]);

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
    const filePath = path.resolve(projectRoot, `.${pathname}`);
    if (!filePath.startsWith(`${projectRoot}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const body = await fs.readFile(filePath);
    response.writeHead(200, { "Content-Type": contentTypes.get(path.extname(filePath)) ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Mockup server did not start.");
const htmlUrl = `http://127.0.0.1:${address.port}/design/mobile/app-concept-v1.html`;

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const themes = [
  { slug: "v1", board: "app-design-board-v1.png", params: {} },
  { slug: "v2-light", board: "app-design-board-v2-light.png", params: { theme: "light" } },
  { slug: "v3-balanced", board: "app-design-board-v3-balanced.png", params: { theme: "balanced" } },
  { slug: "v4-rose", board: "app-design-board-v4-rose.png", params: { theme: "rose" } },
  { slug: "v5-rose-logo-free", board: "app-design-board-v5-rose-logo-free.png", params: { theme: "rose-nologo" } },
  { slug: "v6-rose-logo-free-sermon", board: "app-design-board-v6-rose-logo-free-sermon.png", params: { theme: "rose-nologo-sermon" } },
];

const makeUrl = (params) => {
  const url = new URL(htmlUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.href;
};

try {
  for (const theme of themes) {
    const boardContext = await browser.newContext({ viewport: { width: 2640, height: 1010 }, deviceScaleFactor: 1.25, locale: "ko-KR", timezoneId: "Asia/Seoul", reducedMotion: "reduce" });
    const board = await boardContext.newPage();
    await board.goto(makeUrl(theme.params), { waitUntil: "networkidle" });
    await board.evaluate(() => document.fonts.ready);
    const boardImages = await board.evaluate(() => [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).length);
    if (boardImages !== 0) throw new Error(`${theme.slug}: board has ${boardImages} broken images`);
    if (theme.slug.includes("logo-free")) {
      const logoAudit = await board.evaluate(() => ({
        visibleBrandImages: [...document.images].filter((image) => {
          const style = getComputedStyle(image);
          return image.src.includes("/images/brand/") && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0;
        }).length,
        mediaSource: document.querySelector("#media-feature-image")?.getAttribute("src"),
        guideSource: document.querySelector("#guide-hero-image")?.getAttribute("src"),
      }));
      if (logoAudit.visibleBrandImages !== 0 ||
          logoAudit.mediaSource?.includes("youtube-featured") ||
          logoAudit.guideSource?.includes("visit-welcome")) {
        throw new Error(`${theme.slug}: logo-free audit failed ${JSON.stringify(logoAudit)}`);
      }
    }
    await board.locator(".board").screenshot({ path: path.join(outputDir, theme.board) });
    await boardContext.close();

    for (const name of ["splash", "home", "worship", "media", "guide", "songlist"]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "ko-KR", timezoneId: "Asia/Seoul", reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors = [];
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(makeUrl({ ...theme.params, screen: name }), { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => ({
        brokenImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      const device = page.locator(".mockup.selected .device");
      const box = await device.boundingBox();
      if (!box || box.width !== 390 || box.height !== 844) throw new Error(`${theme.slug}/${name}: invalid frame ${JSON.stringify(box)}`);
      if (result.brokenImages !== 0 || result.overflow !== 0 || errors.length !== 0) {
        throw new Error(`${theme.slug}/${name}: render validation failed ${JSON.stringify({ ...result, errors })}`);
      }
      await device.screenshot({ path: path.join(outputDir, `${name}-${theme.slug}.png`) });
      await context.close();
      process.stdout.write(`${theme.slug}/${name}: 390x844 CSS px, images ok, no console errors\n`);
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
