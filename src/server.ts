import 'graphql-import-node';
import Fastify from 'fastify';
import {
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  shouldRenderGraphiQL,
  sendResult,
  Request,
} from 'graphql-helix';
import { schema } from './schema';
import { contextFactory } from './context';
import { config } from 'dotenv';

config();
const server = Fastify({
  logger: true,
});

const port = Number(process.env.PORT) || 8000;

server.route({
  method: ['GET', 'POST'],
  url: '/api/v1/stories',
  async handler(req, res) {
    const request: Request = {
      headers: req.headers,
      method: req.method,
      query: req.query,
      body: req.body,
    };

    if (shouldRenderGraphiQL(request)) {
      res.type('text/html');
      res.send(renderGraphiQL({ endpoint: '/api/v1/stories' }));
      return;
    }

    const { operationName, query, variables } = getGraphQLParameters(request);
    const results = await processRequest({
      operationName,
      query,
      variables,
      schema,
      request,
      contextFactory,
    });

    sendResult(results, res.raw);
  },
});

server.listen({ port }).catch((error) => {
  server.log.error(error);
  process.exit(1);
});
