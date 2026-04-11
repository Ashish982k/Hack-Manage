const DEFAULT_API_BASE_URL = "http://localhost:5000";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ??
  DEFAULT_API_BASE_URL;

const normalizePath = (path: string) => (path.startsWith("/") ? path : `/${path}`);

export const buildApiUrl = (path: string) => `${API_BASE_URL}${normalizePath(path)}`;

export const fetchFromApi = (path: string, init: RequestInit = {}) =>
  fetch(buildApiUrl(path), {
    credentials: "include",
    ...init,
  });

export const buildApiAssetUrl = (assetPath: string) => {
  const normalizedAssetPath = assetPath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${API_BASE_URL}/${normalizedAssetPath}`;
};
