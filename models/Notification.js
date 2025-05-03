// models/Notification.js
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  content: { type: String, required: true },
  contentFr: { type: String, required: true },
  to: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function (value) {
        return mongoose.Types.ObjectId.isValid(value) || value === "admin";
      },
      message: "Invalid recipient: must be a valid ObjectId or 'admin'.",
    },
  },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;
