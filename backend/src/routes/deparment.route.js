import { Router } from "express";
import { Department } from "../models/Department.model.js";
import { adminRoute, protectRoute } from "../middleware/protectRoute.js";
import { User } from "../models/User.model.js"; // Make sure User is imported

const router = Router();

router.get("/", protectRoute, adminRoute, async (req, res) => {
  try {
    console.log("Req.user:", req.user);

    const departments = await Department.find({});
    res.status(200).json({ departments });
  } catch (error) {
    console.log(
      "An error occurred in the get-all-departments route:",
      error.message
    );
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

router.post("/create-department", protectRoute, adminRoute, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description)
      return res.status(400).json({ message: "All fields are required" });

    const departmentExist = await Department.findOne({ name });
    if (departmentExist)
      return res.status(400).json({ message: "Department already exists" });

    const department = new Department({
      name,
      description,
    });

    await department.save();
    res.status(201).json({ message: "Department created successfully" });
  } catch (error) {
    console.log(
      "An Error occured in the create-department route:",
      error.message
    );
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

router.delete("/:id", protectRoute, adminRoute, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the department first to ensure it exists
    const departmentToDelete = await Department.findById(id);

    if (!departmentToDelete) {
      return res.status(404).json({ message: "Department not found" });
    }

    // 2. Update all users in this department to set their department to null
    // This should happen *before* deleting the department itself
    await User.updateMany({ department: id }, { $set: { department: null } });

    // 3. Now, delete the department
    await Department.findByIdAndDelete(id);

    res.status(200).json({ message: "Department deleted successfully" });
  } catch (error) {
    console.log(
      "An Error occurred in the delete department route:",
      error.message
    );
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

export { router as departmentRoutes };