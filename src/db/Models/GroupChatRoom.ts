import mongoose, { Schema } from "mongoose";

const groupChatRoomSchema = new Schema(
  {
    name: { type: String, required: true },
    admins: [{ type: String, ref: "User", required: true }],
    members: [{ type: String, ref: "User", required: true }],
    isGroupChat: { type: Boolean, default: false },
    typingUsers: [{ type: String, ref: "User", unique: true }],
    onlineUsers: [{ type: String, ref: "User", unique: true }],
  },
  { timestamps: true }
);
const GroupChatRoom = mongoose.model("GroupChatRoom", groupChatRoomSchema);
export default GroupChatRoom;
