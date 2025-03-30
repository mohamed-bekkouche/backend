import mongoose from "mongoose";
import User from "./User.js";

const DoctorSchema = new mongoose.Schema({
  specialization: { type: String, required: true },
  schedule: { type: String },
  d_phoneNum: { type: String, required: true },
  address: { type: String },
  isActive: { type: Boolean, default: false },
});

const Doctor = User.discriminator("Doctor", DoctorSchema);
export default Doctor;
