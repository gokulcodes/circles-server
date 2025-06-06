import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    replyTo: { type: Schema.Types.ObjectId, ref: "Message" },
    roomId: { type: Schema.Types.ObjectId, ref: "ChatRoom", required: true },
    reaction: [{ type: String }],
  },
  { timestamps: true }
);
const Message = mongoose.model("Message", messageSchema);
export default Message;
