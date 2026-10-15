import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const png = readFileSync("../../research/snap-preview-re/assets/devices_overlays/iPhone 14 Pro/live.png").toString("base64");
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
const res = await p.evaluate(async (b64) => {
  const img = new Image();
  img.src = "data:image/png;base64," + b64;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const H = c.height, W = c.width;
  const rowCov = [], colCov = [];
  for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x += 4) if (d[(y * W + x) * 4 + 3] > 40) n++; rowCov.push(n / (W / 4)); }
  for (let x = 0; x < W; x++) { let n = 0; for (let y = 0; y < H; y += 4) if (d[(y * W + x) * 4 + 3] > 40) n++; colCov.push(n / (H / 4)); }
  // find contiguous blocked bands: rows with >50% coverage at top and bottom
  let topEnd = 0; while (topEnd < H && rowCov[topEnd] > 0.5) topEnd++;
  let botStart = H; while (botStart > 0 && rowCov[botStart - 1] > 0.5) botStart--;
  let leftEnd = 0; while (leftEnd < W && colCov[leftEnd] > 0.3) leftEnd++;
  let rightStart = W; while (rightStart > 0 && colCov[rightStart - 1] > 0.3) rightStart--;
  // also report rows with >30% coverage (icon zones partially blocking)
  const partial = [];
  for (let y = 0; y < H; y += 20) if (rowCov[y] > 0.3) partial.push(y);
  return { W, H, topEnd, botStart, leftEnd, rightStart, partialTop: partial.filter(y=>y<H/2), partialBot: partial.filter(y=>y>H/2) };
}, png);
console.log(JSON.stringify(res, null, 1));
console.log("CSS 393x852 scaled:", JSON.stringify({
  topEnd: Math.round(res.topEnd * 852 / res.H),
  botStart: Math.round(res.botStart * 852 / res.H),
  leftEnd: Math.round(res.leftEnd * 393 / res.W),
  rightStart: Math.round(res.rightStart * 393 / res.W),
}));
await b.close();
