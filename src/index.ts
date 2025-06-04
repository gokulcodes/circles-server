import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import typeDefs from "./typeDefs.js";
import resolvers from "./resolvers.js";

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 3000 },
});
console.log("Starting server: ", url);

// app.use(cors());
// app.use(express.json());

// app.use(
//   "/graphql", // Apply middleware only to the /graphql path
//   cors<cors.CorsRequest>(),
//   // Use express.json() for parsing application/json bodies
//   // If you're on an older Express version or prefer it, you can use `json()` from 'body-parser'
//   express.json(), // This is the middleware that populates req.body
//   expressMiddleware(server, {
//     context: async ({ req }) => ({ token: req.headers.token as string }),
//   })
// );

// const httpServer = http.createServer(app);
// app.get(
//   "/",
//   // cors<cors.CorsRequest>(),
//   // express.json(),
//   // (req, res) => {
//   //   res.setHeader("Content-Type", "text/event-stream");
//   //   res.setHeader("Cache-Control", "no-cache");
//   //   res.setHeader("Connection", "kee-alive");

//   //   // res.write("SSE Established");

//   //   let intervalId;
//   //   let count = 0;
//   //   intervalId = setInterval(() => {
//   //     res.write(`Counter: ${count}`);
//   //     count++;
//   //   }, 2000);

//   //   res.on("close", () => {
//   //     clearInterval(intervalId);
//   //     res.end();
//   //   });

//   //   // res.send("Circles");
//   // },
//   expressMiddleware(server)
// );

// httpServer.listen(3000);
