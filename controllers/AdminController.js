import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import fs from "fs";
import path from "path";
import ejs from "ejs";
import { transporter } from "../utitlitis/sendMail.js";
import Patient from "../models/Patient.js";
import Scan from "../models/Scan.js";
import { sendNotification } from "../utitlitis/notification.js";
import Holiday from "../models/Holiday.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// Get All Users
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, name } = req.query;
    const filter = {};

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }
    if (role) {
      filter.role = role;
    }
    const users = await User.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const usersNumber = await User.countDocuments(filter);
    res.status(200).json({ users, NbofPages: Math.ceil(usersNumber / limit) });
  } catch (error) {
    res.status(500).json({ message: "Error fetching Data", error });
  }
};

// Delete User
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndDelete(userId);
    res
      .status(200)
      .json({ message: "User account has been successfully deleted." });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while deleting the user account.",
      error,
    });
  }
};

// Activate Doctor Account
export const activateDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const doctor = await Doctor.findByIdAndUpdate(doctorId, { isActive: true });

    const io = req.app.get("io");
    await sendNotification(
      `Dr.${doctor.name} Your DEEPVISION LAB Account Has Been Approved`,
      doctor._id,
      io
    );

    const template = fs.readFileSync(
      path.join(__dirname, "../mails/acceptDoctor.ejs"),
      "utf8"
    );

    const html = ejs.render(template, {
      doctorName: `Dr.${doctor.name}`,
      loginUrl: "http://localhost:3000/auth",
    });

    await transporter.sendMail({
      from: `DEEPVISION LAB <${process.env.SMTP_MAIL}>`,
      to: doctor.email,
      subject: `Dr.${doctor.name} Your DEEPVISION LAB Account Has Been Approved`,
      html,
    });

    res
      .status(200)
      .json({ message: "Doctor account has been successfully activated." });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while activating the doctor's account.",
      error: error.message,
    });
  }
};

// Reject Doctor
export const rejectDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { rejectionReason } = req.body;
    const doctor = await Doctor.findById(doctorId);

    const io = req.app.get("io");
    await sendNotification(
      `Dr.${doctor.name} Your DEEPVISION LAB Account Has Been Refuse`,
      doctor._id,
      io
    );

    const template = fs.readFileSync(
      path.join(__dirname, "../mails/refuseDoctor.ejs"),
      "utf8"
    );

    const html = ejs.render(template, {
      doctorName: `Dr.${doctor.name}`,
      rejectionReason,
      supportContactUrl: "https://deepvisionlab.com/support",
    });

    await transporter.sendMail({
      from: `DEEPVISION LAB <${process.env.SMTP_MAIL}>`,
      to: doctor.email,
      subject: `Important - Dr.${doctor.name} Your DEEPVISION LAB Doctor Account Application`,
      html,
    });

    res.status(200).json({ message: "Success" });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred",
      error: error.message,
    });
  }
};

// Get All Appointment
export const getAppointments = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;

    const appointments = await Appointment.find()
      .skip(limit * (page - 1))
      .limit(limit);

    res.status(200).json({ appointments });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred",
      error: error.message,
    });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment Not Found" });
    }
    res.status(200).json({ appointment });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred",
      error: error.message,
    });
  }
};

// Approve Appointment
export const approveAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findByIdAndUpdate(appointmentId, {
      status: "Approved",
    });

    const patient = await Patient.findById(appointment.patientID).select({
      email: 1,
      name: 1,
    });

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
      `Patient ${patient.name} Your Appointment on ${appointmentDate} at ${appointmentTime}. Has Been Approve`,
      patient._id,
      io
    );

    const template = fs.readFileSync(
      path.join(__dirname, "../mails/approveAppointment.ejs"),
      "utf8"
    );

    const html = ejs.render(template, {
      patientName: patient.name,
      appointmentDate: new Date(appointment.date).toLocaleDateString("fr-FR"),
      appointmentTime: new Date(appointment.time).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      clinicLocation: "DEEPVISION LAB Main Clinic",
    });

    await transporter.sendMail({
      from: `DEEPVISION LAB <${process.env.SMTP_MAIL}>`,
      to: patient.email,
      subject: `${patient.name} Your DEEPVISION LAB Appointment Has Been Approved`,
      html,
    });

    res.status(200).json({
      message: "Patient Appointment has been successfully approved.",
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred",
      error: error.message,
    });
  }
};

// Refuse Appointment
export const refuseAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { declineReason } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(appointmentId, {
      status: "Refused",
    });

    const patient = await Patient.findById(appointment.patientID).select({
      email: 1,
      name: 1,
    });

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
      `Patient ${patient.name} Your Appointment on ${appointmentDate} at ${appointmentTime}. Has Been Refuse`,
      patient._id,
      io
    );

    const template = fs.readFileSync(
      path.join(__dirname, "../mails/refuseAppointment.ejs"),
      "utf8"
    );

    const html = ejs.render(template, {
      patientName: patient.name,
      declineReason,
      appointmentDate: new Date(appointment.date).toLocaleDateString("fr-FR"),
      appointmentTime: new Date(appointment.time).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    });

    await transporter.sendMail({
      from: `DEEPVISION LAB <${process.env.SMTP_MAIL}>`,
      to: patient.email,
      subject: `${patient.name} Your DEEPVISION LAB Appointment Has Been Refused`,
      html,
    });

    res.status(200).json({
      message: "Patient Appointment has been successfully Refused.",
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred",
      error: error.message,
    });
  }
};

// Reschedule Appointment
export const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { date, time } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(appointmentId, {
      status: "Approved",
      date,
      time,
    });

    const patient = await Patient.findById(appointment.patientID).select({
      email: 1,
      name: 1,
    });

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
      `Patient ${patient.name} Your Appointment Has Been Reschedule to ${appointmentDate} at ${appointmentTime}`,
      patient._id,
      io
    );

    const template = fs.readFileSync(
      path.join(__dirname, "../mails/rescheduleAppointment.ejs"),
      "utf8"
    );

    const html = ejs.render(template, {
      patientName: patient.name,
      previousAppointmentDate: new Date(appointment.date).toLocaleDateString(
        "fr-FR"
      ),
      previousAppointmentTime: new Date(appointment.time).toLocaleTimeString(
        "fr-FR",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      ),
      newAppointmentDate: new Date(date | appointment.date).toLocaleDateString(
        "fr-FR"
      ),
      newAppointmentTime: new Date(time | appointment.time).toLocaleTimeString(
        "fr-FR",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      ),
      clinicLocation: "DEEPVISION LAB Main Clinic",
    });

    await transporter.sendMail({
      from: `DEEPVISION LAB <${process.env.SMTP_MAIL}>`,
      to: patient.email,
      subject: `${patient.name} Your DEEPVISION LAB Appointment Has Been Reschedule`,
      html,
    });

    res.status(200).json({
      message: "Patient Appointment has been successfully Reschedule.",
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred",
      error: error.message,
    });
  }
};

// Mark Day As Unavailable (take a day as a holiday)
export const markDayAsUnavailable = async (req, res) => {
  try {
    const { date, reason } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const holidayDate = new Date(date);
    holidayDate.setHours(0, 0, 0, 0);

    const existingHoliday = await Holiday.findOne({ date: holidayDate });

    if (existingHoliday) {
      return res.status(400).json({
        message: "This day is already marked as unavailable",
        holiday: existingHoliday,
      });
    }

    const holiday = new Holiday({
      date: holidayDate,
      reason: reason || "Holiday",
      createdBy: req.user.id,
    });

    await holiday.save();

    const startOfDay = new Date(holidayDate);
    const endOfDay = new Date(holidayDate);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const affectedAppointments = await Appointment.updateMany(
      {
        date: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
        status: "Approved",
      },
      {
        $set: {
          status: "Cancelled",
          cancellationReason: `Day marked as unavailable: ${
            reason || "Holiday"
          }`,
        },
      }
    );

    res.status(201).json({
      message: "Day marked as unavailable successfully",
      holiday,
      affectedAppointments: affectedAppointments.modifiedCount,
    });
  } catch (err) {
    console.error("Error marking day as unavailable:", err);
    res.status(500).json({ message: "Failed to mark day as unavailable" });
  }
};

// Get All Holidays
export const getUnavailableDays = async (req, res) => {
  try {
    const { month, year } = req.query;

    let query = {};

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);

      query = {
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      };
    }

    const holidays = await Holiday.find(query).sort({ date: 1 });

    res.status(200).json({ holidays });
  } catch (err) {
    console.error("Error fetching unavailable days:", err);
    res.status(500).json({ message: "Failed to fetch unavailable days" });
  }
};

// Remove a Holiday
export const removeUnavailableDay = async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await Holiday.findById(id);

    if (!holiday) {
      return res.status(404).json({ message: "Unavailable day not found" });
    }

    await Holiday.findByIdAndDelete(id);

    res.status(200).json({ message: "Unavailable day removed successfully" });
  } catch (err) {
    console.error("Error removing unavailable day:", err);
    res.status(500).json({ message: "Failed to remove unavailable day" });
  }
};

// Upload Scan
export const uploadScan = async (req, res) => {
  try {
    const { patientID } = req.params;

    if (!patientID) {
      return res.status(400).json({ message: "Patient ID is required." });
    }
    const patient = await Patient.findById(patientID).select("name");

    if (!req.file) {
      return res.status(400).json({ message: "Please upload an image." });
    }

    const imageURL = `/uploads/${req.file.filename}`;

    const newScan = new Scan({ patientID, imageURL });
    await newScan.save();

    const io = req.app.get("io");
    await sendNotification(
      `Patient ${patient.name} Your Scan Is Uploaded`,
      patient._id,
      io
    );

    res
      .status(201)
      .json({ message: "Scan uploaded successfully.", scan: newScan });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while uploading the scan.",
      error: error.message,
    });
  }
};

// Delete Scan
export const deleteScan = async (req, res) => {
  try {
    const { scanID } = req.params;
    if (!scanID) {
      return res.status(400).json({ message: "Scan ID is required." });
    }

    const scan = await Scan.findById(scanID);
    if (!scan) {
      return res.status(404).json({ message: "Scan not found." });
    }

    const imagePath = path.join(
      __dirname,
      "..",
      "uploads",
      path.basename(scan.imageURL)
    );
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await Scan.findByIdAndDelete(scanID);

    res
      .status(200)
      .json({ message: "Scan and associated image deleted successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while deleting the scan.", error });
  }
};
