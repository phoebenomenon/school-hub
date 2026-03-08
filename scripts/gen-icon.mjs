import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "fs";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1B4332"/>
      <stop offset="50%" style="stop-color:#2D6A4F"/>
      <stop offset="100%" style="stop-color:#40916C"/>
    </linearGradient>
    <clipPath id="rounded">
      <rect width="512" height="512" rx="112" ry="112"/>
    </clipPath>
  </defs>
  <rect width="512" height="512" rx="112" ry="112" fill="url(#bg)"/>
  <text x="256" y="340" font-size="280" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">🎒</text>
</svg>
`;

for (const [size, name] of [[512, "icon-512.png"], [192, "icon-192.png"], [180, "apple-touch-icon.png"]]) {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  const png = resvg.render().asPng();
  writeFileSync(`public/${name}`, png);
  console.log(`✓ public/${name} (${size}x${size})`);
}
