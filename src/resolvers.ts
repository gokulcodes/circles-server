import type { Book } from "../types/index.js";

const books = [
  {
    title: "The Awakening",
    author: "Kate Chopin",
  },
  {
    title: "City of Glass",
    author: "Paul Auster",
  },
  {
    title: "The Awakening",
    author: "Kate Chopin",
  },
  {
    title: "City of Glass",
    author: "Paul Auster",
  },
];

const EVENT = "BOOK_ADDED";

const resolvers = {
  Query: {
    books: () => books,
  },
  Mutation: {
    updateBooks: (
      _: unknown,
      args: Book & { eventType: string },
      context: Object
    ) => {
      books.push({ title: args.title, author: args.author });
      const { pubsub } = context as { pubsub: any };
      pubsub.publish(EVENT, { bookAdded: args });
      return books;
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: (_: unknown, __: unknown, context: { pubsub: any }) => {
        const { pubsub } = context;
        pubsub.asyncIterableIterator([EVENT]);
        return pubsub;
      },
    },
  },
};

export default resolvers;
