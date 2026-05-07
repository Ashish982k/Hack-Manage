// BACKEND_URL is kept for asset URLs (Cloudinary images, etc.) which are
// absolute by nature and don't need to go through the proxy.
export const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  ""
).replace(/\/+$/, "");

/**
 * Build a URL for an API call.
 * Prefixes with /api so Next.js rewrites proxy the request to the Hono backend.
 * e.g. "/hackathons" → "/api/hackathons" → backend:5000/hackathons
 *
 * This avoids clashing with Next.js page routes (e.g. the /hackathons page
 * takes priority over a plain /hackathons rewrite).
 */
export const buildApiUrl = (path: string) => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `/api${cleanPath}`;
};

export const fetchFromApi = (path: string, init?: RequestInit) => {
  return fetch(buildApiUrl(path), {
    credentials: "include",
    ...init,
  });
};

export const buildApiAssetUrl = (path: string) => {
  if (path.startsWith("http") || path.startsWith("data:")) {
    return path;
  }

  // Asset paths (images, PDFs) still need the absolute backend URL
  return `${BACKEND_URL}/${path.replace(/^\/+/, "")}`;
};
