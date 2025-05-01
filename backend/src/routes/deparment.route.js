import { Router } from "express";
import { Department } from "../models/Department.model.js";
import { adminRoute, protectRoute } from "../middleware/protectRoute.js";

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

router.post("/create-department", async (req, res) => {
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

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByIdAndDelete(id);

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const promises = [
      // Update all users in this department to set their department to null
      User.updateMany({ department: id }, { $set: { department: null } }),
      // Delete the department
      Department.findByIdAndDelete(id),
    ];

    // Execute both promises concurrently
    const [usersUpdated, departmentDeleted] = await Promise.all(promises);

    if (!departmentDeleted) {
      // This condition might be redundant since we already checked if the department exists initially
      // However, it adds an extra layer of safety in case of unexpected issues during the promise execution.
      return res
        .status(404)
        .json({ message: "Department not found (after attempting deletion)" });
    }

    res.status(200).json({ message: "Department deleted successfully" });
  } catch (error) {
    console.log(
      "An Error occured in the delete department route:",
      error.message
    );
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});
export { router as departmentRoutes };
