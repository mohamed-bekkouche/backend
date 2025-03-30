import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/:userId", getNotifications);
router.put("/read/:notificationId", markAsRead);
router.put("/read-all/:userId", markAllAsRead);

export default router;
