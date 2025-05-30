<script lang="ts">
	import { ensureAuthenticated, user, logout } from '$lib/auth.svelte';
	import { page } from '$app/state';
	let { children } = $props();

	// This $effect runs when the component mounts and whenever isAuthenticated or $page.url changes.
	// It ensures that the user is authenticated to access pages under this layout.
	$effect(() => {
		ensureAuthenticated(page.url);
	});

	async function handleLogout() {
		await logout();
	}
</script>

{#if user()}
	<div class="min-h-screen bg-gray-900 text-gray-100">
		<nav class="bg-gray-800 p-4 shadow-lg">
			<div class="container mx-auto flex items-center justify-between">
				<a href="/" class="text-xl font-bold text-teal-400">CTF Challenges</a>
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
		<main>
			{@render children()}
		</main>
	</div>
{:else}
	<div class="flex min-h-screen items-center justify-center bg-gray-900 text-gray-100">
		<p class="animate-pulse text-xl text-yellow-400">Loading...</p>
	</div>
{/if}

<svelte:head>
	<script src="https://cdn.tailwindcss.com"></script>
</svelte:head>
