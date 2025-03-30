import Appointment from "../models/Appointment.js";
import Scan from "../models/Scan.js";
import ScanResult from "../models/ScanResult.js";
import Subscription from "../models/Subscription.js";
import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import { sendNotification } from "../utitlitis/notification.js";

export const isPremium = (expDate) => {
  if (!expDate) return false;
  return new Date(expDate) > new Date();
};

//Get All Appointment For Patient
export const getAllAppointment = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const appointments = await Appointment.find({ patientID: req.user.id })
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ appointments });
  } catch (error) {
    res.status(500).json({
      message: "Error managing appointments",
      error: error.message,
    });
  }
};

//Get One Appointment For Patient
export const getAppointment = async (req, res) => {
  try {
    const { appointmentID } = req.params;

    const appointment = await Appointment.findById(appointmentID);

    res.status(200).json({ appointment });
  } catch (error) {
    res.status(500).json({
      message: "Error managing appointments",
      error: error.message,
    });
  }
};

// Take Appointment
export const takeAppointment = async (req, res) => {
  try {
    const { date, time } = req.body;
    const newAppointment = new Appointment({
      date,
      time,
      patientID: req.user.id,
      status: "Scheduled",
    });

    const patient = await Patient.findById(req.user.id).select("name");
    await newAppointment.save();

    const io = req.app.get("io");

    await sendNotification(
      `Patient ${patient.name} has taken an appointment. Please review their application.`,
      "admin",
      io
    );

    res.status(200).json({
      success: true,
      message: "Appointment booked successfully.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error managing appointments",
      error: error.message,
    });
  }
};

// Cancel Appointment
export const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findByIdAndUpdate(appointmentId, {
      status: "Cancelled",
    });
    const patient = await Patient.findById(req.user.id).select("name");

    const appointmentDate = new Date(appointment.date).toLocaleDateString(
      "fr-FR"
    );
    const appointmentTime = new Date(appointment.time).toLocaleTimeString(
      "fr-FR",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    );

    const io = req.app.get("io");
    await sendNotification(
      `Patient ${patient.name} canceled their appointment on ${appointmentDate} at ${appointmentTime}.`,
      "admin",
      io
    );

    res
      .status(200)
      .json({ success: true, message: "Appointment Canceled successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error managing appointments", error: error.message });
  }
};

// Reschedule Appointment
export const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { date, time } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(appointmentId, {
      date,
      time,
    });

    const patient = await Patient.findById(req.user.id).select("name");

    const appointmentDate = new Date(appointment.date).toLocaleDateString(
      "fr-FR"
    );
    const appointmentTime = new Date(appointment.time).toLocaleTimeString(
      "fr-FR",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    );

    const newAppointmentDate = date
      ? new Date(date).toLocaleDateString("fr-FR")
      : appointmentDate;
    const newAppointmentTime = time
      ? new Date(time).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : appointmentTime;

    const io = req.app.get("io");
    await sendNotification(
      `Patient ${patient.name} Reschedule their appointment on ${appointmentDate} at ${appointmentTime} to ${newAppointmentDate} at ${newAppointmentTime}`,
      "admin",
      io
    );

    res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully.",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error managing appointments", error: error.message });
  }
};

// Get All Scans For A Patient
export const getAllScans = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const scans = await Scan.find({ patientID: req.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ scans });
  } catch (error) {
    res.status(500).json({
      message: "Error Fetching Scans",
      error: error.message,
    });
  }
};

// Get Scan For A Patient
export const getScan = async (req, res) => {
  try {
    const { scanID } = req.params;

    const scan = await Scan.findById(scanID);

    res.status(200).json({ scan });
  } catch (error) {
    res.status(500).json({
      message: "Error Fetching Scan",
      error: error.message,
    });
  }
};

// Request AI Scan
export const requestAIScan = async (req, res) => {
  try {
    const { scanID } = req.params;
    const subscription = await Subscription.findOne({
      patientID: req.user.id,
      status: "active",
    });
    const IsPremium = isPremium(subscription?.expDate);

    // Add AI Result Here!
    const scanResult = await ScanResult.create({
      scanID,
      analysisDate: new Date(),
      resultState: true | false,
      resultAccuracy: 10, // Put Number
    });

    res.status(200).json({
      message: IsPremium
        ? "Scan Result Is Here!"
        : "You Can Check Your Scan Tommorow",
      scanResult: IsPremium ? scanResult : null,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error Requesting Scan",
      error: error.message?.includes("E11000")
        ? "You Already Make A Request For This Scan"
        : error.message,
    });
  }
};

// Get All Scan Result Of A Patient
export const getAllScanResultsForPatient = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      patientID: req.user.id,
      status: "active",
    });
    const IsPremium = isPremium(subscription?.expDate);

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const scanResults = await ScanResult.aggregate([
      {
        $lookup: {
          from: "scans",
          localField: "scanID",
          foreignField: "_id",
          as: "scanDetails",
        },
      },
      { $unwind: "$scanDetails" },
      {
        $match: {
          "scanDetails.patientID": new mongoose.Types.ObjectId(req.user.id),
        },
      },
      {
        $match: IsPremium
          ? {} // Premium users see all results
          : { analysisDate: { $lte: twentyFourHoursAgo } }, // Non-premium only see older results
      },
      {
        $project: {
          scanID: 1,
          analysisDate: 1,
          resultState: 1,
          resultAccuracy: 1,
        },
      },
    ]);
    res.status(200).json({ scanResults });
  } catch (error) {
    console.error("Error in viewScanResults:", error);
    res.status(500).json({
      message: "Error Fetching Scans",
      error: error.message,
    });
  }
};

// Get A Scan Result For A Patient
export const getScanResultForPatient = async (req, res) => {
  try {
    const { scanResultID } = req.params;
    if (!scanResultID)
      return res.status(404).json({ message: "Scan Result Id Is Required" });
    const scanResult = await ScanResult.findById(scanResultID);
    res.status(200).json({ scanResult });
  } catch (error) {
    res.status(500).json({ message: "Error Fetching Scan Result", error });
  }
};

// Upload Scan For Premium Patient
export const uploadScanForPremiumPatient = async (req, res) => {
  try {
    const patientID = req.user.id;

    if (!patientID)
      return res.status(400).json({ message: "Patient ID is required." });

    const subscription = await Subscription.findOne({
      patientID,
      status: "active",
    });

    if (!isPremium(subscription?.expDate))
      return res.status(400).json({
        message: "You Have To Upgrade Your Account To Access This feature",
      });

    if (!req.file)
      return res.status(400).json({ message: "Please upload an image." });

    const imageURL = `/uploads/${req.file.filename}`;

    const newScan = new Scan({ patientID, imageURL });
    await newScan.save();

    res
      .status(201)
      .json({ message: "Scan uploaded successfully.", scan: newScan });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while uploading the scan.", error });
  }
};

// Get Doctors For Premium Patient
export const getAllDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const subscription = await Subscription.findOne({
      patientID: req.user.id,
      status: "active",
    });

    if (!isPremium(subscription?.expDate))
      return res.status(400).json({
        message: "You Have To Upgrade Your Account To Access This feature",
      });

    const doctors = await Doctor.find()
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ doctors });
  } catch (error) {
    res.status(500).json({
      message: "Error managing appointments",
      error: error.message,
    });
  }
};
