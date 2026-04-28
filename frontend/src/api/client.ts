const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;

if (!BACKEND_URL) {
  throw new Error("Backend URL missing. Set NEXT_PUBLIC_BACKEND_URL in .env");
}

export const buildApiUrl = (path: string) => {
  return BACKEND_URL + path;
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

  return BACKEND_URL + "/" + path;
};
