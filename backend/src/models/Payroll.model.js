import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    period: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      }
    },
    attendance: {
      totalWorkingDays: {
        type: Number,
        required: true,
        min: 0
      },
      presentDays: {
        type: Number,
        required: true,
        min: 0
      },
      lateDays: {
        type: Number,
        default: 0,
        min: 0
      },
      absentDays: {
        type: Number,
        default: 0,
        min: 0
      },
      leaveDays: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    salary: {
      basicSalary: {
        type: Number,
        required: true,
        min: 0
      },
      grossPay: {
        type: Number,
        required: true,
        min: 0
      },
      netPay: {
        type: Number,
        required: true,
        min: 0
      }
    },
    deductions: {
      absentDeduction: {
        type: Number,
        default: 0,
        min: 0
      },
      lateDeduction: {
        type: Number,
        default: 0,
        min: 0
      },
      nhifDeduction: {
        type: Number,
        required: true,
        min: 0
      },
      nssfDeduction: {
        type: Number,
        required: true,
        min: 0
      },
      payeDeduction: {
        type: Number,
        required: true,
        min: 0
      },
      totalDeductions: {
        type: Number,
        required: true,
        min: 0
      }
    },
    // Stripe payment details
    stripePaymentIntentId: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "processing", "succeeded", "failed", "cancelled"],
      default: "pending"
    },
    paymentDate: {
      type: Date,
      default: null
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Additional metadata
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

// Index for efficient querying
payrollSchema.index({ employee: 1, "period.startDate": 1, "period.endDate": 1 });
payrollSchema.index({ paymentStatus: 1, createdAt: -1 });
payrollSchema.index({ stripePaymentIntentId: 1 }, { unique: true });

export const Payroll = mongoose.model("Payroll", payrollSchema);