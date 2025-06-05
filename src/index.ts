import http from "http";
import cors from "cors";
import express from "express";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";
import { PubSub } from "graphql-subscriptions";
import { ExecutionArgs, parse } from "graphql";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { makeExecutableSchema } from "@graphql-tools/schema";
import typeDefs from "./typeDefs.js";
import resolvers from "./resolvers.js";

const pubsub = new PubSub();
const PORT = 3000;
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
const app = express();
const httpServer = http.createServer(app);

const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

useServer(
  {
    schema,
    onSubscribe: async (_, __, payload) => {
      const args: ExecutionArgs = {
        schema,
        operationName: payload.operationName,
        document: parse(payload.query),
        variableValues: payload.variables,
        contextValue: { pubsub },
      };
      return args;
    },
  },
  wsServer
);

const server = new ApolloServer({
  schema,
});

await server.start();

app.use(
  "/graphql",
  cors(),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => {
      return { pubsub, token: req.headers.token as string };
    },
  })
);

app.get(
  "/eventstream",
  cors<cors.CorsRequest>(),
  express.json(),
  (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // res.write("SSE Established");

    let intervalId;
    let count = 0;
    intervalId = setInterval(() => {
      res.write(`Counter: ${count}`);
      count++;
    }, 2000);

    res.on("close", () => {
      clearInterval(intervalId);
      res.end();
    });

    // res.send("Circles");
  }
);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  console.log(`📡 Subscriptions ready at ws://localhost:${PORT}/graphql`);
});
