import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    about: { type: String, default: "" },
    profilePicture: { type: String, default: "" },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    // isTyping: { type: Boolean, default: false },
    blockedUsers: [{ type: String, ref: "User" }],
    friends: [{ type: String, ref: "User" }],
  },
  { timestamps: true }
);
const User = mongoose.model("User", userSchema);
export default User;
