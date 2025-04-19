import { Router } from "express";
import {
  getMessages,
  getConversations,
} from "../controllers/MessageController.js";
import { authenticateToken } from "../middlewares/auth.js";

const messageRoutes = Router();

messageRoutes.get("/:patientId", authenticateToken, getMessages);
messageRoutes.get(
  "/conversations/patients",
  authenticateToken,
  getConversations
);

export default messageRoutes;
