import fastify, {FastifyInstance} from 'fastify';
import fp from 'fastify-plugin';
import {fastifyRequestContextPlugin} from 'fastify-request-context';
import {nanoid} from 'nanoid';
import * as strings from './strings';
import DeploymentRoute from './routes/deployment';
import {ChallengeConfigStore} from './stores/ChallengeConfigStore';
import {Datastore} from '@google-cloud/datastore';
import NodeCache from 'node-cache';
import {KubeClient} from './kube';
import {KubeConfig} from '@kubernetes/client-node';
import {API_DOMAIN, BASE_DOMAIN, CONTAINER_SECRET, NAMESPACE} from './config';
import {GoogleDatastoreRepository} from './stores/ChallengeConfigStore/GoogleDatastoreRepository';

declare module 'fastify' {
  interface FastifyInstance {
    challengeConfigStore: ChallengeConfigStore;
    kubeClient: KubeClient;
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
      const kc = new KubeConfig();
      kc.loadFromDefault();
      const datastore = new Datastore();

      server.decorate(
        'challengeConfigStore',
        new ChallengeConfigStore(
          new NodeCache({
            stdTTL: 60,
          }),
          new GoogleDatastoreRepository(datastore)
        )
      );

      server.decorate(
        'kubeClient',
        new KubeClient(kc, API_DOMAIN, BASE_DOMAIN, NAMESPACE, CONTAINER_SECRET)
      );
    })
  );

  server.setErrorHandler((error, request, reply) => {
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
