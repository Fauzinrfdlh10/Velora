import type { PublicInvitationData } from "@/types/invitation";
import type { ThemeConfig } from "@/lib/themes/types";
import { SectionShell } from "../section-shell";
import { Images } from "../icons";

/**
 * Velora — Gallery Section (RSC)
 * -------------------------------------------------------------------
 * Grid foto dari `data.gallery` (filtered by position). Mobile 2-col,
 * desktop 3-col. Aspect-square. NO lightbox di tahap ini.
 *
 * Lazy-load `<img>` supaya tidak memblokir section lain di mobile.
 * Background `--rule` saat loading — tempat penampungan yang tidak
 * mencolok untuk skeleton state.
 */
export function GallerySection({
  theme,
  data,
}: {
  theme: ThemeConfig;
  data: PublicInvitationData;
}) {
  const photos = data.gallery;
  if (photos.length === 0) return null;

  return (
    <SectionShell theme={theme} id="gallery" ariaLabel="Galeri Foto">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rule/80 bg-surface/50 text-accent backdrop-blur-sm shadow-sm">
          <Images size={20} aria-hidden="true" />
        </div>
        <h2 className="font-display text-3xl font-semibold italic text-ink">
          Galeri Foto
        </h2>
        <p className="mt-2 text-[10px] uppercase tracking-[0.32em] text-muted">
          momen bahagia kami
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {photos.map((p, idx) => {
          // Alternating grid styling for premium editorial aesthetic
          const isLandscape = idx === 0 || idx === 5;
          const gridClasses = isLandscape
            ? "col-span-2 aspect-[16/10] md:col-span-2 shadow-sm"
            : "col-span-1 aspect-[3/4] shadow-sm";
          return (
            <div
              key={p.id}
              className={`relative overflow-hidden rounded-md bg-rule/40 border border-rule/45 transition duration-500 hover:scale-[1.01] hover:shadow-md ${gridClasses}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- TODO Tahap 6: migrate to next/image + add picsum.photos + Supabase storage to next.config images.remotePatterns */}
              <img
                src={p.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition duration-700 hover:scale-105"
              />
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
