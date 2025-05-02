import { Router } from "express";
import { User } from "../models/User.model.js";
import bcrypt from "bcrypt";
import { Department } from "../models/Department.model.js";
import { adminRoute, protectRoute } from "../middleware/protectRoute.js";

const router = Router();

router.post(
  "/register-employee",
  protectRoute,
  adminRoute,
  async (req, res) => {
    try {
      const { email, fullName, password, phoneNumber, departmentName } =
        req.body;

      console.log("Req.user:", req.user);

      if (!email || !fullName || !password || !phoneNumber)
        return res.status(400).json({ message: "All fields are required" });

      const emailExist = await User.findOne({ email });

      //check if email is already taken
      if (emailExist)
        return res.status(400).json({ message: "Email is already taken" });

      //check if department exists
      const departmentExist = await Department.findOne({
        name: departmentName,
      });
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
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
);

router.delete("/:id", protectRoute, adminRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If the user belonged to a department, remove their ID from the department's employees array
    if (user.department) {
      await Department.findByIdAndUpdate(user.department, {
        $pull: { employees: user._id },
      });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.log(
      "An Error occured in the delete-employee route:",
      error.message
    );
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});


export {router as adminEmployeeRoutes}