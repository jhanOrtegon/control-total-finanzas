import { createClient } from "@insforge/sdk";

// Load configuration from local project settings
const baseUrl = "https://9rcgjvgp.us-east.insforge.app";
const apiKey = "ik_871a8a1073f21d2925dd7b559f1f5d23";

export const insforge = createClient({
  baseUrl: baseUrl,
  anonKey: apiKey,
});
