import SingleChatRoom from "./db/Models/SingleChatRoom.js";
import Message from "./db/Models/Message.js";
import User from "./db/Models/User.js";
import jwt from "jsonwebtoken";
import {
  comparePasswords,
  createFriendRequest,
  hashPassword,
} from "./utils/index.js";
import FriendRequest from "./db/Models/FriendRequest.js";
import GroupChatRoom from "./db/Models/GroupChatRoom.js";
import type { Context } from "../types/index.js";
import { Schema, Types } from "mongoose";

const resolvers = {
  Query: {
    getAllUsers: async () => {
      const users = await User.find();
      if (!users) throw new Error("Users not found");
      return users;
    },
    getUserByEmail: async (_: unknown, __: unknown, context: Context) => {
      const user = await User.findOne({ email: context.userEmail });
      if (!user) throw new Error("User not found");
      return user;
    },
    getMessagesByRoom: async (_: unknown, args: { roomId: string }) => {
      const messages = await Message.find({ roomId: args.roomId });
      if (!messages) throw new Error("Messages not found");
      return messages;
    },
    getFriendInfoByEmail: async (_: unknown, args: { friendEmail: string }) => {
      const user = await User.findOne({ email: args.friendEmail });
      if (!user) throw new Error("Friend not found");
      return user;
    },
    getAllChatRoomsByUser: async (
      _: unknown,
      __: unknown,
      context: Context
    ) => {
      const user = await User.findOne({ email: context.userEmail });
      if (!user) throw new Error("User not found");
      const chatRooms = await SingleChatRoom.aggregate([
        {
          $match: {
            members: {
              $elemMatch: {
                email: context.userEmail,
              },
            },
          },
        },
        // {
        //   $addFields: {
        //     members: {
        //       $filter: {
        //         input: "$members",
        //         as: "member",
        //         cond: {
        //           $ne: ["$$member.email", context.userEmail],
        //         },
        //       },
        //     },
        //   },
        // },
      ]);
      if (!chatRooms?.length) throw new Error("Chat rooms not found");
      return chatRooms;
    },
    getAllFriendRequest: async (_: unknown, __: unknown, context: Context) => {
      const allRequest = await FriendRequest.aggregate([
        {
          $match: {
            $or: [
              { receiver: context.userEmail },
              { sender: context.userEmail },
            ],
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "receiver",
            foreignField: "email",
            as: "receiverInfo",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "sender",
            foreignField: "email",
            as: "senderInfo",
          },
        },
        { $unwind: { path: "$receiverInfo" } },
        { $unwind: { path: "$senderInfo" } },
      ]);
      return allRequest;
    },
  },
  // ChatRoom: {
  //   members: async (parent: any, _: unknown, context: Context) => {
  //     return await User.find({
  //       email: {
  //         $in: parent.members
  //           .filter((member: any) => member.email !== context.userEmail)
  //           .map((mem: any) => mem.email),
  //       },
  //     });
  //   },
  // },
  ChatRoomUserActivity: {
    user: async (parent: any, __: unknown, context: { userEmail: string }) => {
      // if (parent.email === context.userEmail) return;
      return await User.findOne({ email: parent.email });
    },
    isTyping: (parent: any) => {
      return parent.isTyping;
    },
  },
  User: {
    friends: (parent: any) => {
      return User.find({ _id: { $in: parent.friends } });
    },
    blockedUsers: (parent: any) => {
      return User.find({ _id: { $in: parent.blockedUsers } });
    },
  },
  Mutation: {
    userSignup: async (
      _: any,
      args: { email: string; password: string; username: string }
    ) => {
      try {
        const existingUser = await User.findOne({
          $or: [{ email: args.email }, { username: args.username }],
        });
        if (existingUser)
          throw new Error("User already exists with this email or username");
        const user = new User(args);
        // Hash password (assuming you have a method to hash passwords)
        user.password = await hashPassword(args.password);
        await user.save();
        await SingleChatRoom.create({
          members: [
            { email: user.email, isTyping: false },
            { email: process.env.CIRCLE_AI_EMAIL, isTyping: false },
          ],
        });
        return user;
      } catch (error: any) {
        throw new Error(`Signup failed: ${error.message}`);
      }
    },
    userLogin: async (_: any, args: { email: string; password: string }) => {
      try {
        const user = await User.findOne({ email: args.email });
        if (!user) throw new Error("User not found");
        // Validate password (assuming you have a method to compare passwords)
        const isValid = await comparePasswords(args.password, user.password);
        if (!isValid) throw new Error("Invalid password");
        // Generate JWT tokens
        const accessToken = jwt.sign(
          { userEmail: user.email },
          process.env.JWT_SECRET || "",
          {
            expiresIn: "1d",
          }
        );
        const refreshToken = jwt.sign(
          { userEmail: user.email },
          process.env.JWT_SECRET || "",
          {
            expiresIn: "7d",
          }
        );
        let response = { user: user.toObject(), accessToken, refreshToken };
        return response;
      } catch (error: any) {
        throw new Error(`Login failed: ${error.message}`);
      }
    },
    changePassword: async (
      _: any,
      args: { oldPassword: string; newPassword: string },
      context: Context
    ) => {
      try {
        const user = await User.findOne({ email: context.userEmail });
        if (!user) throw new Error("User not found");
        // Validate old password
        console.log(user);
        const isValid = await comparePasswords(args.oldPassword, user.password);
        if (!isValid) throw new Error("Invalid old password");
        // Hash new password
        user.password = await hashPassword(args.newPassword);
        await user.save();
        return user;
      } catch (error: any) {
        throw new Error(`Change password failed: ${error.message}`);
      }
    },
    updateAbout: async (_: any, args: { about: string }, context: Context) => {
      try {
        const user = await User.findOneAndUpdate(
          { email: context.userEmail },
          { about: args.about },
          { new: true, runValidators: true }
        );
        if (!user) throw new Error("User not found");
        await user.save();
        return user;
      } catch (error: any) {
        throw new Error(`Update about failed: ${error.message}`);
      }
    },
    deleteAccount: async (_: any, __: unknown, context: Context) => {
      try {
        const user = await User.findOneAndDelete({ email: context.userEmail });
        if (!user) throw new Error("User not found");
        return "Account deleted successfully";
      } catch (error: any) {
        throw new Error(`Delete account failed: ${error.message}`);
      }
    },
    makeFriendRequest: async (
      _: any,
      args: { friendEmail: string },
      context: Context
    ) => {
      try {
        const user = await User.findOne({ email: context.userEmail });
        if (!user) throw new Error("User not found");
        const friend = await User.findOne({ email: args.friendEmail });
        if (!friend) throw new Error("Friend not found");
        if (user.email === friend.email) {
          throw new Error("You can't add yourself as a friend");
        }
        // Create a friend request (you'll need to implement this)
        await createFriendRequest(user.email, friend.email);
        const allRequest = await FriendRequest.aggregate([
          {
            $match: {
              $or: [
                { receiver: context.userEmail },
                { sender: context.userEmail },
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "receiver",
              foreignField: "email",
              as: "receiverInfo",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "sender",
              foreignField: "email",
              as: "senderInfo",
            },
          },
          { $unwind: { path: "$receiverInfo" } },
          { $unwind: { path: "$senderInfo" } },
        ]);
        const { pubsub } = context;
        pubsub.publish(context.userEmail, {
          friendRequestActivities: allRequest,
        });
        const allFriendsRequest = await FriendRequest.aggregate([
          {
            $match: {
              $or: [
                { receiver: args.friendEmail },
                { sender: args.friendEmail },
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "receiver",
              foreignField: "email",
              as: "receiverInfo",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "sender",
              foreignField: "email",
              as: "senderInfo",
            },
          },
          { $unwind: { path: "$receiverInfo" } },
          { $unwind: { path: "$senderInfo" } },
        ]);
        pubsub.publish(args.friendEmail, {
          friendRequestActivities: allFriendsRequest,
        });
        return "Friend request sent";
      } catch (error: any) {
        throw new Error(`Make friend request failed: ${error.message}`);
      }
    },
    acceptFriendRequest: async (
      _: any,
      args: { friendEmail: string },
      context: Context
    ) => {
      try {
        const isFriendRequestExist = await FriendRequest.findOne({
          sender: args.friendEmail,
          receiver: context.userEmail,
        });
        if (!isFriendRequestExist) {
          throw new Error("Friend request does not exist");
        }
        // Remove the friend request
        await FriendRequest.deleteOne({
          sender: args.friendEmail,
          receiver: context.userEmail,
        });
        const user = await User.findOne({ email: context.userEmail });
        if (!user) throw new Error("User not found");
        const friend = await User.findOne({ email: args.friendEmail });
        if (!friend) throw new Error("Friend not found");
        // Logic to accept a friend request (you'll need to implement this)
        user.friends.push(friend.email);
        friend.friends.push(user.email);
        await user.save();
        await friend.save();
        // Optionally, create a chat room for the two users
        const chatRoom = await SingleChatRoom.findOne({
          members: { $all: [{ email: user.email }, { email: friend.email }] },
        });
        if (!chatRoom) {
          await SingleChatRoom.create({
            members: [
              { email: user.email, isTyping: false },
              { email: friend.email, isTyping: false },
            ],
          });
        }
        const allRequest = await FriendRequest.aggregate([
          {
            $match: {
              $or: [
                { receiver: context.userEmail },
                { sender: context.userEmail },
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "receiver",
              foreignField: "email",
              as: "receiverInfo",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "sender",
              foreignField: "email",
              as: "senderInfo",
            },
          },
          { $unwind: { path: "$receiverInfo" } },
          { $unwind: { path: "$senderInfo" } },
        ]);
        const { pubsub } = context;
        pubsub.publish(context.userEmail, {
          friendRequestActivities: allRequest,
        });
        const allFriendsRequest = await FriendRequest.aggregate([
          {
            $match: {
              $or: [
                { receiver: args.friendEmail },
                { sender: args.friendEmail },
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "receiver",
              foreignField: "email",
              as: "receiverInfo",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "sender",
              foreignField: "email",
              as: "senderInfo",
            },
          },
          { $unwind: { path: "$receiverInfo" } },
          { $unwind: { path: "$senderInfo" } },
        ]);
        pubsub.publish(args.friendEmail, {
          friendRequestActivities: allFriendsRequest,
        });
        return "Friend request accepted";
      } catch (error: any) {
        throw new Error(`Accept friend request failed: ${error.message}`);
      }
    },
    declineFriendRequest: async (
      _: any,
      args: { friendEmail: string },
      context: Context
    ) => {
      try {
        const isFriendRequestExist = await FriendRequest.findOne({
          sender: context.userEmail,
          receiver: args.friendEmail,
        });
        if (!isFriendRequestExist) {
          throw new Error("Friend request does not exist");
        }
        // Remove the friend request
        await FriendRequest.deleteOne({
          sender: context.userEmail,
          receiver: args.friendEmail,
        });
        const allRequest = await FriendRequest.aggregate([
          {
            $match: {
              $or: [
                { receiver: context.userEmail },
                { sender: context.userEmail },
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "receiver",
              foreignField: "email",
              as: "receiverInfo",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "sender",
              foreignField: "email",
              as: "senderInfo",
            },
          },
          { $unwind: { path: "$receiverInfo" } },
          { $unwind: { path: "$senderInfo" } },
        ]);
        const { pubsub } = context;
        pubsub.publish(context.userEmail, {
          friendRequestActivities: allRequest,
        });
        const allFriendsRequest = await FriendRequest.aggregate([
          {
            $match: {
              $or: [
                { receiver: args.friendEmail },
                { sender: args.friendEmail },
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "receiver",
              foreignField: "email",
              as: "receiverInfo",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "sender",
              foreignField: "email",
              as: "senderInfo",
            },
          },
          { $unwind: { path: "$receiverInfo" } },
          { $unwind: { path: "$senderInfo" } },
        ]);
        pubsub.publish(args.friendEmail, {
          friendRequestActivities: allFriendsRequest,
        });
        return "Friend request decline";
      } catch (error: any) {
        throw new Error(`Decline friend request failed: ${error.message}`);
      }
    },
    cancelFriendRequest: async (
      _: any,
      args: { friendEmail: string },
      context: Context
    ) => {
      try {
        const isFriendRequestExist = await FriendRequest.findOne({
          sender: context.userEmail,
          receiver: args.friendEmail,
        });
        if (!isFriendRequestExist) {
          throw new Error("Friend request does not exist");
        }
        // Remove the friend request
        await FriendRequest.deleteOne({
          sender: context.userEmail,
          receiver: args.friendEmail,
        });
        const allRequest = await FriendRequest.aggregate([
          {
            $match: {
              $or: [
                { receiver: context.userEmail },
                { sender: context.userEmail },
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "receiver",
              foreignField: "email",
              as: "receiverInfo",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "sender",
              foreignField: "email",
              as: "senderInfo",
            },
          },
          { $unwind: { path: "$receiverInfo" } },
          { $unwind: { path: "$senderInfo" } },
        ]);
        const { pubsub } = context;
        pubsub.publish(context.userEmail, {
          friendRequestActivities: allRequest,
        });
        const allFriendsRequest = await FriendRequest.aggregate([
          {
            $match: {
              $or: [
                { receiver: args.friendEmail },
                { sender: args.friendEmail },
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "receiver",
              foreignField: "email",
              as: "receiverInfo",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "sender",
              foreignField: "email",
              as: "senderInfo",
            },
          },
          { $unwind: { path: "$receiverInfo" } },
          { $unwind: { path: "$senderInfo" } },
        ]);
        pubsub.publish(args.friendEmail, {
          friendRequestActivities: allFriendsRequest,
        });
        return "Friend request cancelled";
      } catch (error: any) {
        throw new Error(`Cncel friend request failed: ${error.message}`);
      }
    },
    sendMessage: async (
      _: any,
      args: {
        content: string;
        roomId: string;
        replyTo?: string;
      },
      context: Context
    ) => {
      try {
        const sender = await User.findOne({ email: context.userEmail });
        if (!sender) throw new Error("Sender not found");
        const message = new Message({
          content: args.content,
          sender: sender.email,
          roomId: args.roomId,
          replyTo: args.replyTo,
        });
        await message.save();
        // Publish the message to the room's subscribers
        const chatRoom = await SingleChatRoom.findById(args.roomId);
        if (!chatRoom) throw new Error("Chat room not found");
        const { pubsub } = context;
        pubsub.publish(args.roomId, { broadcast: message });
        return message;
      } catch (error: any) {
        throw new Error(`Send message failed: ${error.message}`);
      }
    },
    sendReactionToMessage: async (
      _: any,
      args: {
        messageId: string;
        reaction: string;
      },
      context: Context
    ) => {
      try {
        const message = await Message.findById(args.messageId);
        if (!message) throw new Error("Message not found");
        const sender = await User.findOne({ email: context.userEmail });
        if (!sender) throw new Error("Sender not found");
        // Add reaction to the message
        let existingReactionAvailable = false,
          needToRemoveReaction = false;
        for (const reaction of message.reactions) {
          if (reaction.senderEmail === sender.email) {
            if (reaction.reactionString === args.reaction) {
              needToRemoveReaction = true;
              break;
            }
            reaction.reactionString = args.reaction;
            existingReactionAvailable = true;
            break;
          }
        }
        if (needToRemoveReaction) {
          // await Message.findByIdAndUpdate(args.messageId, {
          //   $pull: {
          //     reactions: {
          //       senderEmail: context.userEmail,
          //     },
          //   },
          // });
          message.reactions.pull({ senderEmail: context.userEmail });
          // console.log(needToRemoveReaction);
        } else if (!existingReactionAvailable) {
          message.reactions.push({
            senderEmail: sender.email,
            reactionString: args.reaction,
          });
        }
        await message.save();
        const updatedMessage = await Message.findById(args.messageId);
        if (!updatedMessage) throw new Error("Message not found");
        // Optionally, you can publish the updated message to subscribers
        const chatRoom = await SingleChatRoom.findById(updatedMessage.roomId);
        if (!chatRoom) throw new Error("Chat room not found");
        const { pubsub } = context as { pubsub: any };
        pubsub.publish(updatedMessage.roomId, { broadcast: updatedMessage });
        return updatedMessage;
      } catch (error: any) {
        throw new Error(`Send reaction failed: ${error.message}`);
      }
    },
    deleteMessage: async (
      _: any,
      args: { messageId: string },
      context: Context
    ) => {
      try {
        const message = await Message.findById(args.messageId);
        if (!message) throw new Error("Message not found");
        const sender = await User.findOne({ email: context.userEmail });
        if (!sender) throw new Error("Sender not found");
        // Check if the sender is the author of the message
        if (message.sender !== sender.email) {
          throw new Error("You can only delete your own messages");
        }
        // Delete the message
        await Message.findByIdAndDelete(args.messageId);
        // Optionally, you can publish a deletion event to subscribers
        const chatRoom = await SingleChatRoom.findById(message.roomId);
        if (!chatRoom) throw new Error("Chat room not found");
        const { pubsub } = context as { pubsub: any };
        pubsub.publish(message.roomId, {
          broadcast: { _id: args.messageId, deleted: true },
        });
        return "Message deleted successfully";
      } catch (error: any) {
        throw new Error(`Delete message failed: ${error.message}`);
      }
    },
    clearHistory: async (
      _: any,
      args: { roomId: string; senderEmail: string },
      context: Context
    ) => {
      try {
        const chatRoom = await SingleChatRoom.findById(args.roomId);
        if (!chatRoom) throw new Error("Chat room not found");
        const message = await Message.findOne({ roomId: args.roomId });
        // console.log(message);
        await Message.deleteMany({ roomId: args.roomId });
        const { pubsub } = context as { pubsub: any };
        pubsub.publish(chatRoom._id, {
          broadcast: message,
        });
        return "Chat history cleared successfully";
      } catch (error: any) {
        throw new Error(`Clear history failed: ${error.message}`);
      }
    },
    updateUserStatus: async (
      _: any,
      args: { isOnline: boolean; lastSeen: string },
      context: Context
    ) => {
      try {
        const lastSeenDate = new Date(parseInt(args.lastSeen));
        const user = await User.findOneAndUpdate(
          { email: context.userEmail },
          { isOnline: args.isOnline, lastSeen: lastSeenDate },
          { new: true }
        );
        if (!user) throw new Error("User not found");
        await user.save();
        const { pubsub } = context;
        pubsub.publish(user.email, { userActivityStatus: user });
        return user;
      } catch (error: any) {
        throw new Error(`Update online status failed: ${error.message}`);
      }
    },
    updateIsTyping: async (
      _: any,
      args: { roomId: string; isTyping: boolean },
      context: Context
    ) => {
      try {
        await SingleChatRoom.findOneAndUpdate(
          { _id: args.roomId, "members.email": context.userEmail },
          { $set: { "members.$.isTyping": args.isTyping } },
          { new: true }
        );
        const roomId = new Types.ObjectId(args.roomId); // make sure it’s an ObjectId
        const [room] = await SingleChatRoom.aggregate([
          { $match: { _id: roomId } },
          // {
          //   $set: {
          //     // or $project
          //     members: {
          //       $filter: {
          //         input: "$members",
          //         as: "member",
          //         cond: { $ne: ["$$member.email", context.userEmail] },
          //       },
          //     },
          //   },
          // },
        ]);
        // console.log(room);
        const { pubsub } = context;
        pubsub.publish(args.roomId, { roomActivity: room });
        return room;
      } catch (error: any) {
        throw new Error(`Update online status failed: ${error.message}`);
      }
    },
    createGroupChatRoom: async (
      _: any,
      args: { name: string; members: string[] },
      context: Context
    ) => {
      try {
        const chatRoom = new GroupChatRoom({
          name: args.name,
          admins: [context.userEmail],
          members: args.members,
          isGroupChat: true,
        });
        await chatRoom.save();
        return chatRoom;
      } catch (error: any) {
        throw new Error(`Create group chat room failed: ${error.message}`);
      }
    },
    addFriendToGroupChat: async (
      _: any,
      args: { roomId: string; friendEmail: string },
      context: Context
    ) => {
      try {
        const chatRoom = await GroupChatRoom.findById(args.roomId);
        if (!chatRoom) throw new Error("Chat room not found");
        if (!chatRoom.admins.includes(context.userEmail)) {
          throw new Error("Only admins can add members to this group chat");
        }
        const friend = await User.findOne({ email: args.friendEmail });
        if (!friend) throw new Error("Friend not found");
        // Add the friend to the group chat members
        if (chatRoom.members.includes(friend.email)) {
          throw new Error("Friend is already a member of this group chat");
        }
        chatRoom.members.push(friend.email);
        await chatRoom.save();
        return chatRoom;
      } catch (error: any) {
        throw new Error(`Add friend to group chat failed: ${error.message}`);
      }
    },
    removeFriendFromGroupChat: async (
      _: any,
      args: { roomId: string; friendEmail: string },
      context: Context
    ) => {
      try {
        const chatRoom = await GroupChatRoom.findById(args.roomId);
        if (!chatRoom) throw new Error("Chat room not found");
        if (!chatRoom.admins.includes(context.userEmail)) {
          throw new Error(
            "Only admins can remove members from this group chat"
          );
        }
        const friend = await User.findOne({ email: args.friendEmail });
        if (!friend) throw new Error("Friend not found");
        // Remove the friend from the group chat members
        if (!chatRoom.members.includes(friend.email)) {
          throw new Error("Friend is not a member of this group chat");
        }
        chatRoom.members = chatRoom.members.filter(
          (member) => member !== friend.email
        );
        await chatRoom.save();
        return chatRoom;
      } catch (error: any) {
        throw new Error(
          `Remove friend from group chat failed: ${error.message}`
        );
      }
    },
    leaveGroupChat: async (
      _: any,
      args: { roomId: string },
      context: Context
    ) => {
      try {
        const chatRoom = await GroupChatRoom.findById(args.roomId);
        if (!chatRoom) throw new Error("Chat room not found");
        const user = await User.findOne({ email: context.userEmail });
        if (!user) throw new Error("User not found");
        // Check if the user is a member of the group chat
        if (!chatRoom.members.includes(user.email)) {
          throw new Error("User is not a member of this group chat");
        }
        chatRoom.members = chatRoom.members.filter(
          (member) => member !== user.email
        );
        await chatRoom.save();
        return chatRoom;
      } catch (error: any) {
        throw new Error(`Leave group chat failed: ${error.message}`);
      }
    },
    updateTypingCountInGroupChat: async (
      _: any,
      args: { roomId: string; isTyping: boolean },
      context: Context
    ) => {
      try {
        const chatRoom = await GroupChatRoom.findById(args.roomId);
        if (!chatRoom) throw new Error("Chat room not found");
        const user = await User.findOne({ email: context.userEmail });
        if (!user) throw new Error("User not found");
        // Update typing status
        if (args.isTyping) {
          if (!chatRoom.typingUsers.includes(user.email)) {
            chatRoom.typingUsers.push(user.email);
          }
        } else {
          chatRoom.typingUsers = chatRoom.typingUsers.filter(
            (member) => member !== user.email
          );
        }
        await chatRoom.save();
        return chatRoom;
      } catch (error: any) {
        throw new Error(`Update typing count failed: ${error.message}`);
      }
    },
    updateOnlineStatusInGroupChat: async (
      _: any,
      args: { roomId: string; isOnline: boolean },
      context: Context
    ) => {
      try {
        const chatRoom = await GroupChatRoom.findById(args.roomId);
        if (!chatRoom) throw new Error("Chat room not found");
        const user = await User.findOne({ email: context.userEmail });
        if (!user) throw new Error("User not found");
        // Update online status
        if (args.isOnline) {
          if (!chatRoom.onlineUsers.includes(user.email)) {
            chatRoom.onlineUsers.push(user.email);
          }
        } else {
          chatRoom.onlineUsers = chatRoom.onlineUsers.filter(
            (member) => member !== user.email
          );
        }
        await chatRoom.save();
        return chatRoom;
      } catch (error: any) {
        throw new Error(`Update online status failed: ${error.message}`);
      }
    },
    // createUser: (
    //   _: unknown,
    //   args: { username: string; email: string; password: string }
    // ) => {
    //   const user = new User();
    //   user.username = args.username;
    //   user.email = args.email;
    //   user.password = args.password;
    //   return user.save();
    // },
    // addFriend: async (_: unknown, args: { myId: string; username: string }) => {
    //   const user = await User.findOne({ username: args.username });
    //   if (!user) throw new Error("User not found");
    //   const myAccount = await User.findById(args.myId);
    //   if (!myAccount) throw new Error("My account not found");
    //   myAccount.friends.push(user._id);
    //   const chatRoom = await SingleChatRoom.findOne({
    //     members: { $all: [user._id, myAccount._id] },
    //   });
    //   if (!chatRoom) {
    //     await SingleChatRoom.create({
    //       members: [user._id, myAccount._id],
    //     });
    //   }
    //   return myAccount.save();
    // },
    // sendMessage: async (
    //   _: unknown,
    //   args: { content: string; sender: string; roomId: string },
    //   context: Object
    // ) => {
    //   const message = await Message.create(args);
    //   const { pubsub } = context as { pubsub: any };
    //   pubsub.publish(args.roomId, { broadcast: message });
    //   return message;
    // },
    // onMessage: (
    //   _: unknown,
    //   args: { message: string; username: string; roomId: string },
    //   context: Object
    // ) => {
    //   const { pubsub } = context as { pubsub: any };
    //   pubsub.publish(args.roomId, { broadcast: args });
    //   return args;
    // },
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
        return pubsub.asyncIterableIterator([args.roomId]);
      },
    },
    userActivityStatus: {
      subscribe: (
        _: unknown,
        args: { email: string },
        context: { userEmail: string; pubsub: any }
      ) => {
        console.log("Subscription started for User Activity:", args.email);
        const { pubsub } = context;
        return pubsub.asyncIterableIterator([args.email]);
      },
    },
    roomActivity: {
      subscribe: (
        _: unknown,
        args: { roomId: string },
        context: { userEmail: string; pubsub: any }
      ) => {
        console.log("Subscription started for Room Activity:", args.roomId);
        const { pubsub } = context;
        return pubsub.asyncIterableIterator([args.roomId]);
      },
    },
    friendRequestActivities: {
      subscribe: (
        _: unknown,
        args: { email: string },
        context: { userEmail: string; pubsub: any }
      ) => {
        console.log(
          "Subscription started for Friend request Activity:",
          args.email
        );
        const { pubsub } = context;
        return pubsub.asyncIterableIterator([args.email]);
      },
    },
  },
};

export default resolvers;
