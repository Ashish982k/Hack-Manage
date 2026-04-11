import { fetchFromApi } from "./client";

export const checkUserByEmail = (email: string) =>
  fetchFromApi(`/users/check?email=${encodeURIComponent(email)}`);
