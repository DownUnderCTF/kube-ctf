// src/lib/types.ts

/**
 * Represents the possible statuses of a challenge instance.
 */
export type InstanceStatus = 'IDLE' | 'PENDING' | 'RUNNING' | 'TERMINATED' | 'ERROR' | 'UNKNOWN';

/**
 * Represents a CTF challenge instance.
 */
export interface ChallengeInstance {
  id: string; // Unique identifier for the instance
  challengeId: string; // Identifier for the challenge type
  status: InstanceStatus;
  urls?: string[]; // URLs to connect to the instance (e.g., ['http://instance1.example.com', 'ssh://user@instance1.example.com'])
  message?: string; // Optional message, e.g., error details or status update
  expiresAt?: string; // ISO string for expiration date/time
  createdAt?: string; // ISO string for creation date/time
  lastRenewedAt?: string; // ISO string for last renewal
}

/**
 * Generic API response structure for creation or status updates.
 */
export interface InstanceApiResponse {
  success: boolean;
  instance?: ChallengeInstance;
  message?: string;
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
    success: boolean;
    instance: ChallengeInstance | null;
    message?: string;
}
