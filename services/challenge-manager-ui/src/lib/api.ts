// src/lib/api.ts
import { ensureAuthenticated } from './auth.svelte';
import type {
  ChallengeInstance,
  InstanceApiResponse,
  StatusApiResponse,
  InstancesApiResponse,
  OAuthDetails
} from './types';

async function fetchWithAuth(
  url: string,
  method: string,
  body?: any,
  headers?: Record<string, string>
) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Remote ${localStorage.getItem('id_token')}`,
      ...headers
    },
    method,
    body: JSON.stringify(body)
  });
  console.log('response', response);  
  if (response.status === 401) {
    console.error('Invalid Credentials.');
    ensureAuthenticated();
  }

  return response;
}

const API_BASE_URL = '/api';

/**
 * Fetches the current status of an instance for a given challenge.
 * @param challengeId The ID of the challenge.
 * @returns A promise that resolves to the instance details or null if not found/error.
 */
export async function getInstanceStatus(challengeId: string): Promise<ChallengeInstance | null> {
  console.log(`Fetching instance status for challenge: ${challengeId}`);
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/deployments/${challengeId}`, 'GET');
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`No active instance found for challenge ${challengeId}.`);
        return null; // No instance exists, which is a valid state
      }
      const errorData = await response
        .json()
        .catch(() => ({ message: `HTTP error ${response.status}` }));
      throw new Error(errorData.message || `Failed to get instance status: ${response.statusText}`);
    }
    const data: StatusApiResponse = await response.json();
    return data.deployment;
  } catch (error) {
    console.error('Error fetching instance status:', error);
    return null;
  }
}

export async function createInstance(instanceId: string): Promise<InstanceApiResponse> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/deployments/${instanceId}`,
    'POST',
    {},
    {
      'Content-Type': 'application/json'
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create instance: ${response.statusText}`);
  }

  return await response.json();
}

export async function renewInstance(instanceId: string): Promise<InstanceApiResponse> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/deployments/${instanceId}`,
    'POST',
    {
      renew: true
    },
    {
      'Content-Type': 'application/json'
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to renew instance: ${response.statusText}`);
  }

  return await response.json();
}

export async function terminateInstance(instanceId: string): Promise<{ message: string }> {
  const response = await fetchWithAuth(`${API_BASE_URL}/deployments/${instanceId}`, 'DELETE');

  if (!response.ok) {
    throw new Error(`Failed to terminate instance: ${response.statusText}`);
  }

  return await response.json();
}

export async function getAllInstances(): Promise<ChallengeInstance[]> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/deployments`, 'GET');
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: `HTTP error ${response.status}` }));
      throw new Error(errorData.error || `Failed to fetch instances: ${response.statusText}`);
    }

    const data: InstancesApiResponse = await response.json();

    // Check if the response contains an error field
    if (data.error) {
      throw new Error(data.error);
    }

    return data.deployments;
  } catch (error) {
    console.error('Error fetching all instances:', error);
    throw error; // Re-throw the error instead of returning empty array
  }
}

export async function getOAuthDetails(): Promise<OAuthDetails> {
  const response = await fetch(`${API_BASE_URL}/auth`);
  if (!response.ok) {
    throw new Error(`Failed to fetch OAuth details: ${response.statusText}`);
  }
  return await response.json();
}
