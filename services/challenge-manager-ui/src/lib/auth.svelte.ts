// src/lib/auth.ts
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { decodeJwt } from 'jose';
import { getOAuthDetails } from './api';

// Reactive state for authentication status
// We'll use localStorage to persist login state across sessions (simple example)
let userState = $state<{ username: string; team: string, expiry: number } | null>(null); // Basic user info

// Load user state from localStorage on initialization
const storedUser = localStorage.getItem('id_token');
if (storedUser) {
  try {
    const claims = decodeJwt(storedUser);
    if (claims.exp && claims.exp < Date.now() / 1000) {
      console.log('ID Token expired');
      localStorage.removeItem('id_token');
      userState = null;
      goto('/login', { replaceState: true });
    }

    userState = { username: claims.name as string, team: claims.team as string, expiry: claims.exp as number };
  } catch (e) {
    console.error('Failed to parse stored user data:', e);
    userState = null;
  }
}

const redirectDomain = window.location.origin;
const redirectPath = '/oauth/callback';
const scope = 'openid';
const responseType = 'id_token token';

const localStorageStateKey = 'oauth_state';
const localStorageIdTokenKey = 'id_token';

export async function loginWithOIDC(): Promise<void> {
  // Get OAuth endpoint
  try {
    const oauthDetails = await getOAuthDetails();
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oauth_state', state);
    const oidcUrl = new URL(oauthDetails.authorization_endpoint);
    oidcUrl.searchParams.set('client_id', oauthDetails.client_id);
    oidcUrl.searchParams.set('redirect_uri', `${redirectDomain}${redirectPath}`);
    oidcUrl.searchParams.set('scope', scope);
    oidcUrl.searchParams.set('state', state);
    oidcUrl.searchParams.set('response_type', responseType);

    // Get current query paramteres
    const queryParams = new URLSearchParams(window.location.search);
    const redirectTo = queryParams.get('redirectTo');
    if (redirectTo) {
      localStorage.setItem('redirectTo', redirectTo);
    }

    window.location.href = oidcUrl.toString();
  } catch (e) {
    console.error('Failed to fetch OAuth details:', e);
    return;
  }
}



export function handleAuthCallback(): void {
  const hash = window.location.hash.slice(1);
  const hashParams = hash.split('&');

  const stateParam = hashParams.find((param) => param.startsWith('state='));
  if (!stateParam) {
    console.error('No state found in hash');
    goto('/login', { replaceState: true });
    return;
  }
  const stateParamValue = stateParam.split('=')[1];
  if (!validateState(stateParamValue)) {
    goto('/login', { replaceState: true });
    return;
  }
  localStorage.removeItem(localStorageStateKey);

  const idTokenParam = hashParams.find((param) => param.startsWith('id_token='));

  if (!idTokenParam) {
    console.error('No ID Token found in hash');
    goto('/login', { replaceState: true });
    return;
  }

  const idToken = idTokenParam.split('=')[1];

  const claims = decodeJwt(idToken);
  userState = { username: claims.name as string, team: claims.team as string, expiry: claims.exp as number };
  localStorage.setItem(localStorageIdTokenKey, idToken);

  const redirectTo = localStorage.getItem('redirectTo');
  if (redirectTo) {
    localStorage.removeItem('redirectTo');
    goto(redirectTo, { replaceState: true });
  } else {
    goto('/', { replaceState: true });
  }
}

function validateState(state: string): boolean {
  const storedState = localStorage.getItem(localStorageStateKey);
  if (!storedState) {
    console.error('No OAuth state found');
    return false;
  }
  if (storedState !== state) {
    console.error('State mismatch');
    return false;
  }
  localStorage.removeItem(localStorageStateKey);
  return true;
}

/**
 * Logs the user out.
 */
export async function logout(): Promise<void> {
  console.log('Logging out...');
  userState = null;

  localStorage.removeItem('id_token');
  await goto('/login', { replaceState: true });
}

/**
 * Call this in a load function or $effect to protect pages.
 * @param {URL} currentUrl - The current URL, used to pass as redirectTo after login.
 */
export function ensureAuthenticated(): void {
  if (!userState || userState.expiry < Date.now() / 1000) {
    userState = null;
    localStorage.removeItem('id_token');
    console.log('User not authenticated. Redirecting to login.');
    const redirectToPath =
      page.url.pathname && page.url.pathname !== '/login'
        ? `?redirectTo=${encodeURIComponent(page.url.pathname + page.url.search)}`
        : '';
    goto(`/login${redirectToPath}`, { replaceState: true });
  }
}

export function user(): { username: string; team: string } | null {
  return userState;
}
