import { Server } from "socket.io";
import Message from "./models/Message.js";
import Notification from "./models/Notification.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.ORIGIN || "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT"],
    },
  });

  const activeConversations = new Map();
  const userSockets = new Map();
  const adminRoom = "admin-room";

  io.on("connection", (socket) => {
    socket.on("register-user", (userId) => {
      userSockets.set(userId.toString(), socket.id);

      socket.join(`user-${userId}`);

      // Join message rooms if needed
      if (userId !== "admin") {
        socket.join(`patient-${userId}`);
      }
    });

    // Message handling
    socket.on("patient-join", (patientId) => {
      socket.join(`patient-${patientId}`);
    });

    socket.on("admin-join", ({ adminId, patientId }) => {
      activeConversations.set(adminId, patientId);
      socket.join(`admin-${adminId}`);
      socket.join(`conversation-${patientId}`);
    });

    socket.on("send-message", async (data) => {
      try {
        const newMessage = new Message({
          patientId: data.patientId,
          content: data.content,
          status: "delivered",
          sender: data.senderType,
        });
        await newMessage.save();

        io.to(`conversation-${data.patientId}`).emit("new-message", {
          ...data,
          createdAt: newMessage.createdAt,
        });

        if (data.shouldNotify) {
          const notificationData = {
            content: `New message from ${data.senderType}`,
            contentFr: `Nouveau message de ${data.senderType}`,
            to: data.senderType === "admin" ? data.patientId : "admin",
          };
          io.emit("send-notification", notificationData);
        }
      } catch (error) {
        console.error("Error handling message:", error);
      }
    });

    socket.on("send-notification", async (notificationData) => {
      try {
        const newNotification = new Notification({
          content: notificationData.content,
          contentFr: notificationData.contentFr,
          to: notificationData.to,
          read: false,
        });

        await newNotification.save();

        if (mongoose.Types.ObjectId.isValid(notificationData.to)) {
          io.to(`user-${notificationData.to}`).emit(
            "new-notification",
            newNotification
          );
        } else if (notificationData.to === "admin") {
          io.to(adminRoom).emit("new-notification", newNotification);
        }
      } catch (error) {
        console.error("Notification error:", error);
      }
    });

    // Mark single notification as read
    socket.on("mark-notification-read", async ({ notificationId, userId }) => {
      try {
        const notification = await Notification.findByIdAndUpdate(
          notificationId,
          { read: true },
          { new: true }
        );

        if (notification) {
          io.to(`user-${userId}`).emit("notification-read", {
            _id: notificationId,
            read: true,
          });
        }
      } catch (error) {
        console.error("Read error:", {
          error: error.message,
          notificationId,
          userId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Mark all notifications as read
    socket.on("mark-all-notifications-read", async (userId) => {
      try {
        await Notification.updateMany(
          { to: userId, read: false },
          { $set: { read: true } }
        );

        io.to(`user-${userId}`).emit("all-notifications-read");
      } catch (error) {
        console.error("Mark all read error:", {
          error: error.message,
          userId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          break;
        }
      }

      for (const [adminId, patientId] of activeConversations.entries()) {
        if (userSockets.get(adminId) === socket.id) {
          activeConversations.delete(adminId);
        }
      }
    });
  });

  return io;
};
