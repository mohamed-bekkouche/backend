import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import fs from "fs";
import path from "path";
import ejs from "ejs";
import { transporter } from "../utitlitis/sendMail.js";
import { generateToken } from "../utitlitis/token.js";
import { sendNotification } from "../utitlitis/notification.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const CreateToken = (user) => {
  const activation = Math.floor(1000 + Math.random() * 9000).toString();
  const token = jwt.sign({ user, activation }, `${process.env.TOKEN_SECRET}`);
  return { token, activation };
};

// Sign Up
export const signUp = async (req, res) => {
  const { name, email, password, phoneNum, address, role } = req.body;
  try {
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(500).json({ message: `User already exist` });
    }

    const { token, activation } = CreateToken({
      name,
      email,
      password,
      phoneNum,
      address,
      role,
    });

    const activationUrl = `http://localhost:3000/activate_account/${token}`;

    const template = fs.readFileSync(
      path.join(__dirname, "../mails/activateAccount.ejs"),
      "utf8"
    );

    const html = ejs.render(template, {
      activationUrl,
      username: email,
      activationCode: activation,
    });

    await transporter.sendMail({
      from: `DEEPVISION LAB <${process.env.SMTP_MAIL}>`,
      to: email,
      subject: `Activation Code is ${activation}`,
      html,
    });

    res.cookie("jwt", token, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ token, activation });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

//Activate Account
export const ActivateUser = async (req, res) => {
  let { activationCode, token } = req.body;
  if (!token) {
    token = req.cookies.jwt;
  }
  if (!token) return res.status(403).json({ err: "You Must provide a Token" });

  try {
    const { user, activation } = jwt.verify(
      token,
      `${process.env.TOKEN_SECRET}`
    );

    if (activation != activationCode) {
      throw new Error(`Invalid activation code`);
    }
    const {
      name,
      email,
      password,
      phoneNum,
      address,
      role,
      specialization,
      schedule,
    } = user;
    const hashedPassword = await bcryptjs.hash(password, 10);
    let newUser;
    if (role == "doctor") {
      newUser = await Doctor.create({
        name,
        email,
        password: hashedPassword,
        d_phoneNum: phoneNum,
        address,
        role: "Doctor",
        specialization,
        schedule,
      });
    } else {
      newUser = await Patient.create({
        name,
        email,
        password: hashedPassword,
        role: "Patient",
        p_phoneNum: phoneNum,
        p_Address: address,
      });
    }

    if (!newUser) {
      return res.status(400).json({ message: "User creation failed" });
    }

    if (newUser.role === "Doctor") {
      sendNotification(
        `Dr.${newUser.name} has registered. Please review their application and activate or reject their account.`,
        "admin"
      );
    }

    const jwtToken = generateToken(newUser._id);

    res.cookie("token", jwtToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res
      .status(200)
      .json({ message: "User Created Successfully", user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Log In
export const logIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email Dosen't exist" });
    }
    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Password incorrect" });
    }

    const jwtToken = generateToken(user._id);

    res.cookie("token", jwtToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    res
      .status(200)
      .json({ message: "Login successful", user: userWithoutPassword });
  } catch (error) {
    res.status(error.status || 500).json({ err: error.message });
  }
};

// Refresh Token
export const refreshToken = (req, res) => {
  try {
    const { token } = req.cookies;

    if (!token)
      return res.status(401).json({ error: "Refresh token Not Found" });
    jwt.verify(token, process.env.TOKEN_SECRET, async (err, userData) => {
      if (err)
        return res.sendStatus(401).json({ error: "Refresh token Not Valid" });
      const jwtToken = generateToken(userData.id);
      res.cookie("token", jwtToken, {
        httpOnly: true,
        sameSite: "None",
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        message: "Refresh token Succeeded",
      });
    });
  } catch (error) {
    res.status(error.status || 400).json({ err: error.message });
  }
};

// LogOut
export const logOut = async (req, res) => {
  try {
    const { token } = req.cookies;
    if (!token) return res.sendStatus(401);

    res.cookie("token", "", {
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: -1,
      expires: new Date(0),
    });

    res.status(204).json({ message: "Log Out Successfully" });
  } catch (error) {
    res.status(error.status || 404).json({ err: error.message });
  }
};

// Apdate Info
export const updateUser = async (req, res) => {
  try {
    const newUpdates = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { ...newUpdates },
      { new: true }
    );
    res.status(200).json({ message: " User Updated Successfully", user });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error When Updating User", error: error.message });
  }
};

// Update Avatar
export const changeAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an image." });
    }

    const avatar = `/uploads/${req.file.filename}`;
    const user = await User.findById(req.user.id);

    if (user.avatar !== "/uploads/user.jpeg") {
      const oldAvatar = path.join(
        __dirname,
        "..",
        "uploads",
        path.basename(user.avatar)
      );

      if (fs.existsSync(oldAvatar)) {
        fs.unlinkSync(oldAvatar);
      }
    }

    user.avatar = avatar;
    await user.save();

    res.status(200).json({ message: "Avatar Changed Successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error When Changing Avatar", error: error.message });
  }
};
