/** Extract a human-readable message from an admin API JSON body. */
export function readApiError(
  data: unknown,
  fallback: string,
  status?: number,
): string {
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.error === "string" && d.error.trim()) return d.error.trim();
    if (typeof d.message === "string" && d.message.trim()) return d.message.trim();
    if (d.error && typeof d.error === "object") {
      const inner = d.error as Record<string, unknown>;
      if (typeof inner.message === "string" && inner.message.trim()) {
        return inner.message.trim();
      }
    }
  }
  return status ? `${fallback} (HTTP ${status})` : fallback;
}

export async function readApiJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text.slice(0, 200) };
  }
}
