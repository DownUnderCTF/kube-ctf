import fastify from "fastify";
import { fastifyRequestContextPlugin } from "fastify-request-context";
import { nanoid } from "nanoid";
import * as strings from "./strings";
import DeploymentRoute from "./routes/deployment";

export const init = async () => {
  const server = fastify({
    logger: true,
    genReqId: (req) => req.headers['request-id'] as string || nanoid()
  });

  server.register(fastifyRequestContextPlugin, { 
    hook: 'preValidation',
    defaultStoreValues: {}
  });

  server.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      return reply.status(400).send({ error: error.message });
    }
    request.log.error(error);
    
    reply.status(500).send({
      error: strings.ERROR_INTERNAL_SERVER_ERROR,
      trace: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  });

  server.register(DeploymentRoute, { prefix: '/deployments' });

  return server;
};