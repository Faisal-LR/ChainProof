import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Jimp from 'jimp';

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../tests/fixtures');
await fs.mkdir(directory, { recursive: true });
await fs.writeFile(path.join(directory, 'professor-demo-original.txt'), 'ChainProof professor demonstration work — original v1.\n');
await fs.writeFile(path.join(directory, 'professor-demo-modified.txt'), 'ChainProof professor demonstration work — modified v2.\n');

const image = new Jimp(360, 240, 0xf3f8ffff);
image.scan(34, 34, 292, 172, (x, y, offset) => {
  const diagonal = Math.abs(y - (0.45 * x + 38)) < 18;
  const arc = ((x - 180) ** 2) / 11000 + ((y - 120) ** 2) / 5000 < 1;
  if (diagonal || arc) {
    image.bitmap.data[offset] = 32;
    image.bitmap.data[offset + 1] = 100;
    image.bitmap.data[offset + 2] = 71;
    image.bitmap.data[offset + 3] = 255;
  }
});
await image.writeAsync(path.join(directory, 'professor-demo-logo.png'));
image.setPixelColor(0xd2ff70ff, 8, 8);
await image.writeAsync(path.join(directory, 'professor-demo-logo-modified.png'));
image.setPixelColor(0xff8a70ff, 12, 8);
await image.writeAsync(path.join(directory, 'professor-demo-logo-unregistered.png'));
console.log(`Created professor demo fixtures in ${directory}`);
