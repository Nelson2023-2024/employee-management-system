import mongoose from "mongoose";
const leaveBalanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
    }, // Current available days/hours
    year: {
      type: Number,
      required: true,
    }, // Or the relevant entitlement period
    // Add last updated date, accrual tracking fields if needed
  },
  { timestamps: true }
);
// Ensure an employee can only have one balance per leave type per year
leaveBalanceSchema.index(
  { employee: 1, leaveType: 1, year: 1 },
  { unique: true }
);
export const LeaveBalance = mongoose.model("LeaveBalance", leaveBalanceSchema);
