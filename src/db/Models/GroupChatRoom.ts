import mongoose, { Schema } from "mongoose";

const groupChatRoomSchema = new Schema(
  {
    name: { type: String, required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    isGroupChat: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const ChatRoom = mongoose.model("GroupChatRoom", groupChatRoomSchema);
export default ChatRoom;
