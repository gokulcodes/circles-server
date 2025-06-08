const typeDefs = `#graphql

  type User {
    username: String
    email: String
    about: String
    profilePicture: String
    isOnline: Boolean
    # isTyping: Boolean
    lastSeen: String
    friends: [MyFriends!]!
    blockedUsers: [String!]!
    createdAt: String
    updatedAt: String
  }

  type Reaction{
    senderEmail: String
    reactionString: String
  }

  type Message {
    _id: ID!
    content: String
    roomId: String
    sender: String
    createdAt: String
    updatedAt: String
    replyTo: ID
    reactions: [Reaction]
  }

  type ChatRoomUserActivity{
    user: User!
    isTyping: Boolean!
  }

  type ChatRoom {
    _id: String
    name: String
    members: [ChatRoomUserActivity!]!
    isGroupChat: Boolean!
  }

  type MyFriends {
    username: String
    email: String
    roomId: String
  }

  type UserAuthResponse{
    user: User!
    accessToken: String!
    refreshToken: String!
  }

  type FriendRequest {
    sender: String!
    receiver: String!
    senderInfo: User!
  }

  type Query {
    getAllUsers: [User!]!
    getUserByEmail: User
    getChatRoomInfo(roomId: String!): ChatRoom
    getMessagesByRoom(roomId: String!): [Message!]!
    getAllChatRoomsByUser: [ChatRoom!]!
    getAllFriendRequest: [FriendRequest]
  }

  type Mutation {
    userSignup(email: String!, password: String!, username: String!): User!
    userLogin(email: String!, password: String!): UserAuthResponse!
    changePassword(oldPassword: String!, newPassword: String!): User!
    updateAbout(about: String!): User!
    deleteAccount: String!

    makeFriendRequest(friendEmail: String!): String!
    acceptFriendRequest(friendEmail: String!): String!
    blockAUser(userEmail: String!): String!
    unblockAUser(userEmail: String!): String!

    sendMessage(content: String!, roomId: String!, replyTo: ID): Message!
    sendReactionToMessage(
      messageId: ID!
      reaction: String!
    ): Message!

    deleteMessage(messageId: ID!): String!
    clearHistory(roomId: String!): String!
    updateIsTyping(roomId: String!, isTyping: Boolean!): ChatRoom!
    updateUserStatus(isOnline: Boolean!, lastSeen: String!): User!

    createGroupChatRoom(name: String!, members: [String!]!): ChatRoom!
    addFriendToGroupChat(roomId: String!, memberEmail: String!): ChatRoom!
    removeFriendFromGroupChat(roomId: String!, memberEmail: String!): ChatRoom!
    leaveGroupChat(roomId: String!): ChatRoom!
    updateTypingCountInGroupChat(
      roomId: String!
      isTyping: Boolean!
    ): ChatRoom!
    updateOnlineStatusInGroupChat(
      roomId: String!
      isOnline: Boolean!
    ): ChatRoom!

    # createChatRoom(name: String, members: [String!]!, isGroupChat: Boolean!): ChatRoom!
    # addFriend(myId: String!, username: String!): User!
    # sendMessage(content: String!, sender: String!, roomId: String!): Message!
    # onMessage(content: String, sender: String, roomId: String): Message
  }

  type Subscription {
    broadcast(roomId: String!): Message
    userActivityStatus: User
    roomActivity(roomId: String!): ChatRoom
  }

`;
export default typeDefs;
