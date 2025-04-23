import mongoose from "mongoose";
import User from "./User.js";

const DoctorSchema = new mongoose.Schema({
  specialization: { type: String },
  schedule: { type: String },
  medical_license: { type: String, required: true },
  d_phoneNum: { type: String, required: true },
  address: { type: String },
  isActive: { type: Boolean, default: false },
});

const Doctor = User.discriminator("Doctor", DoctorSchema);
export default Doctor;
