import { Datastore } from "@google-cloud/datastore";
import Cache from "node-cache";

const KIND = 'ctf-challenge-isolated';
const CACHE_TIMEOUT = 60;

export type Challenge = {
  name: string,
  expires: number,
  available_at: number,
  updated_at: number,
  type: string,
  template: string
};

class ChallengeConfigStore {
  constructor(private datastore: Datastore, private cache: Cache) {

  }

  async getChallenge(name: string, ignoreAvailableAt=false): Promise<Challenge | null> {
    let chal: (Challenge | null) = cache.get(name) as unknown as Challenge;
    if (!chal) {
      chal = await this._getChallenge(name, ignoreAvailableAt);
      cache.set(name, chal, CACHE_TIMEOUT);
    }
    return chal;
  }

  private async _getChallenge(name: string, ignoreAvailableAt: boolean): Promise<Challenge | null> {
    const query = this.datastore
      .createQuery(KIND)
      .filter('__key__', this.datastore.key([KIND, name]))
      .limit(1);

    const [results] = await this.datastore.runQuery(query);
    if (results.length !== 1) return null;

    if (
      (Math.floor(Date.now()/1000) < results[0].available_at || results[0].available_at === -1) &&
      !ignoreAvailableAt
    ) return null;
    
    return {
      name,
      expires: results[0].expires,
      type: results[0].type,
      template: results[0].template,
      updated_at: results[0].updated_at,
      available_at: results[0].available_at
    } as Challenge;
  }
}

const ds = new Datastore();
const cache = new Cache();
export default new ChallengeConfigStore(ds, cache);