import { Router } from "express";
import { Department } from "../models/Department.model";

const router = Router();

router.post("/create-department", async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description)
      return res.status(400).json({ message: "All fields are required" });

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
