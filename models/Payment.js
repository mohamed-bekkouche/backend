import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  paymentID: { type: String, required: true, unique: true },
  patientID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },
  amount: { type: Number, required: true },
  paymentDate: { type: Date, required: true },
  paymentMethod: { type: String, required: true },
  status: { type: String, required: true },
});

const Payment = mongoose.model("Payment", PaymentSchema);
export default Payment;
