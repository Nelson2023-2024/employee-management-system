import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      min: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    employeeStatus:{
        type: String,
        required: true,
        enum: ["Active", "On Leave", "Terminated"]
    },
    phoneNumber:{
    type: String,
      required: true,
    },
    role:{
        type: String,
        enum: ["employee", "admin"],
        default: "employee"
    },
    department:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true,
    }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);