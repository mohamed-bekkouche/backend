import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema({
  patientID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },
  date: { type: Date, required: true },
  status: { type: String, required: true },
  time: { type: Date, required: true },
});

const Appointment = mongoose.model("Appointment", AppointmentSchema);
export default Appointment;
