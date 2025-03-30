import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatar: { type: String, default: "/uploads/user.jpeg" },
    role: {
      type: String,
      enum: ["Admin", "Doctor", "Patient"],
      required: true,
    },
  },
  { discriminatorKey: "role", timestamps: true }
);

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", UserSchema);
export default User;
