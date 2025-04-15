import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true,
  },
  reason: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

holidaySchema.index({ date: 1 }, { unique: true });

const Holiday = mongoose.model("Holiday", holidaySchema);

export default Holiday;
