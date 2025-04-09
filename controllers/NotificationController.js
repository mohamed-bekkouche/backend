import Notification from "../models/Notification.js";
import mongoose from "mongoose";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    let query = {
      to: new mongoose.Types.ObjectId(userId), // Convert string to ObjectId
    };
    const { read } = req.query;

    if (read !== undefined) {
      query.read = read === "true";
    }

    const notifications = await Notification.find(query).sort({
      createdAt: -1,
    });

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId } = req.body; // Require userId in request body

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    req.app.get("io").to(`user-${userId}`).emit("notification-read", {
      _id: notificationId,
      read: true,
    });

    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      { to: userId, read: false },
      { $set: { read: true } }
    );

    req.app.get("io").to(`user-${userId}`).emit("all-notifications-read");

    res.status(200).json({
      message: `${result.modifiedCount} notifications marked as read`,
      count: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
