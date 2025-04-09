import { Router } from "express";
import {
  signUp,
  ActivateUser,
  logIn,
  refreshToken,
  logOut,
  updateUser,
  changeAvatar,
  initiatePasswordRecovery,
  resetPassword,
} from "../controllers/UserController.js";
import { authenticateToken } from "../middlewares/auth.js";
import { upload } from "../middlewares/multerConfig.js";

const userRoutes = Router();

userRoutes.post("/signup", signUp);
userRoutes.post("/activate-account", ActivateUser);
userRoutes.post("/login", logIn);
userRoutes.post("/refresh-token", refreshToken);
userRoutes.post("/logout", logOut);

userRoutes.put("/informations", authenticateToken, updateUser);

userRoutes.put(
  "/avatar",
  authenticateToken,
  upload.single("image"),
  changeAvatar
);

userRoutes.put("/pass_recovery", initiatePasswordRecovery);
userRoutes.put("/pass_reset", resetPassword);

export default userRoutes;
