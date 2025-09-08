export const PORT = parseInt(process.env.PORT || "3000");
export const HOST =
  process.env.HOST ||
  (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
export const NAMESPACE =
  process.env.KUBECTF_NAMESPACE || "kubectf-challenges-isolated";
export const BASE_DOMAIN = process.env.KUBECTF_BASE_DOMAIN || "example.com";
export const API_DOMAIN =
  process.env.KUBECTF_API_DOMAIN || `challenge-manager.${BASE_DOMAIN}`;
export const MAX_OWNER_DEPLOYMENTS =
  parseInt(process.env.KUBECTF_MAX_OWNER_DEPLOYMENTS ?? "0") || 0;

export const AUTH_SECRET =
  process.env.KUBECTF_AUTH_SECRET ||
  "i-sure-hope-you-have-a-stronger-secret-in-prod";
export const CONTAINER_SECRET =
  process.env.KUBECTF_CONTAINER_SECRET ||
  "i-sure-hope-you-have-a-stronger-secret-in-prod";
export const REGISTRY_PREFIX = process.env.KUBECTF_REGISTRY_PREFIX || "";
export const OIDC_SERVER_URL = process.env.OIDC_SERVER_URL || "";
export const OIDC_OWNER_ID_FIELD =
  process.env.OIDC_OWNER_ID_FIELD || "noctf.dev/team_id";
export const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID || "";
export const REDIS_URL = process.env.REDIS_URL;
