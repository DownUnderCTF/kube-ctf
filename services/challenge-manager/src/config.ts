export const PORT = parseInt(process.env.PORT || '3000');
export const HOST =
  process.env.HOST ||
  (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
export const NAMESPACE = process.env.KUBECTF_NAMESPACE || 'default';
export const BASE_DOMAIN = process.env.KUBECTF_BASE_DOMAIN || 'example.com';
export const API_DOMAIN =
  process.env.KUBECTF_API_DOMAIN || `challenge-manager.${BASE_DOMAIN}`;
export const MAX_OWNER_DEPLOYMENTS =
  parseInt(process.env.KUBECTF_MAX_OWNER_DEPLOYMENTS ?? '0') || 0;

export const AUTH_SECRET = process.env.KUBECTF_AUTH_SECRET || 'keyboard-cat';
export const CONTAINER_SECRET =
  process.env.KUBECTF_CONTAINER_SECRET || 'keyboard-cat';
export const REGISTRY_PREFIX = process.env.KUBECTF_REGISTRY_PREFIX || '';
