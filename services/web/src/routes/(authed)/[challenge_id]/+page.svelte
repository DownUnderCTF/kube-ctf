<script lang="ts">
	import { page } from '$app/state'; // SvelteKit store for page data
	import type { ChallengeInstance, InstanceStatus } from '$lib/types';
	import { getInstanceStatus, createInstance, renewInstance, terminateInstance } from '$lib/api';

	// Get challenge_id from the URL parameters
	// In SvelteKit, $page.params is reactive
	let challengeId = $derived(page.params.challenge_id);

	let instance = $state<ChallengeInstance | null>(null);
	let isLoading = $state<boolean>(false);
	let errorMessage = $state<string | null>(null);
	let userActionInProgress = $state<boolean>(false); // To disable buttons during an action

	// Effect to load instance status when challengeId changes or component mounts
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
		errorMessage = null;
		try {
			const newInstance = await createInstance(challengeId);
			instance = newInstance;
			// If the instance creation is asynchronous on the backend (PENDING state),
			// you might want to start polling here or rely on WebSockets.
			// For now, we assume the API returns the final state or an initial PENDING state.
			if (newInstance.status === 'PENDING') {
				// Optionally start polling
				// pollInstanceStatus(newInstance.id, challengeId);
			}
		} catch (e: any) {
			errorMessage = e.message || 'Failed to create instance.';
		} finally {
			isLoading = false;
			userActionInProgress = false;
		}
	}

	async function handleRenewInstance() {
		if (!instance || !instance.id || userActionInProgress) return;
		userActionInProgress = true;
		isLoading = true;
		errorMessage = null;
		try {
			instance = await renewInstance(instance.id);
		} catch (e: any) {
			errorMessage = e.message || 'Failed to renew instance.';
		} finally {
			isLoading = false;
			userActionInProgress = false;
		}
	}

	async function handleTerminateInstance() {
		if (!instance || !instance.id || userActionInProgress) return;
		userActionInProgress = true;
		isLoading = true;
		errorMessage = null;
		try {
			await terminateInstance(instance.id);
			instance = null; // Set to null, or fetch status again to confirm termination
			// To be more robust, you might want to set a specific "TERMINATED" status locally
			// or call loadInstanceStatus(challengeId) to get the fresh state from backend.
			// For simplicity, setting to null to show the "Create" button again.
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
	let canCreate = $derived(
		!instance || instance.status === 'TERMINATED' || instance.status === 'IDLE'
	);
	let canRenew = $derived(instance?.status === 'RUNNING');
	let canTerminate = $derived(
		instance?.status === 'RUNNING' || instance?.status === 'PENDING' || instance?.status === 'ERROR'
	);

	// Polling example (basic, could be improved with exponential backoff, max retries etc.)
	// Not automatically started in this version, but shows how you might do it.
	/*
  async function pollInstanceStatus(instanceIdToPoll: string, challengeIdToPoll: string, interval = 5000, maxAttempts = 12) {
    let attempts = 0;
    isLoading = true; // Keep loading indicator while polling for PENDING
    const poller = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(poller);
        errorMessage = "Instance creation timed out. Please try again.";
        instance = { id: instanceIdToPoll, challengeId: challengeIdToPoll, status: 'ERROR', message: errorMessage };
        isLoading = false;
        userActionInProgress = false;
        return;
      }

      try {
        // Assuming getInstanceStatus can also fetch by instanceId if needed, or adapt API
        // For this example, we'll re-fetch by challengeId, assuming one active instance per challenge.
        const currentStatus = await getInstanceStatus(challengeIdToPoll);
        if (currentStatus && currentStatus.id === instanceIdToPoll && currentStatus.status !== 'PENDING') {
          instance = currentStatus;
          clearInterval(poller);
          isLoading = false;
          userActionInProgress = false;
        } else if (!currentStatus && instance?.id === instanceIdToPoll) {
          // Instance disappeared or error during polling
           instance = { id: instanceIdToPoll, challengeId: challengeIdToPoll, status: 'ERROR', message: "Instance status polling failed." };
           clearInterval(poller);
           isLoading = false;
           userActionInProgress = false;
        }
        // If still pending, the loop continues
      } catch (e) {
        console.error("Polling error:", e);
        // Potentially stop polling on certain errors
      }
    }, interval);
  }
  */
</script>

<svelte:head>
	<title>Challenge {challengeId}</title>
</svelte:head>

<div class="bg-base-200 text-base-content flex min-h-screen flex-col items-center p-4">
	<div class="card bg-base-100 w-full max-w-2xl shadow-xl">
		<div class="card-body">
			<header class="mb-6 text-center">
				<h1 class="card-title text-primary text-3xl font-bold">CTF Challenge</h1>
				<p class="text-base-content text-lg">
					ID: <span class="text-secondary font-semibold">{challengeId || 'Loading...'}</span>
				</p>
			</header>

			{#if isLoading && !userActionInProgress}
				<div class="flex items-center justify-center">
					<span class="loading loading-spinner loading-lg text-warning"></span>
					<p class="text-warning ml-4 text-xl">Loading instance details...</p>
				</div>
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
										<strong class="text-base-content">Instance ID:</strong>
										<span class="text-base-content">{instance.id}</span>
									</p>
									<p>
										<strong class="text-base-content">Status:</strong>
										<span
											class="badge ml-1 font-semibold"
											class:badge-success={instance.status === 'RUNNING'}
											class:badge-warning={instance.status === 'PENDING'}
											class:badge-error={instance.status === 'ERROR' ||
												instance.status === 'TERMINATED'}
											class:badge-neutral={instance.status === 'IDLE' ||
												instance.status === 'UNKNOWN'}
										>
											{instance.status}
										</span>
									</p>
									{#if instance.createdAt}
										<p>
											<strong class="text-base-content">Created At:</strong>
											<span class="text-base-content">{formatDate(instance.createdAt)}</span>
										</p>
									{/if}
									{#if instance.expiresAt}
										<p>
											<strong class="text-base-content">Expires At:</strong>
											<span class="text-base-content">{formatDate(instance.expiresAt)}</span>
										</p>
									{/if}
									{#if instance.lastRenewedAt}
										<p>
											<strong class="text-base-content">Last Renewed:</strong>
											<span class="text-base-content">{formatDate(instance.lastRenewedAt)}</span>
										</p>
									{/if}
								</div>

								{#if instance.message && (instance.status === 'ERROR' || instance.status === 'PENDING')}
									<div class="alert alert-info mt-4">
										<span>
											<strong>Message:</strong>
											{instance.message}
										</span>
									</div>
								{/if}

								{#if instance.status === 'RUNNING' && instance.urls && instance.urls.length > 0}
									<div class="mt-6">
										<h3 class="text-info mb-2 text-xl font-semibold">Connection URLs:</h3>
										<ul class="bg-base-300 list-inside list-disc space-y-1 rounded p-3">
											{#each instance.urls as url}
												<li>
													<a
														href={url}
														target="_blank"
														rel="noopener noreferrer"
														class="link link-info break-all">{url}</a
													>
												</li>
											{/each}
										</ul>
									</div>
								{/if}
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
								{#if userActionInProgress && instance?.status === 'RUNNING'}Renewing...{:else}Renew
									Instance{/if}
							</button>
						{/if}

						{#if canTerminate}
							<button
								onclick={handleTerminateInstance}
								disabled={userActionInProgress || isLoading}
								class="btn btn-error w-full sm:w-auto"
							>
								{#if userActionInProgress && (instance?.status === 'RUNNING' || instance?.status === 'PENDING')}Terminating...{:else}Terminate
									Instance{/if}
							</button>
						{/if}
					</div>
				</div>
			{/if}
			<footer class="text-base-content mt-8 text-center text-sm opacity-60">
				<p>Svelte 5 CTF Instance Manager</p>
			</footer>
		</div>
	</div>
</div>
