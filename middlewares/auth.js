import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

dotenv.config();

export const authenticateToken = (req, res, next) => {
  const { token } = req.cookies;
  if (!token)
    return res.sendStatus(401).json({ error: "Access token is required" });

  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: err });
    req.user = user;
    next();
  });
};

export const authorizeRoles = (allowedRoles) => {
  return async (req, res, next) => {
    const id = req.user.id;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: `User not found` });

    if (!allowedRoles.includes(user.role)) {
      return res
        .status(401)
        .json({ message: `Access denied for role: ${user.role}` });
    }
    req.user.role = user.role;
    next();
  };
};
