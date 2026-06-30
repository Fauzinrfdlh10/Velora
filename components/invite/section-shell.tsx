import type { ThemeConfig } from "@/lib/themes/types";

/**
 * Velora — Section Shell
 * -------------------------------------------------------------------
 * Wrapper konsisten untuk setiap section di halaman undangan:
 *   - Padding vertikal seragam (theme.tokens.spacing.sectionPaddingY)
 *   - Container max-width (theme.tokens.spacing.containerMaxWidth)
 *   - Background variant (`canvas` light | `inverse` dark)
 *   - Horizontal padding responsif (px-5 mobile, sm:px-8)
 *
 * Tujuan: section components tidak perlu mengatur ulang vertical
 * spacing dan centering di tiap tempat. Cukup bungkus children
 * dengan SectionShell dan fokus pada content.
 *
 * Tidak menyebabkan hydration mismatch karena semua nilai style
 * inline berasal dari `theme.tokens` yang stabil per theme.
 */
export function SectionShell({
  theme,
  variant = "canvas",
  children,
  id,
  ariaLabel,
  className,
}: {
  theme: ThemeConfig;
  variant?: "canvas" | "inverse";
  children: React.ReactNode;
  id?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const bg = variant === "inverse" ? "bg-inverseCanvas text-inverseInk" : "bg-canvas text-ink";
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={`${bg} px-5 sm:px-8 ${className ?? ""}`}
      style={{
        paddingTop: theme.tokens.spacing.sectionPaddingY,
        paddingBottom: theme.tokens.spacing.sectionPaddingY,
      }}
    >
      <div
        className="mx-auto"
        style={{ maxWidth: theme.tokens.spacing.containerMaxWidth }}
      >
        {children}
      </div>
    </section>
  );
}
