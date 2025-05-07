import { Router } from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { Attendance } from "../models/Attendance.model.js";

const router = Router();

router.use(protectRoute);
//creates or updates todays attendance record
router.post("/", async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { status } = req.body;

    if (!["Present", "Late", "Absent"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // normalize today to midnight UTC
    const today = new Date();
    const dateOnly = new Date(today.toDateString());

    const updated = await Attendance.findOneAndUpdate(
      { employee: employeeId, date: dateOnly },
      { $set: { status } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      message: `Attendance marked as ${status}`,
      attendance: updated,
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    if (error.code === 11000) {
      // duplicate key — unlikely because we use findOneAndUpdate
      return res.status(409).json({ message: "Attendance already recorded" });
    }
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

/**
 * GET /api/attendance
 * Returns all attendance records for the current user.
 */
router.get("/", async (req, res) => {
    try {
      const employeeId = req.user._id;
      const records = await Attendance.find({ employee: employeeId })
        .sort({ date: 1 })
        .select("date status -_id");
  
      res.status(200).json({
        count: records.length,
        attendance: records,
      });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });

export { router as attendanceRoutes };
