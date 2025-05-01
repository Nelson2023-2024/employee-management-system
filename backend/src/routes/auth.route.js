import { Router } from "express";
import { User } from "../models/User.model.js";
import bcrypt from "bcrypt";
import { Department } from "../models/Department.model.js";
import { generateToken } from "../utils/generateTokenAndSetCookie.js";

const router = Router();

router.post("/register-employee", async (req, res) => {
  try {
    const { email, fullName, password, phoneNumber, departmentName } = req.body;

    if (!email || !fullName || !password || !phoneNumber )
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

router.post("/login", async (req,res) => {
  const {email, password} = req.body

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "Email not found" });

    //if email existed
    const comparePassword = await bcryptjs.compare(password, user.password);

    if (!comparePassword)
      return res
        .status(400)
        .json({ message: "Password didn't match our records" });

    //if all the checks are passed
    await generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log(
      "An Error occured in the Login route:",
      error.message
    );
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
})
export { router as authRoutes };
