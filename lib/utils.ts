/**
 * Utilitas umum untuk project Velora.
 * Akan berkembang seiring kebutuhan.
 */

/**
 * Delay eksekusi selama ms millidetik.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format timestamp ke string lokal Indonesia.
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}
