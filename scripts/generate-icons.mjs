// Generates the PWA icon set from an inline SVG using sharp.
// Run once (npm run icons) — outputs are committed to public/icons/.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outDir = path.resolve(import.meta.dirname, "../public/icons");

function pawSvg({ padding = 0, rounded = true } = {}) {
  // padding: extra safe-zone scale-down for maskable icons
  const s = 1 - padding;
  const rx = rounded ? 115 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f0955a"/>
      <stop offset="1" stop-color="#e2662f"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rx}" fill="url(#bg)"/>
  <g fill="#fffdf9" transform="translate(256 266) scale(${s}) translate(-256 -266)">
    <ellipse cx="143" cy="235" rx="40" ry="52" transform="rotate(-24 143 235)"/>
    <ellipse cx="217" cy="172" rx="43" ry="56" transform="rotate(-7 217 172)"/>
    <ellipse cx="295" cy="172" rx="43" ry="56" transform="rotate(7 295 172)"/>
    <ellipse cx="369" cy="235" rx="40" ry="52" transform="rotate(24 369 235)"/>
    <path d="M256 260c58 0 104 38 104 88 0 34-26 52-52 52-20 0-34-9-52-9s-32 9-52 9c-26 0-52-18-52-52 0-50 46-88 104-88z"/>
  </g>
</svg>`;
}

await mkdir(outDir, { recursive: true });

const jobs = [
  { file: "icon-192.png", size: 192, svg: pawSvg() },
  { file: "icon-512.png", size: 512, svg: pawSvg() },
  { file: "icon-maskable-512.png", size: 512, svg: pawSvg({ padding: 0.18, rounded: false }) },
  { file: "apple-touch-icon.png", size: 180, svg: pawSvg({ rounded: false }) },
];

for (const { file, size, svg } of jobs) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(outDir, file));
  console.log(`wrote icons/${file}`);
}

await writeFile(path.join(outDir, "favicon.svg"), pawSvg());
console.log("wrote icons/favicon.svg");
