import NodeCache from 'node-cache';
import {ChallengeConfigStore} from '.';
import {Challenge} from '../../types/Challenge';

describe('ChallengeConfigStore', () => {
  test('store returns challenge if it is available at current time', async () => {
    const now = Math.floor(Date.now() / 1000);
    const cache = new NodeCache();
    const challenge: Challenge = {
      name: 'test',
      expires: 0,
      available_at: now - 1000,
      updated_at: now - 1000,
      type: '',
      template: '',
    };
    const get = jest.fn().mockImplementation(() => Promise.resolve(challenge));

    const store = new ChallengeConfigStore({
      challengeConfigStoreCache: cache,
      challengeConfigStoreRepository: {
        get,
      },
    });

    expect(await store.getChallenge('test')).toEqual(challenge);
    expect(get).toHaveBeenCalledWith('test');
  });

  test('store returns null if it is not yet available', async () => {
    const now = Math.floor(Date.now() / 1000);
    const cache = new NodeCache();
    const challenge: Challenge = {
      name: 'test',
      expires: now - 1000,
      available_at: now + 1000,
      updated_at: now - 1000,
      type: '',
      template: '',
    };
    const get = jest.fn().mockImplementation(() => Promise.resolve(challenge));

    const store = new ChallengeConfigStore({
      challengeConfigStoreCache: cache,
      challengeConfigStoreRepository: {
        get,
      },
    });

    expect(await store.getChallenge('test')).toBeNull();
    expect(get).toHaveBeenCalledWith('test');
  });

  test('store returns null if upstream returns null', async () => {
    const cache = new NodeCache();
    const get = jest.fn().mockImplementation(() => Promise.resolve(null));

    const store = new ChallengeConfigStore({
      challengeConfigStoreCache: cache,
      challengeConfigStoreRepository: {
        get,
      },
    });

    expect(await store.getChallenge('test')).toBeNull();
    expect(get).toHaveBeenCalledWith('test');
  });

  test('store returns null if is not yet available but ignore flag is true', async () => {
    const now = Math.floor(Date.now() / 1000);
    const cache = new NodeCache();
    const challenge: Challenge = {
      name: 'test',
      expires: now - 1000,
      available_at: now + 1000,
      updated_at: now - 1000,
      type: '',
      template: '',
    };
    const get = jest.fn().mockImplementation(() => Promise.resolve(challenge));

    const store = new ChallengeConfigStore({
      challengeConfigStoreCache: cache,
      challengeConfigStoreRepository: {
        get,
      },
    });

    expect(await store.getChallenge('test', true)).toEqual(challenge);
    expect(get).toHaveBeenCalledWith('test');
  });

  test('store caches result for some time', async () => {
    const now = Math.floor(Date.now() / 1000);
    const cache = new NodeCache({
      stdTTL: 10,
    });
    const challenge: Challenge = {
      name: 'test',
      expires: now - 1000,
      available_at: now - 1000,
      updated_at: now - 1000,
      type: '',
      template: '',
    };
    const get = jest.fn().mockImplementation(() => Promise.resolve(challenge));

    const store = new ChallengeConfigStore({
      challengeConfigStoreCache: cache,
      challengeConfigStoreRepository: {
        get,
      },
    });

    expect(await store.getChallenge('test')).toEqual(challenge);
    expect(await store.getChallenge('test')).toEqual(challenge);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
