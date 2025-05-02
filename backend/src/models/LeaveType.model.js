import mongoose from "mongoose";
const leaveTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    }, // e.g., 'Annual Leave', 'Sick Leave'
    description: {
      type: String,
    },
    deductsFromBalance: {
      type: Boolean,
      default: true,
    }, // Does taking this leave reduce the balance?
    requiresApproval: {
      type: Boolean,
      default: true,
    },
    // Add other relevant fields: default entitlement, accrual rules etc.
  },
  { timestamps: true }
);
export const LeaveType = mongoose.model("LeaveType", leaveTypeSchema);
