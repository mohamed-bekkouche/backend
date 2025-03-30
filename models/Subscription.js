import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema({
  subID: { type: String, required: true, unique: true },
  patientID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },
  startDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["active", "canceled", "expired", "incomplete"],
    default: "incomplete",
  },
  expDate: { type: Date, required: true },
});

const Subscription = mongoose.model("Subscription", SubscriptionSchema);
export default Subscription;
