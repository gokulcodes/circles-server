import SingleChatRoom from "./db/Models/SingleChatRoom.js";
import Message from "./db/Models/Message.js";
import User from "./db/Models/User.js";

const resolvers = {
  Query: {
    getAllUsers: async () => await User.find(),
    getMessages: async (_: unknown, args: { roomId: string }) => {
      const messages = await Message.find({ roomId: args.roomId });
      if (!messages) throw new Error("Messages not found");
      return messages;
    },
    getChatRoom: async (_: unknown, args: { roomId: string }) => {
      const chatRoom = await SingleChatRoom.findById(args.roomId);
      return chatRoom;
    },
    getFriends: async (_: unknown, args: { myId: string }) => {
      const rooms = await SingleChatRoom.find({
        members: { $in: [args.myId] },
      });
      if (!rooms) throw new Error("rooms not found");
      console.log("rooms", rooms);
      return rooms;
    },
  },
  Mutation: {
    createUser: (
      _: unknown,
      args: { username: string; email: string; password: string }
    ) => {
      const user = new User();
      user.username = args.username;
      user.email = args.email;
      user.password = args.password;
      return user.save();
    },
    addFriend: async (_: unknown, args: { myId: string; username: string }) => {
      const user = await User.findOne({ username: args.username });
      if (!user) throw new Error("User not found");
      const myAccount = await User.findById(args.myId);
      if (!myAccount) throw new Error("My account not found");
      myAccount.friends.push(user._id);
      const chatRoom = await SingleChatRoom.findOne({
        members: { $all: [user._id, myAccount._id] },
      });
      if (!chatRoom) {
        await SingleChatRoom.create({
          members: [user._id, myAccount._id],
        });
      }
      return myAccount.save();
    },
    sendMessage: async (
      _: unknown,
      args: { content: string; sender: string; roomId: string },
      context: Object
    ) => {
      const message = await Message.create(args);
      const { pubsub } = context as { pubsub: any };
      pubsub.publish(args.roomId, { broadcast: message });
      return message;
    },
    onMessage: (
      _: unknown,
      args: { message: string; username: string; roomId: string },
      context: Object
    ) => {
      const { pubsub } = context as { pubsub: any };
      pubsub.publish(args.roomId, { broadcast: args });
      return args;
    },
  },
  Subscription: {
    broadcast: {
      subscribe: (
        _: unknown,
        args: { roomId: string },
        context: { pubsub: any }
      ) => {
        console.log("Subscription started for roomId:", args.roomId);
        const { pubsub } = context;
        // pubsub.asyncIterableIterator([args.roomId]);
        return pubsub.asyncIterableIterator([args.roomId]);
      },
    },
  },
};

export default resolvers;
