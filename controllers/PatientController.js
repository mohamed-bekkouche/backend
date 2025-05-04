import Appointment from "../models/Appointment.js";
import Scan from "../models/Scan.js";
import ScanResult from "../models/ScanResult.js";
import Subscription from "../models/Subscription.js";
import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import { sendNotification } from "../utitlitis/notification.js";
import { generateTimeSlots } from "../utitlitis/getTimeSlots.js";
import Holiday from "../models/Holiday.js";

export const isPremium = (expDate) => {
  if (!expDate) return false;
  return new Date(expDate) > new Date();
};

const formatSlotRange = (slotISO) => {
  const start = new Date(slotISO);
  const end = new Date(start.getTime() + 30 * 60 * 1000); // +30 mins

  const options = { hour: "2-digit", minute: "2-digit" };
  return `${start.toLocaleTimeString([], options)} - ${end.toLocaleTimeString(
    [],
    options
  )}`;
};

export const getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    const holiday = await Holiday.findOne({
      date: selectedDate,
    });

    if (holiday) {
      return res.status(200).json({
        formattedSlots: [],
        message: `No slots available. Reason: ${holiday.reason}`,
      });
    }

    const nextDay = new Date(selectedDate);
    nextDay.setDate(selectedDate.getDate() + 1);

    const appointments = await Appointment.find({
      date: {
        $gte: selectedDate,
        $lt: nextDay,
      },
      status: "Approved",
    });

    const bookedTimes = appointments.map((appointment) => {
      const time = new Date(appointment.time);
      return `${time.getHours()}:${time.getMinutes()}`;
    });

    const allSlots = generateTimeSlots(selectedDate);

    const availableSlots = allSlots.filter((slot) => {
      const timeString = `${slot.getHours()}:${slot.getMinutes()}`;
      return !bookedTimes.includes(timeString);
    });

    const formattedSlots = availableSlots.map((slot) => formatSlotRange(slot));

    res.status(200).json({ formattedSlots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch available slots." });
  }
};

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

    // Validate date and time
    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: "Date and time are required",
      });
    }

    // Create proper Date objects
    const appointmentDate = new Date(date);
    const appointmentTime = new Date(time);

    if (isNaN(appointmentDate.getTime()) || isNaN(appointmentTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date or time format",
      });
    }

    const newAppointment = new Appointment({
      date: appointmentDate,
      time: appointmentTime,
      patientID: req.user.id,
      status: "Pending",
    });

    const patient = await Patient.findById(req.user.id).select("name");
    await newAppointment.save();

    const io = req.app.get("io");

    await sendNotification(
      `Patient ${patient.name} has taken an appointment. Please review their application.`,
      `Le patient ${patient.name} a pris un rendez-vous. Veuillez examiner sa demande.`,
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

    // First find the appointment
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Update the status
    appointment.status = "Cancelled";
    await appointment.save();

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
      `Your appointment has been cancelled successfully`,
      `Votre rendez-vous a été annulé avec succès`,
      appointment.patientID,
      io
    );

    res
      .status(200)
      .json({ success: true, message: "Appointment canceled successfully." });
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

    const oldAppointment = await Appointment.findById(appointmentId);

    if (!oldAppointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Store old appointment details for notification
    const oldDate = new Date(oldAppointment.date);
    const oldTime = new Date(oldAppointment.time);

    const oldDateFormatted = oldDate.toLocaleDateString("fr-FR");
    const oldTimeFormatted = oldTime.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Update with new values if provided
    if (date) oldAppointment.date = new Date(date);
    if (time) oldAppointment.time = new Date(time);

    await oldAppointment.save();

    const patient = await Patient.findById(req.user.id).select("name");

    const newDateFormatted = oldAppointment.date.toLocaleDateString("fr-FR");
    const newTimeFormatted = oldAppointment.time.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const io = req.app.get("io");
    await sendNotification(
      `Your appointment has been rescheduled successfully`,
      `Votre rendez-vous a été reprogrammé avec succès`,
      oldAppointment.patientID,
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

export const checIfPatientPremium = async (req, res) => {
  try {
    const patientId = req.user?.id || req.query.patientId;

    const subscription = await Subscription.findOne({
      patientID: patientId,
      status: { $in: ["active", "expired"] },
    });

    if (!subscription)
      return res.status(400).json({
        message: "You Have To Upgrade Your Account To Access This Feature",
      });

    const isPatientPremium =
      isPremium(subscription.expDate) && subscription.status === "active";
    res.status(200).json({ subscription, isPatientPremium });
  } catch (error) {
    res.status(500).json({
      message: "Error Checking if Patient is Premium",
      error: error.message,
    });
  }
};
