import { createClient } from "@insforge/sdk";

const baseUrl =
  process.env.NEXT_PUBLIC_INSFORGE_URL ||
  "https://9rcgjvgp.us-east.insforge.app";

const apiKey =
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
  "ik_871a8a1073f21d2925dd7b559f1f5d23";

export const insforge = createClient({
  baseUrl,
  anonKey: apiKey,
});
