import { HOST, PORT } from "./config";
import { init } from "./server";

const start = async () => {
  const server = await init();
  
  try {
    await server.listen(PORT, HOST);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();