import fastify, {FastifyInstance} from 'fastify';
import fp from 'fastify-plugin';
import {fastifyRequestContextPlugin} from '@fastify/request-context';
import {nanoid} from 'nanoid';
import * as strings from './strings';
import DeploymentRoute from './routes/deployment';
import {
  ChallengeConfigStore,
  ChallengeConfigStoreRepository,
} from './stores/ChallengeConfigStore';
import NodeCache from 'node-cache';
import {DeploymentsStore} from './stores/DeploymentsStore';
import {KubeConfig} from '@kubernetes/client-node';
import {
  API_DOMAIN,
  BASE_DOMAIN,
  CONTAINER_SECRET,
  NAMESPACE,
  REGISTRY_PREFIX,
} from './config';
import {
  asFunction,
  createContainer,
  AwilixContainer,
  InjectionMode,
  Lifetime,
} from 'awilix';
import {KubernetesRepository} from './stores/ChallengeConfigStore/KubernetesRepository';

interface Cradle {
  challengeConfigStore: ChallengeConfigStore;
  challengeConfigStoreCache: NodeCache;
  challengeConfigStoreRepository: ChallengeConfigStoreRepository;
  kubeClient: DeploymentsStore;
  kubeConfig: KubeConfig;
}

declare module 'fastify' {
  interface FastifyInstance {
    container: AwilixContainer<Cradle>;
  }
}

export const init = async () => {
  const server = fastify({
    logger: true,
    genReqId: req => (req.headers['request-id'] as string) || nanoid(),
  });

  // Load plugins
  server.register(fastifyRequestContextPlugin, {
    hook: 'preValidation',
    defaultStoreValues: {},
  });
  server.register(
    fp(async (server: FastifyInstance) => {
      const container: AwilixContainer<Cradle> = createContainer({
        injectionMode: InjectionMode.PROXY,
      });

      container.register({
        challengeConfigStore: asFunction(
          ({challengeConfigStoreRepository}) =>
            new ChallengeConfigStore(challengeConfigStoreRepository),
          {
            lifetime: Lifetime.SCOPED,
          }
        ),
        challengeConfigStoreRepository: asFunction(
          ({kubeConfig}) =>
            new KubernetesRepository(new NodeCache({stdTTL: 60}), kubeConfig),
          {
            lifetime: Lifetime.SCOPED,
          }
        ),
        kubeClient: asFunction(
          ({kubeConfig}) =>
            new DeploymentsStore(
              kubeConfig,
              API_DOMAIN,
              BASE_DOMAIN,
              NAMESPACE,
              REGISTRY_PREFIX,
              CONTAINER_SECRET
            ),
          {lifetime: Lifetime.SCOPED}
        ),
        kubeConfig: asFunction(
          () => {
            const cfg = new KubeConfig();
            cfg.loadFromDefault();
            return cfg;
          },
          {
            lifetime: Lifetime.SCOPED,
          }
        ),
      });

      server.decorate('container', container);
    })
  );

  server.route({
    method: 'GET',
    url: '/healthz',
    handler: async (_, reply) => {
      reply.send({status: true});
    },
  });

  server.setErrorHandler(async (error, request, reply) => {
    if (error.validation) {
      return reply.status(400).send({error: error.message});
    }
    request.log.error(error);

    reply.status(500).send({
      error: strings.ERROR_INTERNAL_SERVER_ERROR,
      trace: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  });

  server.register(DeploymentRoute, {prefix: '/deployments'});

  return server;
};
