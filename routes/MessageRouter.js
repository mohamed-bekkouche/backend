import { Router } from "express";
import { getMessages } from "../controllers/MessageController.js";
import { authenticateToken } from "../middlewares/auth.js";

const messageRoutes = Router();

messageRoutes.get("/:patientId", authenticateToken, getMessages);

export default messageRoutes;
