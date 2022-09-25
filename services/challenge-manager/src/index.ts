import {HOST, PORT} from './config';
import {init} from './server';

const start = async () => {
  const server = await init();

  try {
    await server.listen({
      port: PORT,
      host: HOST,
    });
  } catch (err) {
    server.log.error(err);
    throw err;
  }
};

start();
