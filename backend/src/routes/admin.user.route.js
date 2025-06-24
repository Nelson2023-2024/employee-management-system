import { Router } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/User.model.js";
import { Department } from "../models/Department.model.js";
import { Notification } from "../models/Notifications.model.js";
import { adminRoute, protectRoute } from "../middleware/protectRoute.js";

const router = Router();

router.post(
  "/register-employee",
  protectRoute,
  adminRoute,
  async (req, res) => {
    try {
      const {
        email,
        fullName,
        password,
        phoneNumber,
        position,
        departmentName,
      } = req.body;

      if (
        !email ||
        !fullName ||
        !password ||
        !phoneNumber ||
        !position ||
        !departmentName
      ) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (await User.findOne({ email })) {
        return res.status(400).json({ message: "Email is already taken" });
      }

      const department = await Department.findOne({ name: departmentName });
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({
        email,
        fullName,
        phoneNumber,
        position,
        department: department._id,
        password: hashed,
      });

      // Add to department.employees
      department.employees.push(user._id);
      await department.save();

      // 1️⃣ Notify the new employee
      await Notification.create({
        recipient: user._id,
        sender:    null,
        title:     "Welcome Aboard!",
        message:   `Hi ${user.fullName}, your account has been set up in ${department.name}.`,
        type:      "system",
      });

      // 2️⃣ Notify the admin who created the account
      await Notification.create({
        recipient: req.user._id,
        sender:    user._id,
        title:     "New Employee Registered",
        message:   `${user.fullName} has been added to ${department.name}.`,
        type:      "system",
      });

      res.status(201).json({
        message: "Employee registered successfully",
        user: {
          _id: user._id,
          email: user.email,
          fullName: user.fullName,
          position: user.position,
          department: department.name,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error("Register-employee error:", error.message);
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

    // Remove from department if needed
    if (user.department) {
      await Department.findByIdAndUpdate(user.department, {
        $pull: { employees: user._id },
      });
    }

    // 1️⃣ Notify the deleted user (their notifications still reference them)
    await Notification.create({
      recipient: user._id,
      sender:    null,
      title:     "Account Deleted",
      message:   `Your account (${user.fullName}) has been removed by an administrator.`,
      type:      "system",
    });

    // 2️⃣ Notify the admin who performed the deletion
    await Notification.create({
      recipient: req.user._id,
      sender:    user._id,
      title:     "Employee Deleted",
      message:   `${user.fullName} has been removed from the system.`,
      type:      "system",
    });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete-employee error:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

router.get("/", protectRoute, adminRoute, async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password")
      .populate("department", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ users });
  } catch (error) {
    console.error("Get-all-users error:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

export { router as adminEmployeeRoutes };
