import type { PublicInvitationData } from "@/types/invitation";
import type { ThemeConfig } from "@/lib/themes/types";
import { ThemeInject } from "./theme-inject";
import { CoverSection } from "./sections/cover";
import { CountdownSection } from "./sections/countdown";
import { EventDetailsSection } from "./sections/event-details";
import { GallerySection } from "./sections/gallery";
import { RsvpPlaceholderSection } from "./sections/rsvp-placeholder";
import { AmplopPlaceholderSection } from "./sections/amplop-placeholder";
import { WishPlaceholderSection } from "./sections/wish-placeholder";

/**
 * Velora — Invitation Renderer (RSC)
 * -------------------------------------------------------------------
 * Komposisi akhir halaman undangan: inject theme CSS vars + render
 * semua section dalam urutan standar.
 *
 * Urutan section (TAHAP 5 — hardcoded):
 *   Cover → Countdown → Event → Gallery → RSVP → Amplop → Wish → Footer
 *
 * Untuk personalisasi per klien (mis. sembunyikan gallery untuk
 * paket basic, atau ubah order) — pindah ke per-client config di
 * prompt berikutnya.
 */
export function InvitationRenderer({
  slug,
  theme,
  data,
}: {
  slug: string;
  theme: ThemeConfig;
  data: PublicInvitationData;
}) {
  return (
    <main className="bg-canvas text-ink">
      <ThemeInject theme={theme} />

      <CoverSection theme={theme} data={data} />
      <CountdownSection theme={theme} data={data} />
      <EventDetailsSection
        slug={slug}
        theme={theme}
        data={data}
        guestName={data.guestName}
      />
      <GallerySection theme={theme} data={data} />
      <RsvpPlaceholderSection theme={theme} />
      <AmplopPlaceholderSection theme={theme} data={data} />
      <WishPlaceholderSection theme={theme} data={data} />

      <Footer theme={theme} />
    </main>
  );
}

/**
 * Footer signature sederhana — tema-aware dengan background inverse.
 * Sentris: brand "Velora" + tema aktif.
 */
function Footer({ theme }: { theme: ThemeConfig }) {
  return (
    <footer className="bg-inverseCanvas px-5 py-10 text-center text-inverseInk sm:px-8">
      <p className="text-[10px] uppercase tracking-[0.32em] opacity-70">
        dibuat dengan
      </p>
      <p className="font-display mt-2 text-lg">Velora</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.28em] opacity-60">
        undangan digital · tema {theme.displayName}
      </p>
    </footer>
  );
}
