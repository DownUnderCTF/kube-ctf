<script lang="ts">
  import { user, logout } from '$lib/auth.svelte';
  let { children } = $props();
  import '../app.css';

  async function handleLogout() {
    await logout();
  }
</script>

<div class="min-h-screen bg-gray-900 text-gray-100">
  <nav class="bg-gray-800 p-4 shadow-lg">
    <div class="container mx-auto flex items-center justify-between">
      <a href="/" class="text-xl font-bold text-teal-400">Challenge Instancer</a>
      {#if user()}
        <div class="flex items-center space-x-4">
          <span class="text-gray-300">Welcome, {user()?.username}!</span>
          <button
            onclick={handleLogout}
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition duration-150 ease-in-out hover:bg-red-500"
          >
            Logout
          </button>
        </div>
      {/if}
    </div>
  </nav>
  <div class="bg-yellow-400/80 p-2 text-center text-sm font-semibold text-red-800">
    IMPORTANT: This is a <b>NOT</b> the challenge. This will deploy an isolated instance of the challenge. Do not attempt to compromise this service.
  </div>
  <main>
    {@render children()}
  </main>
</div>
