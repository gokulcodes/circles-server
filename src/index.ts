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
import mongoose from "mongoose";
import dotenv from "dotenv";
import { isUserAuthCheckRequired, verifyAuthToken } from "./utils/index.js";
dotenv.config();

const pubsub = new PubSub();
const PORT = 4000;
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

const MONGO_URI = process.env.MONGO_URI || "";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    await server.start();
    app.use(
      "/graphql",
      cors(),
      express.json(),
      expressMiddleware(server, {
        context: async ({ req }) => {
          if (isUserAuthCheckRequired(parse(req.body.query))) {
            // console.log("User auth check required", req.headers.authorization);
            const userEmail = await verifyAuthToken(
              req.headers.authorization as string
            );
            if (!userEmail || !req.headers.authorization) {
              throw new Error("Unauthorized");
            }
            return { pubsub, userEmail };
          }
          return { pubsub };
        },
      })
    );

    // app.get("/isAuthorized", async (req, res) => {
    //   const token = req.headers.authorization;
    //   if (!token) {
    //     return res.status(401).json({ error: "Unauthorized" });
    //   }
    //   const userEmail = await verifyAuthToken(token);
    //   if (!userEmail) {
    //     return res.status(401).json({ error: "Unauthorized" });
    //   }
    //   return res.status(200).json({ email: userEmail });
    // });

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
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });
