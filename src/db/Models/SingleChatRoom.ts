import mongoose, { Schema } from "mongoose";

const singleChatRoomSchema = new Schema(
  {
    members: [
      {
        email: {
          type: String,
          ref: "User",
          required: true,
        },
        isTyping: {
          type: Boolean,
        },
      },
    ],
  },
  { timestamps: true }
);
const ChatRoom = mongoose.model("SingleChatRoom", singleChatRoomSchema);
export default ChatRoom;
