import Fastify from 'fastify';
import { config } from 'dotenv';

config();
const server = Fastify({
  logger: true,
});

const port = Number(process.env.PORT) || 8000;

server.get('/api/v1/stories', async () => {
  return { message: 'Hello, World!' };
});

server.listen({ port }).catch((error) => {
  server.log.error(error);
  process.exit(1);
});
