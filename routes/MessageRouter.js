import { Router } from "express";
import { getMessages } from "../controllers/MessageController.js";

const messageRoutes = Router();

messageRoutes.get("/:patientId", getMessages);

export default messageRoutes;
