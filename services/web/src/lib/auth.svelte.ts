// src/lib/auth.ts
import { goto } from '$app/navigation';

// Reactive state for authentication status
// We'll use localStorage to persist login state across sessions (simple example)
let userState = $state<{ username: string } | null>(null); // Basic user info

// Effect to update localStorage when user changes
// $effect(() => {
//       localStorage.setItem('user', JSON.stringify(userState));
// });

/**
 * Simulates logging in with "noCTF".
 * In a real app, this would redirect to noCTF, handle the callback, and get a token/session.
 */
export async function loginWithNoCTF(): Promise<void> {
  console.log('Simulating login with noCTF...');
  // Simulate an async operation
  await new Promise(resolve => setTimeout(resolve, 500));

  // Update auth state
  userState = { username: 'noCTFUser' }; // Mock user

  console.log('Login successful. User:', userState);

  // Redirect to a protected page, e.g., the last visited one or a default.
  // For simplicity, let's try to redirect to the root or a common challenge page.
  // SvelteKit's `goto` needs to be called from a component or load function usually.
  // Here, we'll rely on the layout to redirect to the intended page after login.
  // Or, if there's a 'redirectTo' query param, use that.
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTo = urlParams.get('redirectTo') || '/'; // Default to home or first challenge
  await goto(redirectTo, { replaceState: true });
}

/**
 * Logs the user out.
 */
export async function logout(): Promise<void> {
  console.log('Logging out...');
  userState = null;

  // Clear any auth-related storage
    localStorage.removeItem('user');
  // Redirect to login page
  await goto('/login', { replaceState: true });
}

/**
 * Call this in a load function or $effect to protect pages.
 * @param {URL} currentUrl - The current URL, used to pass as redirectTo after login.
 */
export function ensureAuthenticated(currentUrl?: URL): void {
  if (!userState) {
    console.log('User not authenticated. Redirecting to login.');
    const redirectToPath = currentUrl?.pathname && currentUrl.pathname !== '/login' ? `?redirectTo=${encodeURIComponent(currentUrl.pathname + currentUrl.search)}` : '';
    goto(`/login${redirectToPath}`, { replaceState: true });
  }
}

export function user(): { username: string } | null {
  return userState;
}
