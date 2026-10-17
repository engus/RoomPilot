import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

/** Code-drawn herringbone, never sourced from a photograph. UVs are world metres. */
export function createWoodFloorTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#a68159'; ctx.fillRect(0, 0, 256, 256);
  const colors = ['#b8946d', '#c49e73', '#ad865d', '#c9a77e', '#b68c62'];
  // Interlocking perpendicular 4:1 planks, shown diagonally like the room floor.
  ctx.translate(128, 128); ctx.rotate(Math.PI / 4);
  for (let i = -8; i <= 8; i++) for (let j = -24; j <= 24; j++) {
    const x = i * 64 + j * 16, y = i * 64 - j * 16;
    ctx.fillStyle = colors[Math.abs(i + j) % colors.length]; ctx.fillRect(x + .5, y + .5, 63, 15);
    ctx.fillStyle = colors[Math.abs(i - j + 2) % colors.length]; ctx.fillRect(x + 64.5, y + .5, 15, 63);
    ctx.fillStyle = '#ead0a126'; ctx.fillRect(x + 3, y + 5, 58, 1); ctx.fillRect(x + 69, y + 3, 1, 58);
  }
  const texture = new CanvasTexture(canvas); texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(.65, .65); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4; return texture;
}
