const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ?? process.env.BACKEND_URL?.trim();

if (!backendUrl) {
  throw new Error(
    "NEXT_PUBLIC_BACKEND_URL is not configured. Set BACKEND_URL in frontend/.env.",
  );
}

export const BACKEND_URL = backendUrl.replace(/\/+$/, "");

const normalizePath = (path: string) =>
  path.startsWith("/") ? path : `/${path}`;

export const buildApiUrl = (path: string) =>
  `${BACKEND_URL}${normalizePath(path)}`;

export const fetchFromApi = (path: string, init: RequestInit = {}) =>
  fetch(buildApiUrl(path), {
    credentials: "include",
    ...init,
  });

export const buildApiAssetUrl = (assetPath: string) => {
  const normalizedInput = assetPath.trim();

  if (
    /^https?:\/\//i.test(normalizedInput) ||
    normalizedInput.startsWith("data:")
  ) {
    return normalizedInput;
  }

  const normalizedAssetPath = normalizedInput.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${BACKEND_URL}/${normalizedAssetPath}`;
};
