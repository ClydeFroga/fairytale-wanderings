import * as mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  username: { type: String },
  phone: { type: String },
  registeredAt: { type: Date, default: Date.now },
  isAdmin: { type: Boolean, default: false },
});

export type IUser = mongoose.InferSchemaType<typeof userSchema>;
export const User = mongoose.model("User", userSchema);
