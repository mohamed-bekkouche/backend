import mongoose from "mongoose";

const ScanResultSchema = new mongoose.Schema({
  scanID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Scan",
    required: true,
    unique: true,
  },
  analysisDate: { type: Date, required: true },
  resultState: { type: Boolean, required: true },
  resultAccuracy: { type: Number, required: true },
});

const ScanResult = mongoose.model("ScanResult", ScanResultSchema);
export default ScanResult;
