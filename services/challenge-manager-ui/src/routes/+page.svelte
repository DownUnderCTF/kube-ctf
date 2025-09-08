<script lang="ts">
  import { getAllInstances } from '$lib/api';
    import { logout } from '$lib/auth.svelte';
  import type { ChallengeInstance } from '$lib/types';

  let instances = $state<ChallengeInstance[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    async function loadInstances() {
      isLoading = true;
      error = null;
      try {
        instances = await getAllInstances();
      } catch (err) {
        console.error('Failed to load instances:', err);
        // if (err instanceof Error && err.message === "Invalid credentials.") {
          // logout();
        // } else {
          // error = err instanceof Error ? err.message : 'Failed to load instances';
        // }
      } finally {
        isLoading = false;
      }
    }
    loadInstances();
  });

  function formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  }
</script>

<svelte:head>
  <title>Your Instances</title>
</svelte:head>

<div class="container mx-auto p-4 sm:p-6 lg:p-8">
  <div class="flex flex-col items-center justify-center text-center">
    <h1 class="mb-3 text-center text-4xl font-bold">Your Deployed Instances</h1>
    <span class="text-center text-sm text-gray-500"
      >This will show all challenge instances deployed by your team.</span
    >
  </div>

  {#if error}
    <div class="alert alert-error mb-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6 shrink-0 stroke-current"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <h3 class="font-bold">Error!</h3>
        <div class="text-xs">{error}</div>
      </div>
    </div>
  {/if}

  {#if isLoading}
    <div class="flex flex-col items-center justify-center gap-4 text-center">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="text-lg">Loading your instances...</p>
    </div>
  {:else if instances.length === 0 && !error}
    <div class="card bg-base-200">
      <div class="card-body items-center text-center">
        <h2 class="card-title">No Instances Found</h2>
        <p>You have not deployed any challenge instances yet.</p>
      </div>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each instances as instance (instance.host)}
        <a
          href="/{instance.name}"
          class="card card-compact bg-base-100 shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl"
        >
          <div class="card-body">
            <h2 class="card-title text-primary">{instance.name}</h2>
            <p class="flex items-center gap-2">
              Status:
              <span class="badge badge-success font-semibold"> RUNNING </span>
            </p>
            <p class="text-sm opacity-70">
              Expires in: {(() => {
                const now = new Date();
                const expires = new Date(instance.expires);
                const diff = expires.getTime() - now.getTime();

                if (diff <= 0) return 'Expired';

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                return `${hours}h ${minutes}m`;
              })()}
            </p>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
