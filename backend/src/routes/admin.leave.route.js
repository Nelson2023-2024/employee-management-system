import { Router } from "express";
import { adminRoute, protectRoute } from "../middleware/protectRoute.js";
import { LeaveType } from "../models/LeaveType.model.js";

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

export { router as adminLeaveRoutes };
