const typeDefs = `#graphql
  type Book {
    title: String
    author: String
  }

  type User {
    username: String
    email: String
  }

  type Query {
    books: [Book]
  }

  type Mutation {
    updateBooks(title: String, author: String): [Book]
  }

  type Subscription {
    bookAdded: Book
  }

`;
export default typeDefs;
