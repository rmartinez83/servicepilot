/**
 * Read returnTo from search params. Returns a path only (starts with /, not //)
 * to avoid open redirects. Use for Back / Cancel / Save navigation.
 */
export function getReturnTo(searchParams: URLSearchParams | ReadonlyURLSearchParams | null): string | null {
  if (!searchParams) return null;
  const r = searchParams.get("returnTo");
  if (!r || !r.startsWith("/") || r.startsWith("//")) return null;
  return r;
}

/** Append returnTo to a path for links (e.g. Edit, Customer). */
export function withReturnTo(path: string, returnTo: string | null): string {
  if (!returnTo) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}returnTo=${encodeURIComponent(returnTo)}`;
}
