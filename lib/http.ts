/** Todas las rutas de /api/* devuelven `{ error: "mensaje en español" }`
 * en las respuestas que fallan (ver app/api/**\/route.ts) — este helper
 * es el único lugar que sabe leer eso, para no repetir el mismo
 * try/catch de parseo en cada componente que llama a fetch(). */
export async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}) as { error?: string });
  return data.error || fallback;
}
