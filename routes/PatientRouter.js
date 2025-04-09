import { Router } from "express";
import {
  getAllAppointment,
  getAppointment,
  requestAIScan,
  getAllScanResultsForPatient,
  takeAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getScanResultForPatient,
  uploadScanForPremiumPatient,
  getAllScans,
  getScan,
  getAllDoctors,
  getAvailableSlots,
} from "../controllers/PatientController.js";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.js";
import { upload } from "../middlewares/multerConfig.js";

const patientRoutes = Router();

// ----------------------- Appointment Routes -----------------------
// ----------------------- Appointment Routes -----------------------
// ----------------------- Appointment Routes -----------------------

// Get All The Appointments Of A Patient
patientRoutes.get(
  "/appointments",
  authenticateToken,
  authorizeRoles(["Patient"]),
  getAllAppointment
);

// Get One Appointment Of A Patient By Id
patientRoutes.get(
  "/appointments/:appointmentID",
  authenticateToken,
  authorizeRoles(["Patient"]),
  getAppointment
);

// Get One Appointment Of A Patient By Id
patientRoutes.get(
  "/available-appointments",
  authenticateToken,
  authorizeRoles(["Patient"]),
  getAvailableSlots
);

// Take An Appointment For A Patient
patientRoutes.post(
  "/take-appointment",
  authenticateToken,
  authorizeRoles(["Patient"]),
  takeAppointment
);

// Reschedule An Appointment For A Patient By Id
patientRoutes.put(
  "/reschedule-appointment/:appointmentId",
  authenticateToken,
  authorizeRoles(["Patient"]),
  rescheduleAppointment
);

// Cancel An Appointment For A Patient By Id
patientRoutes.delete(
  "/cancel-appointment/:appointmentId",
  authenticateToken,
  authorizeRoles(["Patient"]),
  cancelAppointment
);

// ----------------------- Scans Routes -----------------------
// ----------------------- Scans Routes -----------------------
// ----------------------- Scans Routes -----------------------

// Get All Scans For A Patient
patientRoutes.get(
  "/scans",
  authenticateToken,
  authorizeRoles(["Patient"]),
  getAllScans
);

// Get One Scan For A Patient By Id
patientRoutes.get(
  "/scans/:scanID",
  authenticateToken,
  authorizeRoles(["Patient"]),
  getScan
);

// Upload A Scan For Premium Patient
patientRoutes.post(
  "/scans",
  authenticateToken,
  authorizeRoles(["Patient"]),
  upload.single("image"),
  uploadScanForPremiumPatient
);

// Request A ScanResult
patientRoutes.post(
  "/scans/:scanID",
  authenticateToken,
  authorizeRoles(["Patient"]),
  requestAIScan
);

// Get All Scans Result For A Patient
patientRoutes.get(
  "/scanResults",
  authenticateToken,
  authorizeRoles(["Patient"]),
  getAllScanResultsForPatient
);

// Get One Scan Result For A Patient
patientRoutes.get(
  "/scanResults/:scanResultID",
  authenticateToken,
  authorizeRoles(["Patient"]),
  getScanResultForPatient
);

// Get Doctors List For Premium Patient
patientRoutes.get(
  "/doctors",
  authenticateToken,
  authorizeRoles(["Patient"]),
  getAllDoctors
);

export default patientRoutes;
