import mongoose from "mongoose";
import User from "./User.js";

const PatientSchema = new mongoose.Schema({
  p_phoneNum: { type: String, default: null },
  p_Address: { type: String, default: null },
});

const Patient = User.discriminator("Patient", PatientSchema);
export default Patient;
