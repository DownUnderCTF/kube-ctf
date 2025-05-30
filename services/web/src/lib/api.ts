// src/lib/api.ts
import type { ChallengeInstance, InstanceApiResponse, TerminationApiResponse, StatusApiResponse } from './types';

// Replace with your actual API base URL
const API_BASE_URL = 'https://your-ctf-backend.example.com/api';

/**
 * Fetches the current status of an instance for a given challenge.
 * @param challengeId The ID of the challenge.
 * @returns A promise that resolves to the instance details or null if not found/error.
 */
export async function getInstanceStatus(challengeId: string): Promise<ChallengeInstance | null> {
  console.log(`Fetching instance status for challenge: ${challengeId}`);
  try {
    const response = await fetch(`${API_BASE_URL}/instances/${challengeId}/status`);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`No active instance found for challenge ${challengeId}.`);
        return null; // No instance exists, which is a valid state
      }
      const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
      throw new Error(errorData.message || `Failed to get instance status: ${response.statusText}`);
    }
    const data: StatusApiResponse = await response.json();
    if (data.success) {
      return data.instance;
    } else {
      // It could be that success is true but instance is null (e.g. no instance started yet)
      // If success is false, it implies an API-level error even if HTTP status was OK.
      console.warn(`API reported failure for getInstanceStatus: ${data.message}`);
      return data.instance; // return instance which could be null
    }
  } catch (error) {
    console.error('Error fetching instance status:', error);
    // Depending on how you want to handle this, you might rethrow or return a specific error object
    // For now, returning null to indicate failure or non-existence.
    return null;
  }
}

// Mock implementation for development/testing
export async function createInstance(challengeId: string): Promise<ChallengeInstance> {
  console.log(`[MOCK] Creating new instance for challenge: ${challengeId}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Create a fake instance response
  const mockInstance: ChallengeInstance = {
    id: `mock-${challengeId}-${Date.now()}`,
    challengeId: challengeId,
    status: 'RUNNING',
    urls: [
      `http://${challengeId}.example.com`,
      `ssh://user@${challengeId}.example.com`
    ],
    message: 'Mock instance created successfully',
    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    createdAt: new Date().toISOString(),
    lastRenewedAt: new Date().toISOString()
  };

  return mockInstance;
}

// Mock implementation for development/testing
export async function renewInstance(instanceId: string): Promise<ChallengeInstance> {
  console.log(`[MOCK] Renewing instance: ${instanceId}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Create a fake instance response
  const mockInstance: ChallengeInstance = {
    id: instanceId,
    challengeId: instanceId.split('-')[1], // Extract challengeId from mock instance ID
    status: 'RUNNING',
    urls: [
      `http://${instanceId.split('-')[1]}.example.com`,
      `ssh://user@${instanceId.split('-')[1]}.example.com`
    ],
    message: 'Mock instance renewed successfully',
    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    lastRenewedAt: new Date().toISOString()
  };

  return mockInstance;
}

// Mock implementation for development/testing
export async function terminateInstance(instanceId: string): Promise<{ message: string }> {
  console.log(`[MOCK] Terminating instance: ${instanceId}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    message: `Successfully terminated instance ${instanceId}`
  };
}
