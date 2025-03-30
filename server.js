import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { initializeSocket } from "./socket.js";
import connectDB from "./config/db.js";
import patientRoutes from "./routes/PatientRouter.js";
import adminRoutes from "./routes/AdminRouter.js";
import paymentRoutes from "./routes/PaymentRouter.js";
import dotenv from "dotenv";
import { handleWebhook } from "./controllers/paymentController.js";
import userRoutes from "./routes/UserRouter.js";
import path from "path";
import { fileURLToPath } from "url";
import messageRoutes from "./routes/MessageRouter.js";
import notificationRoutes from "./routes/NotificationRouter.js";

dotenv.config();

connectDB();

const app = express();
const httpServer = createServer(app);

const io = initializeSocket(httpServer);

app.set("io", io);

app.post("/webhook", express.raw({ type: "application/json" }), handleWebhook);

app.use(
  cors({
    origin: process.env.ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/user", userRoutes);
app.use("/patient", patientRoutes);
app.use("/admin", adminRoutes);
app.use("/payment", paymentRoutes);
app.use("/message", messageRoutes);
app.use("/notification", notificationRoutes);

const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
