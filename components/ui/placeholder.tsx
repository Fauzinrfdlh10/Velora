/**
 * Komponen placeholder untuk verifikasi setup.
 * Bisa dihapus setelah development fitur dimulai.
 */
export function Placeholder({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
