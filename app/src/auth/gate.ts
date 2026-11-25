// Protected-path rule for the access gate (F1.AC7, F1.AC9).
// Pure functions only: no imports from db/, next/, iron-session or @node-rs/argon2.

const PUBLIC_PAGES = new Set<string>(["/login", "/register"]);

// Route handlers under /api/auth/* return 401 themselves, so the gate skips them.
const PUBLIC_API_PREFIX = "/api/auth/";

// Next.js build output for static files and the image optimiser.
const STATIC_ASSET_PREFIXES = ["/_next/static/", "/_next/image"];

export function isProtectedPath(pathname: string): boolean {
  if (PUBLIC_PAGES.has(pathname)) {
    return false;
  }
  if (pathname === "/api/auth" || pathname.startsWith(PUBLIC_API_PREFIX)) {
    return false;
  }
  for (const prefix of STATIC_ASSET_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return false;
    }
  }
  return true;
}

// `search` is the query string as it appears in the URL, including the leading "?" (or "" when absent).
export function loginRedirect(pathname: string, search: string): string {
  return `/login?next=${encodeURIComponent(pathname + search)}`;
}
