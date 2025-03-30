import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    content: { type: String, required: true },
    status: { type: String, required: true },
    sender: {
      type: String,
      enum: ["patient", "admin"],
      default: "patient",
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", MessageSchema);
export default Message;
