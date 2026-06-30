import type { BankAccount } from "@/types/database";

/**
 * Velora — Mock Bank Accounts
 * -------------------------------------------------------------------
 * 2 rekening dummy untuk section "Amplop Digital Placeholder".
 * Bentuk sesuai dengan type `BankAccount` (kolom jsonb
 * `clients.bank_accounts` di DB). TIDAK berisi nomor rekening
 * nyata — hanya untuk visual.
 */
export function getMockBankAccounts(): BankAccount[] {
  return [
    {
      bank: "BCA",
      account_name: "Andi Saputra",
      account_number: "1234567890",
      notes: "a/n pengantin pria",
    },
    {
      bank: "Mandiri",
      account_name: "Sari Wulandari",
      account_number: "9876543210",
      notes: "a/n pengantin wanita",
    },
  ];
}
