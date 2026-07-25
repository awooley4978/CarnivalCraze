import sharp from "sharp";

const BG = "#1A0A2E"; // midnight purple
const GOLD = "#FFD700";
const RED = "#E63946";
const WHITE = "#F5F0E1";
const STRIPE_DARK = "#8B0000";

async function makeIcon(size) {
  const half = size / 2;
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="rounded">
          <rect width="${size}" height="${size}" rx="${size * 0.15}" ry="${size * 0.15}"/>
        </clipPath>
      </defs>

      <!-- Background -->
      <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="${BG}"/>

      <g clip-path="url(#rounded)">
        <!-- Stars in background -->
        <circle cx="${size * 0.15}" cy="${size * 0.3}" r="${size * 0.01}" fill="${WHITE}" opacity="0.6"/>
        <circle cx="${size * 0.85}" cy="${size * 0.25}" r="${size * 0.012}" fill="${WHITE}" opacity="0.5"/>
        <circle cx="${size * 0.2}" cy="${size * 0.7}" r="${size * 0.008}" fill="${WHITE}" opacity="0.4"/>
        <circle cx="${size * 0.75}" cy="${size * 0.65}" r="${size * 0.01}" fill="${WHITE}" opacity="0.5"/>
        <circle cx="${size * 0.5}" cy="${size * 0.15}" r="${size * 0.009}" fill="${WHITE}" opacity="0.6"/>

        <!-- Tent body — triangle stripes -->
        <!-- Left side of tent -->
        <polygon points="${half},${size * 0.35} ${size * 0.22},${size * 0.88} ${half - size * 0.06},${size * 0.88}" fill="${RED}"/>
        <polygon points="${half - size * 0.06},${size * 0.35} ${size * 0.22 - size * 0.05},${size * 0.88} ${size * 0.22},${size * 0.88}" fill="${GOLD}"/>

        <!-- Right side of tent -->
        <polygon points="${half},${size * 0.35} ${size * 0.78},${size * 0.88} ${half + size * 0.06},${size * 0.88}" fill="${RED}"/>
        <polygon points="${half + size * 0.06},${size * 0.35} ${size * 0.78 + size * 0.05},${size * 0.88} ${size * 0.78},${size * 0.88}" fill="${GOLD}"/>

        <!-- Tent top accent -->
        <polygon points="${half},${size * 0.2} ${half - size * 0.03},${size * 0.35} ${half + size * 0.03},${size * 0.35}" fill="${WHITE}"/>

        <!-- Center stripe -->
        <polygon points="${half},${size * 0.35} ${half - size * 0.06},${size * 0.88} ${half + size * 0.06},${size * 0.88}" fill="${RED}"/>

        <!-- Entrance flap -->
        <path d="M${half - size * 0.1},${size * 0.88} L${half},${size * 0.65} L${half + size * 0.1},${size * 0.88} Z" fill="${BG}" stroke="${GOLD}" stroke-width="${size * 0.015}"/>

        <!-- Blinking bulb above tent -->
        <circle cx="${half}" cy="${size * 0.12}" r="${size * 0.03}" fill="${GOLD}" opacity="0.9"/>
        <circle cx="${half}" cy="${size * 0.12}" r="${size * 0.05}" fill="${GOLD}" opacity="0.3"/>
      </g>

      <!-- Border -->
      <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="none" stroke="${GOLD}" stroke-width="${size * 0.02}" opacity="0.5"/>
    </svg>`;

  return sharp(Buffer.from(svg)).png().toFile(`public/icon-${size}.png`);
}

await Promise.all([makeIcon(192), makeIcon(512)]);
console.log("Icons generated: icon-192.png, icon-512.png");
