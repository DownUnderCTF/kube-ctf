<script lang="ts">
  import { loginWithOIDC, user } from '$lib/auth.svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);

  $effect(() => {
    if (user()) {
      const redirectTo = page.url.searchParams.get('redirectTo') || '/'; // Default to home
      console.log('Already authenticated, redirecting from login to:', redirectTo);
      goto(redirectTo, { replaceState: true });
    }
  });

  async function handleLogin() {
    isLoading = true;
    errorMessage = null;
    try {
      await loginWithOIDC();
    } catch (error: any) {
      console.error('Login failed:', error);
      errorMessage = error.message || 'Login failed. Please try again.';
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Login - CTF Challenges</title>
</svelte:head>

<div
  class="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4 font-mono text-gray-100"
>
  <div class="w-full max-w-md rounded-lg bg-gray-800 p-8 shadow-2xl">
    <header class="mb-8 text-center">
      <h1 class="text-3xl font-bold text-teal-400">Challenges on Demand</h1>
      <p class="text-gray-400">Please log in to continue</p>
    </header>

    {#if errorMessage}
      <div class="mb-4 rounded-lg border border-red-500 bg-red-700 p-3 text-red-100">
        <p>{errorMessage}</p>
      </div>
    {/if}

    <button
      onclick={handleLogin}
      disabled={isLoading}
      class="focus:ring-opacity-75 w-full transform rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition duration-150 ease-in-out hover:scale-105 hover:bg-blue-500 focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:bg-gray-500"
    >
      {#if isLoading}
        Logging in...
      {:else}
        Login with OIDC
      {/if}
    </button>
  </div>
</div>
