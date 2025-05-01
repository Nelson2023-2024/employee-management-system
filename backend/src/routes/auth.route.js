import { Router } from "express";
import { User } from "../models/User.model.js";
import bcrypt from "bcrypt";
import { Department } from "../models/Department.model.js";

const router = Router();

router.post("/register-employee", async (req, res) => {
  try {
    const { email, fullName, password, phoneNumber, departmentName } = req.body;

    if (!email || !fullName || !password || !phoneNumber || !role)
      return res.status(400).json({ message: "All fields are required" });

    const emailExist = await User.findOne({ email });

    //check if email is already taken
    if (emailExist)
      return res.status(400).json({ message: "Email is already taken" });

    //check if department exists
    const departmentExist = await Department.findOne({ name: departmentName });
    if (!departmentExist)
      return res.status(404).json({ message: "Department not found" });

    const user = await User({
      email,
      fullName,
      phoneNumber,
      password: await bcrypt.hash(password, 10),
      department: departmentExist._id,
    });

    await user.save();

    // Update department's employee list
    departmentExist.employees.push(user._id);
    await departmentExist.save();

    res.status(201).json({ message: "Employee registered successfully" });
  } catch (error) {
    console.log(
      "An Error occured in the register-employee route:",
      error.message
    );
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

export { router as authRoutes };
