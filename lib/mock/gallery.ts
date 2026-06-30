/**
 * Velora — Mock Gallery
 * -------------------------------------------------------------------
 * 6 foto dari picsum.photos. Seed per-slug supaya URL stabil
 * antar render (tidak berubah tiap request) sehingga `<img>`
 * tidak melakukan double-fetch di browser.
 */
export function getMockGallery() {
  const seed = "velora-sana-preview";
  return Array.from({ length: 6 }).map((_, i) => ({
    id: `mock-gallery-${i + 1}`,
    url: `https://picsum.photos/seed/${seed}-${i + 1}/800/800`,
    position: i,
  }));
}
