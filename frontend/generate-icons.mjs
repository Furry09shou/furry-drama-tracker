import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, 'public', 'icon.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(join(__dirname, 'public', `icon-${size}x${size}.png`));
  console.log(`Generated icon-${size}x${size}.png`);
}

await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(join(__dirname, 'public', 'apple-touch-icon.png'));
console.log('Generated apple-touch-icon.png');

console.log('Done!');
