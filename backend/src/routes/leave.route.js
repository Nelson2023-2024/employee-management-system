import { Router } from "express";
import { LeaveType } from "../models/LeaveType.model.js";
import { User } from "../models/User.model.js";
import { LeaveRequest } from "../models/LeaveRequest.model.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = Router();

router.use(protectRoute);

router.post("/:leaveTypeId", async (req, res) => {
  try {
    const { leaveTypeId } = req.params;
    const employeeId = req.user._id;

    // Check for existing leave request
    const existingRequest = await LeaveRequest.findOne({
      employee: employeeId,
      leaveType: leaveTypeId,
      status: { $in: ["Pending", "Approved"] }
    });

    // If exists - remove it (toggle off)
    if (existingRequest) {
      await LeaveRequest.findByIdAndDelete(existingRequest._id);
      return res.status(200).json({
        message: "Leave request removed",
        action: "removed",
        requestId: existingRequest._id
      });
    }

    // If doesn't exist - create new (toggle on)
    const employee = await User.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    if (employee.employeeStatus !== "Active") {
      return res.status(403).json({ message: "Not eligible for leave" });
    }

    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType) return res.status(404).json({ message: "Leave type not found" });
    if (leaveType.maxDays < 1) {
      return res.status(400).json({ message: "Invalid leave configuration" });
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (leaveType.maxDays - 1));

    const newRequest = await LeaveRequest.create({
      employee: employeeId,
      leaveType: leaveTypeId,
      startDate,
      endDate,
      numberOfDays: leaveType.maxDays,
      status: leaveType.requiresApproval ? "Pending" : "Approved",
      approvedDate: leaveType.requiresApproval ? null : new Date(),
    });

    // Handle auto-approval
    if (!leaveType.requiresApproval) {
      const systemUser = await User.findOne({ email: "system@company.com" });
      if (systemUser) {
        newRequest.approver = systemUser._id;
        await newRequest.save();
      }
    }

    res.status(201).json({
      message: leaveType.requiresApproval 
        ? "Leave request submitted for approval" 
        : "Leave automatically approved",
      action: "created",
      request: newRequest
    });

  } catch (error) {
    console.error("Leave error:", error.message);
    res.status(500).json({ 
      message: "Leave operation failed", 
      error: error.message 
    });
  }
});

export { router as leaveRoutes };