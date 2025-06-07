import mongoose, { Schema } from "mongoose";

const FriendRequestSchema = new Schema({
  sender: {
    type: String,
    ref: "User",
    required: true,
  },
  receiver: {
    type: String,
    ref: "User",
    required: true,
  },
});
const FriendRequest = mongoose.model("FriendRequest", FriendRequestSchema);
export default FriendRequest;
