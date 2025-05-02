import { Router } from "express";
import { adminRoute, protectRoute } from "../middleware/protectRoute.js";
import { LeaveType } from "../models/LeaveType.model.js";
import { User } from "../models/User.model.js";

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

export { router as adminLeaveRoutes };
