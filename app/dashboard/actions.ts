"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server action untuk logout.
 *
 * signOut() akan menghapus session cookie dari browser (di-handle oleh
 * `setAll` di lib/supabase/server.ts). Setelah itu, redirect ke /login.
 *
 * Cukup dipanggil via <form action={logoutAction}>. Tidak perlu client
 * component, tidak butuh useTransition.
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
