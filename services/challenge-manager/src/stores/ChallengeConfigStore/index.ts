import {Challenge} from '../../types/Challenge';

export interface ChallengeConfigStoreRepository {
  get(name: String): Promise<Challenge | null>;
}

export class ChallengeConfigStore {
  constructor(private repository: ChallengeConfigStoreRepository) {}

  async getChallenge(
    name: string,
    ignoreAvailableAt = false
  ): Promise<Challenge | null> {
    return this.repository.get(name).then(challenge => {
      if (!challenge) return null;

      if (
        (Math.floor(Date.now() / 1000) < challenge.available_at ||
          challenge.available_at === -1) &&
        !ignoreAvailableAt
      )
        return null;

      return challenge;
    });
  }
}
