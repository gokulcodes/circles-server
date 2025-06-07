import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    sender: { type: String, ref: "User", required: true },
    content: { type: String, required: true },
    replyTo: { type: String, ref: "Message" },
    roomId: { type: String, ref: "ChatRoom", required: true },
    reactions: [
      {
        senderEmail: { type: String, ref: "User" },
        reactionString: { type: String },
      },
    ],
  },
  { timestamps: true }
);
const Message = mongoose.model("Message", messageSchema);
export default Message;
