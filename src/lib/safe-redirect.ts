/** Hanya izinkan path internal aplikasi (bukan URL luar atau `//host`). */
export function safeRedirect(value: unknown): string | undefined {
  return typeof value === "string" && /^\/(?!\/)[\w\-/.~%]*$/.test(value) ? value : undefined;
}
