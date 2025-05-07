import { Router } from "express";
import { adminRoute, protectRoute } from "../middleware/protectRoute.js";
import { Attendance } from "../models/Attendance.model.js";
import converter from 'json-2-csv';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
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


router.use(adminRoute)

// GET /api/admin/attendance
router.get("/admin-attendance", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const filter = {};
      if (startDate && endDate) {
        filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }
  
      const attendanceRecords = await Attendance.find(filter)
        .populate("employee", "fullName email")
        .sort({ date: -1 });
  
      res.status(200).json({ attendanceRecords });
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/attendance/export
router.get('/attendance/export', async (req, res) => {
    try {
      // 1. Fetch & lean
      const records = await Attendance.find()
        .populate('employee', 'fullName email')
        .sort({ date: -1 })
        .lean();
  
      // 2. Create workbook & worksheet
      const workbook  = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance');
  
      // 3. Define columns
      worksheet.columns = [
        { header: 'Employee',  key: 'employee', width: 25 },
        { header: 'Email',     key: 'email',    width: 30 },
        { header: 'Date',      key: 'date',     width: 15 },
        { header: 'Status',    key: 'status',   width: 10 },
        { header: 'Check In',  key: 'checkIn',  width: 20 },
        { header: 'Check Out', key: 'checkOut', width: 20 },
      ];
      worksheet.getRow(1).font = { bold: true };
  
      // 4. Populate rows
      const jsonResponse = [];
      records.forEach(r => {
        const row = {
          employee: `${r.employee.fullName}`,
          email:    r.employee.email,
          date:     r.date.toISOString().split('T')[0],
          status:   r.status,
          checkIn:  r.checkIn ? r.checkIn.toISOString() : 'N/A',
          checkOut: r.checkOut? r.checkOut.toISOString(): 'N/A'
        };
        worksheet.addRow(row);
        jsonResponse.push(row);
      });
  
      // 5. Ensure exports folder exists
      const exportDir = path.join(process.cwd(), 'exports');
      if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);
  
      // 6. Write file to disk
      const filename = `attendance-${new Date().toISOString().split('T')[0]}.xlsx`;
      const filepath = path.join(exportDir, filename);
      await workbook.xlsx.writeFile(filepath);
  
      // 7. Respond with JSON + file info
      res.status(200).json({
        message: 'Attendance exported successfully',
        file: `/exports/${filename}`,   // adjust if you serve statically
        records: jsonResponse
      });
    } catch (err) {
      console.error('Excel export failed:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  });
  
export { router as attendanceRoutes };
