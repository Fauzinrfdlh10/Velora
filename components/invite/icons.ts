"use client";

/**
 * Velora — Invitation Icons
 * -------------------------------------------------------------------
 * Re-export select Phosphor icons yang dipakai section components.
 *
 * "use client" boundary: Phosphor v2.x mengekspor `IconContext` yang
 * memanggil `createContext` saat module evaluation. React 19 RSC
 * melarang `createContext` di server modules, jadi SELURUH import
 * chain Phosphor harus masuk client bundle. Dengan directive ini,
 * sections (RSC) yang import dari sini akan menerima client
 * reference ke icon component — icon di-render via SSR untuk HTML
 * awal, lalu di-hydrate di client. Bundle size impact minimal
 * (icon < 1kb each, tree-shaken).
 *
 * Tree-shaking: named imports seperti di bawah ini otomatis di-shake
 * oleh Next 15 webpack/turbopack — hanya ikon yang dipakai masuk bundle.
 *
 * Cara pakai:
 *   import { CalendarBlank, MapPin } from "@/components/invite/icons";
 *   <CalendarBlank size={20} weight="regular" aria-hidden="true" />
 */
export {
  ArrowDown,
  ArrowSquareOut,
  Bank,
  CalendarBlank,
  CheckCircle,
  Clock,
  Copy,
  Heart,
  Images,
  MapPin,
  PaperPlaneTilt,
  Question,
  Quotes,
  XCircle,
} from "@phosphor-icons/react";
