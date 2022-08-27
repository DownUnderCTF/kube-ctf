import NodeCache from 'node-cache';
import {Challenge} from '../../types/Challenge';

export interface Repository {
  get(name: String): Promise<Challenge | null>;
}

export class ChallengeConfigStore {
  constructor(private cache: NodeCache, private repository: Repository) {}

  async getChallenge(
    name: string,
    ignoreAvailableAt = false
  ): Promise<Challenge | null> {
    let chal: Challenge | null = this.cache.get(name) as unknown as Challenge;
    if (!chal) {
      chal = await this._getChallenge(name, ignoreAvailableAt);
      this.cache.set(name, chal);
    }
    return chal;
  }

  private async _getChallenge(
    name: string,
    ignoreAvailableAt: boolean
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
