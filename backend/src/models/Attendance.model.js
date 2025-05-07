// models/Attendance.model.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      // normalize to midnight so each day is unique
      set: (d) => new Date(new Date(d).toDateString()),
    },
    status: {
      type: String,
      enum: ["Present", "Late", "Absent"],
      required: true,
    },
  },
  { timestamps: true }
);

// ensure one record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
