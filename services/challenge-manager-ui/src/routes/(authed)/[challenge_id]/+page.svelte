<script lang="ts">
  import { page } from '$app/state'; // SvelteKit store for page data
  import type { ChallengeInstance, InstanceStatus } from '$lib/types';
  import { getInstanceStatus, createInstance, renewInstance, terminateInstance } from '$lib/api';
  import { user } from '$lib/auth.svelte';

  let challengeId = $derived(page.params.challenge_id);

  let instance = $state<ChallengeInstance | null>(null);
  let isLoading = $state<boolean>(false);
  let errorMessage = $state<string | null>(null);
  let userActionInProgress = $state<boolean>(false);

  let creatingInstance = $state<boolean>(false);

  $effect(() => {
    if (challengeId) {
      loadInstanceStatus(challengeId);
    }
  });

  async function loadInstanceStatus(currentChallengeId: string) {
    if (!currentChallengeId) return;
    isLoading = true;
    errorMessage = null;
    try {
      const status = await getInstanceStatus(currentChallengeId);
      instance = status;
      if (status) {
        console.log('Instance status loaded:', status);
      } else {
        console.log('No active instance found or an error occurred during fetch.');
      }
    } catch (e: any) {
      console.error('Failed to load instance status:', e);
      errorMessage = e.message || 'An unknown error occurred while fetching status.';
      instance = null; // Ensure instance is null on error
    } finally {
      isLoading = false;
    }
  }

  async function handleCreateInstance() {
    if (!challengeId || userActionInProgress) return;
    userActionInProgress = true;
    isLoading = true;
    creatingInstance = true;
    errorMessage = null;
    try {
      const newInstance = await createInstance(challengeId);
      // Delay to give time for container to spin up 
      // TODO remove this lol, #10x performance gains
      await new Promise(resolve => setTimeout(resolve, 5000));
      instance = newInstance.deployment;
    } catch (e: any) {
      errorMessage = e.message || 'Failed to create instance.';
    } finally {
      isLoading = false;
      userActionInProgress = false;
      creatingInstance = false;
    }
  }

  async function handleRenewInstance() {
    if (!instance || userActionInProgress) return;
    userActionInProgress = true;
    isLoading = true;
    errorMessage = null;
    try {
      const newInstance = await renewInstance(instance.name);
      instance = newInstance.deployment;
    } catch (e: any) {
      errorMessage = e.message || 'Failed to renew instance.';
    } finally {
      isLoading = false;
      userActionInProgress = false;
    }
  }

  async function handleTerminateInstance() {
    if (!instance || userActionInProgress) return;
    userActionInProgress = true;
    isLoading = true;
    errorMessage = null;
    try {
      await terminateInstance(instance.name);
      instance = null;
    } catch (e: any) {
      errorMessage = e.message || 'Failed to terminate instance.';
    } finally {
      isLoading = false;
      userActionInProgress = false;
      if (!errorMessage) {
        // If termination was successful, refresh status
        loadInstanceStatus(challengeId);
      }
    }
  }

  // Helper to format dates (optional)
  function formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  }

  // Derived state for UI logic
  let status = $state<InstanceStatus>('UNKNOWN');
  let canCreate = $derived(!instance && !errorMessage);
  let canRenew = $derived(instance && !errorMessage);
  let canTerminate = $derived(instance && !errorMessage);
</script>

<svelte:head>
  <title>{challengeId}</title>
</svelte:head>

<div class="bg-base-200 text-base-content flex min-h-screen flex-col items-center p-4">
  <div class="card bg-base-100 w-full max-w-2xl shadow-xl">
    <div class="card-body">
      <header class="mb-6 text-center">
        <h1 class="card-title text-primary text-3xl font-bold">{challengeId}</h1>
      </header>

      {#if isLoading }
        {#if !userActionInProgress}
          <div class="flex items-center justify-center">
            <span class="loading loading-spinner loading-lg text-warning"></span>
            <p class="text-warning ml-4 text-xl">Loading instance details...</p>
          </div>
         {/if}
         {#if creatingInstance}
          <div class="flex items-center justify-center">
            <span class="loading loading-spinner loading-lg text-info"></span>
            <p class="text-info ml-4 text-xl">Creating instance...</p>
          </div>
          {/if}
      {/if}

      {#if errorMessage}
        <div class="alert alert-error my-4">
          <span>
            <strong>Error:</strong>
            {errorMessage}
          </span>
        </div>
      {/if}

      {#if !isLoading || userActionInProgress}
        <div class="space-y-6">
          {#if instance}
            <div class="card bg-base-200 shadow">
              <div class="card-body">
                <h2 class="card-title text-info text-2xl">Instance Details</h2>
                <div class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <p>
                    <strong class="text-base-content">Status:</strong>
                    <span class="badge badge-success ml-1 font-semibold"> RUNNING </span>
                  </p>
                  <p>
                    <strong class="text-base-content">Expires At:</strong>
                    <span class="text-base-content">{formatDate(instance.expires)}</span>
                  </p>
                </div>

                <div class="mt-6">
                  <h3 class="text-info mb-2 text-xl font-semibold">Connection URL:</h3>
                  <ul class="bg-base-300 list-inside list-disc space-y-1 rounded p-3">
                    <a
                      href={`https://${instance.host}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="link link-info break-all">{instance.host}</a
                    >
                  </ul>
                </div>
              </div>
            </div>
          {/if}

          <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            {#if canCreate}
              <button
                onclick={handleCreateInstance}
                disabled={userActionInProgress || isLoading}
                class="btn btn-success w-full sm:w-auto"
              >
                {#if userActionInProgress && !instance}Creating...{:else}Create Instance{/if}
              </button>
            {/if}

            {#if canRenew}
              <button
                onclick={handleRenewInstance}
                disabled={userActionInProgress || isLoading}
                class="btn btn-info w-full sm:w-auto"
              >
                {#if userActionInProgress}Renewing...{:else}Renew Instance{/if}
              </button>
            {/if}

            {#if canTerminate}
              <button
                onclick={handleTerminateInstance}
                disabled={userActionInProgress || isLoading}
                class="btn btn-error w-full sm:w-auto"
              >
                {#if userActionInProgress}Terminating...{:else}Terminate Instance{/if}
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
