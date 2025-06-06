const typeDefs = `#graphql

  type User {
    username: String
    email: String
    password: String
  }

  type Message {
    content: String
    roomId: String
    sender: String
  }

  type ChatRoom {
    _id: String
    name: String
    members: [String!]!
    isGroupChat: Boolean!
  }

  type MyFriends {
    username: String
    email: String
    roomId: String
  }

  type UserSignup{
    username: String!
    email: String!
    accessToken: String!
    refreshToken: String!
  }

  type Query {
    getAllUsers: [User!]!
    getUserByEmail(email: String!): User
    getChatRoomInfo(roomId: String!): ChatRoom
    getMessagesByRoom(roomId: String!): [Message!]!
    getAllChatRoomsByUser(email: String!): [ChatRoom!]!
  }

  type Mutation {
    userSignup(email: String!, password: String!, username: String!): UserSignup!
    userLogin(email: String!, password: String!): UserSignup!
    changePassword(email: String!, oldPassword: String!, newPassword: String!): UserSignup!
    updateAbout(email: String!, about: String!): User!
    deleteAccount(email: String!): String!

    makeFriendRequest(email: String!, friendEmail: String!): String!
    acceptFriendRequest(email: String!, friendEmail: String!): String!
    blockAUser(email: String!, userEmail: String!): String!
    unblockAUser(email: String!, userEmail: String!): String!

    sendMessage(content: String!, senderEmail: String!, roomId: String!, replyTo: ID): Message!
    sendReactionToMessage(
      messageId: ID!
      reaction: String!
      senderEmail: String!
    ): Message!

    deleteMessage(messageId: ID!, senderEmail: String!): String!
    clearHistory(roomId: String!, email: String!): String!
    updateLastSeen(email: String!): User!
    updateIsTyping(email: String!, isTyping: Boolean!): User!
    updateOnlineStatus(email: String!, isOnline: Boolean!): User!

    createGroupChatRoom(name: String!, members: [String!]!): ChatRoom!
    addFriendToGroupChat(roomId: String!, memberEmail: String!): ChatRoom!
    removeFriendFromGroupChat(roomId: String!, memberEmail: String!): ChatRoom!
    leaveGroupChat(roomId: String!, email: String!): ChatRoom!
    updateTypingCountInGroupChat(
      roomId: String!
      email: String!
      isTyping: Boolean!
    ): ChatRoom!
    updateOnlineStatusInGroupChat(
      roomId: String!
      email: String!
      isOnline: Boolean!
    ): ChatRoom!

    createChatRoom(name: String, members: [String!]!, isGroupChat: Boolean!): ChatRoom!
    addFriend(myId: String!, username: String!): User!
    # sendMessage(content: String!, sender: String!, roomId: String!): Message!
    onMessage(content: String, sender: String, roomId: String): Message
  }

  type Subscription {
    broadcast(roomId: String!): Message
  }

`;
export default typeDefs;
