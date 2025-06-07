import bcrypt from "bcrypt";
import FriendRequest from "../db/Models/FriendRequest.js";
import jwt from "jsonwebtoken";
import { DocumentNode } from "graphql";

async function verifyAuthToken(token: string): Promise<boolean> {
  // Function to verify the authentication token
  try {
    let decodedInfo = await jwt.verify(token, process.env.JWT_SECRET || "");
    decodedInfo = decodedInfo as { userEmail: string };
    if (!decodedInfo.userEmail) {
      throw new Error("Invalid token: userEmail not found");
    }
    return decodedInfo.userEmail;
  } catch (error) {
    console.error("Token verification failed:", error);
    return false;
  }
}

function isUserAuthCheckRequired(query: DocumentNode): boolean {
  // Function to check if user authentication is required for the given query
  let queryName: string | undefined;
  const def = query.definitions?.[0];
  if (def && "name" in def && def.name && typeof def.name.value === "string") {
    queryName = def.name.value;
  }
  const authNotRequired = ["userLogin", "userSignup", "IntrospectionQuery"];
  return !authNotRequired.some(
    (q: string) => queryName?.toLowerCase() === q.toLowerCase()
  );
}

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10; // Number of salt rounds (higher is more secure but slower)
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password, salt);
}

async function comparePasswords(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

async function createFriendRequest(senderEmail: string, receiverEmail: string) {
  // Function to create a friend request
  // Implementation goes here
  const alreadyRequestExist = await FriendRequest.findOne({
    sender: senderEmail,
    receiver: receiverEmail,
  });
  if (alreadyRequestExist) {
    throw new Error("Friend request already exists");
  }
  await FriendRequest.create({
    sender: senderEmail,
    receiver: receiverEmail,
  });
}

export {
  isUserAuthCheckRequired,
  verifyAuthToken,
  hashPassword,
  comparePasswords,
  createFriendRequest,
};
