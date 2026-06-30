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
      <div className="mb-8 text-center">
        <Images
          size={28}
          aria-hidden="true"
          className="mx-auto mb-3 text-accent"
        />
        <h2 className="font-display text-2xl italic text-ink sm:text-3xl">
          Galeri
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
        {photos.map((p) => (
        <div key={p.id} className="aspect-square overflow-hidden bg-rule">
          {/* eslint-disable-next-line @next/next/no-img-element -- TODO Tahap 6: migrate to next/image + add picsum.photos + Supabase storage to next.config images.remotePatterns */}
          <img
            src={p.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
        ))}
      </div>
    </SectionShell>
  );
}
