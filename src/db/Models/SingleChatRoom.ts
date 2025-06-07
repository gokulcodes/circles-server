import mongoose, { Schema } from "mongoose";

const singleChatRoomSchema = new Schema(
  {
    members: [{ type: String, ref: "User", required: true }],
  },
  { timestamps: true }
);
const ChatRoom = mongoose.model("SingleChatRoom", singleChatRoomSchema);
export default ChatRoom;
