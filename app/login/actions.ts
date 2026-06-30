"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * State yang dikembalikan server action ke client component.
 * Success case di-handle via redirect (tidak di state).
 */
export interface LoginActionState {
  error: string | null;
}

/**
 * Login dengan email + password.
 *
 * Setelah berhasil, Supabase akan menulis session cookie ke response
 * (di-handle oleh `setAll` di lib/supabase/server.ts). Server action
 * lalu redirect ke /dashboard.
 *
 * Validasi client-side dilakukan via `required` di input form; di sini
 * kita tetap defensif untuk pesan error yang user-friendly.
 */
export async function loginAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
  const password = typeof passwordRaw === "string" ? passwordRaw : "";

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Map error Auth ke bahasa Indonesia. Lebih stabil: pakai HTTP status
    // + AuthError.code daripada string-matching pada pesan error, supaya
    // tahan terhadap perubahan copy antar versi Supabase.
    const status = (error as { status?: number }).status;
    const code = (error as { code?: string }).code;

    let message = "Login gagal. Coba lagi.";

    if (status === 400 || code === "invalid_credentials") {
      message = "Email atau password salah.";
    } else if (code === "email_not_confirmed") {
      message =
        "Email belum dikonfirmasi. Hubungi admin untuk aktivasi akun.";
    } else if (status === 422) {
      message = "Data login tidak valid. Periksa format email.";
    } else if (status === 429 || code === "too_many_requests") {
      message = "Terlalu banyak percobaan. Coba lagi beberapa menit.";
    } else if (status && status >= 500) {
      message = "Server sedang bermasalah. Coba lagi beberapa saat.";
    }

    return { error: message };
  }

  // Sukses: redirect akan melempar NEXT_REDIRECT dan Interceptor Next.js
  // menulis cookie session ke response.
  redirect("/dashboard");
}
