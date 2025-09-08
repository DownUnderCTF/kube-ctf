import fastify, { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { nanoid } from "nanoid";
import * as strings from "./strings";
import AuthRoute from "./routes/auth";
import DeploymentRoute from "./routes/deployment";
import {
  ChallengeConfigStore,
  ChallengeConfigStoreRepository,
} from "./stores/ChallengeConfigStore";
import NodeCache from "node-cache";
import { DeploymentsStore } from "./stores/DeploymentsStore";
import { KubeConfig } from "@kubernetes/client-node";
import {
  API_DOMAIN,
  BASE_DOMAIN,
  CONTAINER_SECRET,
  NAMESPACE,
  OIDC_CLIENT_ID,
  OIDC_SERVER_URL,
  REGISTRY_PREFIX,
} from "./config";
import {
  asFunction,
  createContainer,
  AwilixContainer,
  InjectionMode,
  Lifetime,
  asValue,
} from "awilix";
import { KubernetesRepository } from "./stores/ChallengeConfigStore/KubernetesRepository";
import { OIDCStore } from "./stores/OIDCStore";

interface Cradle {
  challengeConfigStore: ChallengeConfigStore;
  challengeConfigStoreCache: NodeCache;
  challengeConfigStoreRepository: ChallengeConfigStoreRepository;
  kubeClient: DeploymentsStore;
  kubeConfig: KubeConfig;
  oidcStore: OIDCStore;
}

declare module "fastify" {
  interface FastifyInstance {
    container: AwilixContainer<Cradle>;
  }
}

export const init = async () => {
  const server = fastify({
    logger: {
      level: process.env.NODE_ENV === "development" ? "debug" : "info",
    },
    genReqId: (req) => (req.headers["request-id"] as string) || nanoid(),
  });

  server.register(
    fp(async (server: FastifyInstance) => {
      const container: AwilixContainer<Cradle> = createContainer({
        injectionMode: InjectionMode.PROXY,
      });
      const oidcStore = new OIDCStore(OIDC_SERVER_URL, OIDC_CLIENT_ID);
      container.register({
        challengeConfigStore: asFunction(
          ({ challengeConfigStoreRepository }) =>
            new ChallengeConfigStore(challengeConfigStoreRepository),
          {
            lifetime: Lifetime.SCOPED,
          },
        ),
        challengeConfigStoreRepository: asFunction(
          ({ kubeConfig }) => new KubernetesRepository(kubeConfig),
          {
            lifetime: Lifetime.SCOPED,
          },
        ),
        kubeClient: asFunction(
          ({ kubeConfig }) =>
            new DeploymentsStore(
              kubeConfig,
              API_DOMAIN,
              BASE_DOMAIN,
              NAMESPACE,
              REGISTRY_PREFIX,
              CONTAINER_SECRET,
            ),
          { lifetime: Lifetime.SCOPED },
        ),
        kubeConfig: asFunction(
          () => {
            const cfg = new KubeConfig();
            cfg.loadFromDefault();
            return cfg;
          },
          {
            lifetime: Lifetime.SCOPED,
          },
        ),
        oidcStore: asValue(oidcStore),
      });

      server.decorate("container", container);
    }),
  );

  server.route({
    method: "GET",
    url: "/healthz",
    handler: async (_, reply) => {
      reply.send({ status: server.container.cradle.oidcStore.isReady() });
    },
  });

  server.setErrorHandler(async (error, request, reply) => {
    if (error.validation) {
      return reply.status(400).send({ error: error.message });
    }
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    request.log.error(error);

    reply.status(500).send({
      error: strings.ERROR_INTERNAL_SERVER_ERROR,
      trace: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  });

  server.register(AuthRoute, { prefix: "/auth" });
  server.register(DeploymentRoute, { prefix: "/deployments" });

  return server;
};
