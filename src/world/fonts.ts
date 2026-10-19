import '@fontsource/alfa-slab-one';
import '@fontsource/oswald/600.css';
import '@fontsource/oswald/700.css';
import '@fontsource/lobster';
import '@fontsource/rye';
import '@fontsource/bebas-neue';

/** Sign textures are drawn on canvas, so the Google Fonts must be decoded before the town is built. */
export async function loadFonts(): Promise<void> {
  const faces = ['64px "Alfa Slab One"', '600 64px "Oswald"', '700 64px "Oswald"', '64px "Lobster"', '64px "Rye"', '64px "Bebas Neue"'];
  await Promise.all(faces.map((f) => document.fonts.load(f, 'ABC86')));
  await document.fonts.ready;
}
