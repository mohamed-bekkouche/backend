import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", authenticateToken, getNotifications);
router.put("/read/:notificationId", markAsRead);
router.put("/read-all", authenticateToken, markAllAsRead);

export default router;
