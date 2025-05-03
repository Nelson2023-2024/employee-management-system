import { Router } from "express";
import { adminRoute, protectRoute } from "../middleware/protectRoute.js";
import { LeaveType } from "../models/LeaveType.model.js";
import { User } from "../models/User.model.js";
import { LeaveRequest } from "../models/LeaveRequest.model.js";

const router = Router();

router.use(protectRoute, adminRoute);

//create a leave
router.post("/", async (req, res) => {
  try {
    const { name, description, maxDays } = req.body;

    if (!name || !description || !maxDays)
      return res.status(400).json({ message: "All fields are required" });

    const leaveExist = await LeaveType.findOne({ name });
    if (leaveExist)
      return res.status(400).json({ message: "Leave already exists" });

    //if the leave doesn't exist
    const leave = await LeaveType.create({
      name,
      description,
      maxDays,
    });

    res.status(201).json({ message: "Leave Created successfully", leave });
  } catch (error) {
    console.log(
      "An error occurred in the create-leave-route route:",
      error.message
    );
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

//delete a leave
router.delete("/:id", protectRoute, adminRoute, async (req, res) => {
  try {
    const { id: leaveId } = req.params;
    // First, check if the leave type exists
    const leaveType = await LeaveType.findById(leaveId);
    if (!leaveType) {
      return res.status(404).json({ message: "Leave type not found" });
    }

    await User.updateMany(
      { leaveType: leaveId },
      { $set: { leaveType: null } }
    );

    //  Delete the LeaveType
    const deletedLeaveType = await LeaveType.findByIdAndDelete(leaveId);
    if (!deletedLeaveType) {
      return res.status(404).json({ message: "Leave type not found" });
    }
    res.status(200).json({ message: "Leave type deleted successfully" });
  } catch (error) {
    console.log(
      "An Error occured in the delete-leave route:",
      error.message
    );
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

// Add this route to adminLeaveRoutes.js
router.patch("/toggle-leave/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    // Find the leave request and determine new status
    const leaveRequest = await LeaveRequest.findOne({
      _id: id,
      status: { $in: ["Approved", "Pending", "Rejected"] }
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Toggle logic
    const newStatus = leaveRequest.status === "Approved" 
      ? "Rejected" 
      : "Approved";

    const update = {
      status: newStatus,
      approver: adminId,
      approvedDate: newStatus === "Approved" ? new Date() : null
    };

    // Atomic update
    const updatedRequest = await LeaveRequest.findByIdAndUpdate(
      id,
      update,
      { new: true }
    ).populate("employee", "fullName email");

    res.status(200).json({
      message: `Leave ${newStatus.toLowerCase()} successfully`,
      leave: updatedRequest
    });

  } catch (error) {
    console.error("Toggle error:", error.message);
    res.status(500).json({
      message: "Failed to toggle leave status",
      error: error.message
    });
  }
});

export { router as adminLeaveRoutes };
