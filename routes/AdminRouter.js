import { Router } from "express";
import {
  getUsers,
  activateDoctor,
  rejectDoctor,
  deleteUser,
  approveAppointment,
  refuseAppointment,
  rescheduleAppointment,
  uploadScan,
  deleteScan,
  markDayAsUnavailable,
  getUnavailableDays,
  removeUnavailableDay,
} from "../controllers/AdminController.js";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.js";
import { upload } from "../middlewares/multerConfig.js";

const adminRoutes = Router();

// ----------------------- User Routes -----------------------
// ----------------------- User Routes -----------------------
// ----------------------- User Routes -----------------------

// Get All Users By Filter
adminRoutes.get(
  "/users",
  authenticateToken,
  authorizeRoles(["Admin"]),
  getUsers
);

// Delete User By Id
adminRoutes.delete(
  "/user/:userId",
  authenticateToken,
  authorizeRoles(["Admin"]),
  deleteUser
);

// Activate Doctor Account By Id
adminRoutes.put(
  "/activate-doctor/:doctorId",
  authenticateToken,
  authorizeRoles(["Admin"]),
  activateDoctor
);

// Reject Doctor Account By Id
adminRoutes.put(
  "/reject-doctor/:doctorId",
  authenticateToken,
  authorizeRoles(["Admin"]),
  rejectDoctor
);

// ----------------------- Appointment Routes -----------------------
// ----------------------- Appointment Routes -----------------------
// ----------------------- Appointment Routes -----------------------

// Approve Appointment By Id
adminRoutes.put(
  "/appointments/approve/:appointmentId",
  authenticateToken,
  authorizeRoles(["Admin"]),
  approveAppointment
);

// Refuse Appointment By Id
adminRoutes.put(
  "/appointments/refuse/:appointmentId",
  authenticateToken,
  authorizeRoles(["Admin"]),
  refuseAppointment
);

// Reschedule Appointment By Id
adminRoutes.put(
  "/appointments/reschedule/:appointmentId",
  authenticateToken,
  authorizeRoles(["Admin"]),
  rescheduleAppointment
);

// Mark Day As Unavailable (Holiday)
adminRoutes.post(
  "/appointments/unavailable",
  authenticateToken,
  authorizeRoles(["Admin"]),
  markDayAsUnavailable
);

// Get Unavailable Day (Get Holidays)
adminRoutes.get(
  "/appointments/unavailable",
  authenticateToken,
  getUnavailableDays
);

// Remove Unavailable Day By id (Remove Holiday)
adminRoutes.delete(
  "/appointments/unavailable/:id",
  authenticateToken,
  authorizeRoles(["Admin"]),
  removeUnavailableDay
);

// ----------------------- Scan Routes -----------------------
// ----------------------- Scan Routes -----------------------
// ----------------------- Scan Routes -----------------------

// Upload A Scan
adminRoutes.post(
  "/scans/:patientID",
  authenticateToken,
  authorizeRoles(["Admin"]),
  upload.single("image"),
  uploadScan
);

// Delete A Scan
adminRoutes.delete(
  "/scans/:scanID",
  authenticateToken,
  authorizeRoles(["Admin"]),
  deleteScan
);

export default adminRoutes;
