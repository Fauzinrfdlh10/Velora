/**
 * Velora — Mock Wishes
 * -------------------------------------------------------------------
 * 5 ucapan dummy dengan timestamp terdistribusi (newest first).
 * Konten mencerminkan gaya wedding wish Indonesia — formal, slang,
 * panjang-pendek variatif — supaya layout section benar-benar teruji.
 */
export function getMockWishes() {
  const now = Date.now();
  const day = 1000 * 60 * 60 * 24;
  return [
    {
      id: "mock-wish-1",
      name: "Budi Santoso",
      message:
        "Selamat untuk Andi & Sari! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah. Ditunggu acaranya!",
      created_at: new Date(now - 1 * day).toISOString(),
    },
    {
      id: "mock-wish-2",
      name: "Rina Wijaya",
      message:
        "Akhirnya! 🥂 Selamat menempuh hidup baru. Semoga lancar sampai ke jenazeednya. Amin.",
      created_at: new Date(now - 2 * day).toISOString(),
    },
    {
      id: "mock-wish-3",
      name: "Dimas Pratama",
      message: "Congrats bro! Finally dapet juga nikahin doi yang dari SMA ditungguin.",
      created_at: new Date(now - 3 * day).toISOString(),
    },
    {
      id: "mock-wish-4",
      name: "Keluarga Besar Hartono",
      message:
        "Selamat atas pernikahan Andi & Sari. Semoga menjadi pasangan yang saling melengkapi dan dirahmati Allah SWT.",
      created_at: new Date(now - 5 * day).toISOString(),
    },
    {
      id: "mock-wish-5",
      name: "Maya Anggraini",
      message: "Bahagia selalu, cepet diberi momongan ya! Sukses untuk kalian berdua ✨",
      created_at: new Date(now - 7 * day).toISOString(),
    },
  ];
}
