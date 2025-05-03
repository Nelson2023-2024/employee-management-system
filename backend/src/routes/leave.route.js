import { Router } from "express";
import { LeaveType } from "../models/LeaveType.model.js";
import { User } from "../models/User.model.js";
import { LeaveRequest } from "../models/LeaveRequest.model.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = Router();

router.use(protectRoute)

router.post("/:leaveTypeId", async (req, res) => {
  try {
    const { leaveTypeId } = req.params;
    const employeeId = req.user._id;

    //get employee and valid status
    const employee = await User.findById(employeeId);

    if (!employee)
      return res.status(404).json({ message: "Employee not Found" });

    //if the employee is found check if they are active
    if (employee.employeeStatus !== "Active")
      return res.status(403).json({ message: "Not eligible for leave" });

    //get leave type details
    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType) {
      return res.status(404).json({ message: "Leave type not found" });
    }

    //use maxDays from leave type
    const days = leaveType.maxDays;
    if (days < 1)
      return res.status(400).json({
        message: "Invalid leave configuration < 1 - contact administrator",
      });

    //calculate dates
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (days - 1));

    let newRequest = await LeaveRequest.create({
      employee: employeeId,
      leaveType: leaveTypeId,
      startDate,
      endDate,
      numberOfDays: days,
      status: leaveType.requiresApproval ? "Pending" : "Approved",
      approvedDate: leaveType.requiresApproval ? null : new Date(),
    });

    // For auto-approved leaves, consider adding system approval
    if (!leaveType.requiresApproval) {
      // Optional: Set to a system user if needed
      const systemUser = await User.findOne({ email: "system@company.com" });
      newRequest.approver = systemUser?._id;
      await newRequest.save();
    }

    res.status(201).json({
      message: leaveType.requiresApproval
        ? "Leave request submitted for approval"
        : "Leave automatically approved",
      request: newRequest,
    });
  } catch (error) {
    console.error("Leave application error:", error.message);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

export { router as leaveRoutes };
