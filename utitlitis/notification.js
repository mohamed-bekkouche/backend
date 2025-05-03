// utils/notifications.js
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

export const sendNotification = async (contentEn, contentFr, to, io) => {
  try {
    // Validate inputs
    if (!contentEn || !contentFr || !to) {
      throw new Error("Content and recipient are required");
    }

    if (!io) {
      console.error("Socket.io instance not available");
      throw new Error("Real-time server not available");
    }

    // Create and save notification
    const newNotification = new Notification({
      contentEn,
      contentFr,
      to,
      read: false,
    });
    await newNotification.save();

    // Emit to the correct recipient
    const recipient = mongoose.Types.ObjectId.isValid(to)
      ? `user-${to}`
      : "admin-room";
    io.to(recipient).emit("new-notification", newNotification);

    console.log(`Notification emitted to ${recipient}`); // Debug log
    return newNotification;
  } catch (error) {
    console.error("Notification error:", {
      error: error.message,
      contentEn,
      to,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};
