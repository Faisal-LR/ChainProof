import Jimp from 'jimp';

const HASH_SIZE = 16;

/** A luminance average hash; intentionally used only for registered logos. */
export async function logoFingerprint(buffer) {
  const image = await Jimp.read(buffer);
  image.cover(HASH_SIZE, HASH_SIZE).greyscale();
  const values = [];
  for (let y = 0; y < HASH_SIZE; y += 1) {
    for (let x = 0; x < HASH_SIZE; x += 1) values.push(Jimp.intToRGBA(image.getPixelColor(x, y)).r);
  }
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.map((value) => (value >= average ? '1' : '0')).join('');
}

export function similarity(first, second) {
  if (!first || !second || first.length !== second.length) return 0;
  let equal = 0;
  for (let i = 0; i < first.length; i += 1) if (first[i] === second[i]) equal += 1;
  return Math.round((equal / first.length) * 100);
}
