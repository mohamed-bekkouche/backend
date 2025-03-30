import mongoose from "mongoose";

const ScanSchema = new mongoose.Schema(
  {
    patientID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    imageURL: { type: String, required: true },
  },
  { timestamps: true }
);

const Scan = mongoose.model("Scan", ScanSchema);
export default Scan;
