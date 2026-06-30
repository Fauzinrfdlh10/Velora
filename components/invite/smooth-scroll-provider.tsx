"use client";

import { useEffect } from "react";

/**
 * Velora — Smooth Scroll Provider (Client Component)
 * -------------------------------------------------------------------
 * Orchestrator tunggal untuk:
 *   1. Lenis smooth scroll di seluruh halaman undangan publik.
 *   2. GSAP + ScrollTrigger sebagai backdrop animation layer.
 *   3. Sinkronisasi dua-duanya (Lenis `scroll` event → ScrollTrigger update;
 *      gsap ticker → drive Lenis RAF).
 *   4. Penghormatan `prefers-reduced-motion: reduce` — kalau aktif,
 *      skip Lenis DAN skip GSAP; sections tetap visible tanpa animasi.
 *   5. Smooth-scroll hijacking untuk anchor link in-page
 *      (`a[href^="#"]`) supaya `lenis.scrollTo` yang handle, bukan
 *      native `scrollIntoView` (yang bentrok dengan Lenis).
 *
 * Why ONE provider instead of per-section:
 *   - Section components di `components/invite/sections/*` sebagian
 *     besar adalah Server Components. Mempertahankan boundary itu
 *     mensyaratkan animasi layer dipisah — di-mount SATU KALI di
 *     sini, dengan selector `[id]` untuk menemukan tiap section yang
 *     sudah diberi `id` oleh SectionShell. Tidak perlu markup ekstra.
 *
 * Lifecycle & Strict-mode:
 *   - `useEffect` mount-and-cleanup pattern. React 19 strict-mode di
 *     dev akan double-invoke effect; cleanup() kita harus idempotent:
 *     kill semua ScrollTrigger, destroy Lenis, remove ticker fn, dan
 *     remove listener — semua aman dipanggil dua kali.
 *   - Module-level `cancelled` flag untuk dynamic-import race saat
 *     double-mount.
 *
 * Reduced motion:
 *   - `matchMedia` query live, dan kita tambahkan class
 *     `reduced-motion` ke `<html>` supaya consumers CSS-style bisa
 *     react (mis. `html.reduced-motion * { transition: none !important }`).
 *   - Lenis/GSAP TIDAK di-init sama sekali (bukan di-disable), supaya
 *     tidak ada placeholder hidden state dari `gsap.from()`.
 *
 * Caveat — Server-side:
 *   - Module ini ber-markah `"use client"` sehingga top-level imports
 *     di-handle Next.js sebagai client bundle. Vendor modules (gsap,
 *     lenis) yang menyentuh `window` dimuat via dynamic `import()`
 *     di dalam effect — supaya Server Component tree tetap aman
 *     walau modul ini transitively direferensikan dari RSC.
 */
export function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (reducedMotionQuery.matches) {
      // Reduced motion: catat di <html> untuk CSS opt-in; skip
      // Lenis/GSAP total supaya initial render tidak punya hidden
      // placeholder dari gsap.from().
      document.documentElement.classList.add("reduced-motion");
      return;
    }

    (async () => {
      // Dynamic imports — wajib. Top-level `import { gsap } from 'gsap'`
      // di file "use client" tetap dievaluasi saat modul di-load oleh
      // bundler; kalau modul ini direferensikan dari RSC, SSR-render
      // masih aman ("use client" jadi tidak subtree), tapi vendor
      // library ada yang menyentuh `window` saat module-evaluation
      // (GSAP v3 aman, Lenis v1 menyentuh `window`). Dynamic import
      // di effect menjamin tidak ada window access di SSR.
      const [{ default: gsap }, { ScrollTrigger }, { default: Lenis }] =
        await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
          import("lenis"),
        ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      // ---- 1. Lenis instance -------------------------------------------
      // `lerp: 0.1` (default) — halus tapi responsif di mobile. Kalau
      // terlalu berat di device low-end nanti, naikkan ke 0.15.
      const lenis = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
      });

      // Sinkronisasi Lenis → ScrollTrigger.
      lenis.on("scroll", ScrollTrigger.update);

      // Drive Lenis lewat gsap.ticker (satu RAF untuk semuanya).
      // `lagSmoothing(0)` nonaktifkan smoothing built-in gsap yang
      // bisa bentrok dengan smoothing Lenis.
      const tickFn = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tickFn);
      gsap.ticker.lagSmoothing(0);

      // ---- 2. Cover entrance (mounted-once, bukan scroll) -------------
      // First viewport — fade + slight Y dengan stagger antar
      // kicker → names → date/location → scroll-hint.
      const cover = document.getElementById("cover");
      if (cover) {
        const coverBlocks = cover.querySelectorAll<HTMLElement>(
          ":scope > div > div > *",
        );
        if (coverBlocks.length > 0) {
          gsap.fromTo(
            coverBlocks,
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
              ease: "power2.out",
              stagger: 0.12,
              delay: 0.15,
              clearProps: "transform",
            },
          );
        }
      }

      // ---- 3. Section enter animations --------------------------------
      // Untuk setiap <section id="..."> (kecuali #cover yang sudah
      // punya intro sendiri), fade-up section-inner saat masuk viewport.
      // Pakai `once: true` supaya tidak replay saat section discroll
      // keluar-masuk.
      const sections = gsap.utils.toArray<HTMLElement>("section[id]");
      for (const section of sections) {
        if (section.id === "cover") continue;
        // Inner container SectionShell: <section> > <div>
        const inner = section.querySelector<HTMLElement>(":scope > div");
        if (!inner) continue;
        gsap.fromTo(
          inner,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 85%",
              once: true,
            },
          },
        );
      }

      // ---- 4. Gallery stagger ----------------------------------------
      // Special case: photo items di section #gallery fade-in satu per
      // satu dengan stagger 0.08s. Selector pakai `data-gallery-item`
      // (attribute yang dipasang oleh `GallerySection` di tiap photo
      // div). Pendekatan ini lebih robust dari descendant query karena
      // tidak ikut mem-match section heading icon container (yang juga
      // ada di `<section> > div > div > div`).
      const gallerySection = document.getElementById("gallery");
      if (gallerySection) {
        const photos = gallerySection.querySelectorAll<HTMLElement>(
          "[data-gallery-item]",
        );
        if (photos.length > 0) {
          gsap.fromTo(
            photos,
            { opacity: 0, y: 18, scale: 0.985 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.7,
              ease: "power2.out",
              stagger: 0.08,
              scrollTrigger: {
                trigger: gallerySection,
                start: "top 80%",
                once: true,
              },
            },
          );
        }
      }

      // ---- 5. Anchor hijack -------------------------------------------
      // Intercept click pada `a[href^="#"]` dan route lewat Lenis.
      // `capture: true` supaya listener berjalan sebelum listener
      // default browser (yang akan pakai native scrollIntoView).
      const onClickCapture = (event: MouseEvent) => {
        if (event.defaultPrevented) return;
        const path = event.composedPath();
        const anchor = path.find(
          (el): el is HTMLAnchorElement =>
            el instanceof HTMLAnchorElement &&
            typeof el.getAttribute("href") === "string" &&
            el.getAttribute("href")!.startsWith("#"),
        );
        if (!anchor) return;
        const href = anchor.getAttribute("href")!;
        if (href.length <= 1) return; // bare "#" — skip
        const targetEl = document.getElementById(href.slice(1));
        if (!targetEl) return;
        event.preventDefault();
        lenis.scrollTo(targetEl, { offset: -40 });
      };
      document.addEventListener("click", onClickCapture, { capture: true });

      // Cleanup closure yang akan dipanggil saat unmount ATAU saat
      // double-mount strict-mode membatalkan init lama. Semua
      // pemanggilan di bawah ini idempotent.
      cleanup = () => {
        document.removeEventListener("click", onClickCapture, {
          capture: true,
        });
        gsap.ticker.remove(tickFn);
        lenis.destroy();
        ScrollTrigger.getAll().forEach((st) => st.kill());
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
      // Reduced-motion class dibersihkan saat unmount supaya halaman
      // berikutnya (mis. setelah navigasi) tidak mewarisi state statis.
      document.documentElement.classList.remove("reduced-motion");
    };
  }, []);

  return <>{children}</>;
}
