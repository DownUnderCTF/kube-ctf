// src/lib/types.ts

/**
 * Represents the possible statuses of a challenge instance.
 */
export type InstanceStatus = 'PENDING' | 'RUNNING' | 'TERMINATED' | 'ERROR' | 'UNKNOWN';

/**
 * Represents a CTF challenge instance.
 */
export interface ChallengeInstance {
  name: string;
  owner: string;
  host: string;
  expires: string;
}

/**
 * Generic API response structure for creation or status updates.
 */
export interface InstanceApiResponse {
  deployment: ChallengeInstance;
}

/**
 * API response for termination.
 */
export interface TerminationApiResponse {
  success: boolean;
  message: string;
}

/**
 * API response for getting status, might return null if no instance exists.
 */
export interface StatusApiResponse {
  deployment: ChallengeInstance;
}

/**
 * API response for getting all instances for a user.
 */
export interface InstancesApiResponse {
  deployments: ChallengeInstance[];
  error?: string;
}

/**
 * API response for getting OAuth details.
 */
export interface OAuthDetails {
  authorization_endpoint: string;
  client_id: string;
}
