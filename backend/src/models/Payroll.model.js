import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    payPeriod: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },
    attendanceData: {
      totalHours: {
        type: Number,
        required: true,
        min: 0,
        max: 220, // 160 regular + 60 max overtime
      },
      regularHours: {
        type: Number,
        required: true,
        min: 0,
        max: 160, // Standard monthly hours
      },
      overtimeHours: {
        type: Number,
        required: true,
        min: 0,
        max: 60, // Increased from 40 to 60 for better flexibility
      },
      // New: Track different overtime tiers
      standardOvertimeHours: {
        type: Number,
        default: 0,
        min: 0,
        max: 40, // First 40 overtime hours at 1.5x rate
      },
      premiumOvertimeHours: {
        type: Number,
        default: 0,
        min: 0,
        max: 20, // Additional 20 hours at 2x rate (total 60 max)
      },
      standardWorkingHours: {
        type: Number,
        default: 160,
      },
    },
    salaryBreakdown: {
      basicSalary: {
        type: Number,
        required: true,
        min: 15000, // Kenya minimum wage consideration
      },
      hourlyRate: {
        type: Number,
        required: true,
        min: 0,
      },
      standardOvertimeRate: {
        type: Number,
        required: true,
        min: 0,
      },
      premiumOvertimeRate: {
        type: Number,
        required: true,
        min: 0,
      },
      regularPay: {
        type: Number,
        required: true,
        min: 0,
      },
      standardOvertimePay: {
        type: Number,
        default: 0,
        min: 0,
      },
      premiumOvertimePay: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalOvertimePay: {
        type: Number,
        default: 0,
        min: 0,
      },
      grossPay: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    deductions: {
      paye: {
        type: Number,
        default: 0,
        min: 0,
      },
      nhif: {
        type: Number,
        default: 0,
        min: 0,
      },
      nssf: {
        type: Number,
        default: 0,
        min: 0,
      },
      housingLevy: {
        type: Number,
        default: 0,
        min: 0,
      },
      otherDeductions: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalDeductions: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    netPay: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Processing", "Paid", "Failed", "Cancelled"],
      default: "Pending",
    },
    paymentDetails: {
      stripePaymentIntentId: {
        type: String,
        default: null,
      },
      stripeTransferId: {
        type: String,
        default: null,
      },
      paymentDate: {
        type: Date,
        default: null,
      },
      paymentMethod: {
        type: String,
        enum: ["stripe_transfer", "bank_transfer", "cash", "check"],
        default: "stripe_transfer",
      },
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    // New: Overtime warnings and approvals
    overtimeApproval: {
      required: {
        type: Boolean,
        default: false,
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      approvedDate: {
        type: Date,
        default: null,
      },
      reason: {
        type: String,
        default: "",
      },
    },
  },
  { timestamps: true }
);

// Enhanced pre-save middleware with better overtime logic
payrollSchema.pre('save', function(next) {
  // Calculate hourly rate
  this.salaryBreakdown.hourlyRate = this.salaryBreakdown.basicSalary / this.attendanceData.standardWorkingHours;
  
  // Set overtime rates (Kenya Labour Act compliant)
  this.salaryBreakdown.standardOvertimeRate = this.salaryBreakdown.hourlyRate * 1.5; // First tier: 1.5x
  this.salaryBreakdown.premiumOvertimeRate = this.salaryBreakdown.hourlyRate * 2.0;   // Second tier: 2x
  
  // Distribute overtime hours into tiers
  this.distributeOvertimeHours();
  
  // Calculate regular pay (ensuring we don't pay more than worked)
  const actualRegularHours = Math.min(this.attendanceData.regularHours, this.attendanceData.standardWorkingHours);
  this.salaryBreakdown.regularPay = actualRegularHours * this.salaryBreakdown.hourlyRate;
  
  // Calculate overtime pay by tiers
  this.salaryBreakdown.standardOvertimePay = this.attendanceData.standardOvertimeHours * this.salaryBreakdown.standardOvertimeRate;
  this.salaryBreakdown.premiumOvertimePay = this.attendanceData.premiumOvertimeHours * this.salaryBreakdown.premiumOvertimeRate;
  this.salaryBreakdown.totalOvertimePay = this.salaryBreakdown.standardOvertimePay + this.salaryBreakdown.premiumOvertimePay;
  
  // Calculate gross pay
  this.salaryBreakdown.grossPay = this.salaryBreakdown.regularPay + this.salaryBreakdown.totalOvertimePay;
  
  // Set overtime approval requirement if excessive hours
  if (this.attendanceData.overtimeHours > 30) {
    this.overtimeApproval.required = true;
  }
  
  // Calculate deductions
  this.calculateDeductions();
  
  // Calculate net pay
  this.netPay = this.salaryBreakdown.grossPay - this.deductions.totalDeductions;
  
  next();
});

// Method to distribute overtime hours into tiers
payrollSchema.methods.distributeOvertimeHours = function() {
  const totalOvertime = this.attendanceData.overtimeHours;
  
  if (totalOvertime <= 40) {
    // All overtime at standard rate (1.5x)
    this.attendanceData.standardOvertimeHours = totalOvertime;
    this.attendanceData.premiumOvertimeHours = 0;
  } else {
    // First 40 hours at standard rate, remainder at premium rate
    this.attendanceData.standardOvertimeHours = 40;
    this.attendanceData.premiumOvertimeHours = Math.min(totalOvertime - 40, 20); // Cap at 20 premium hours
  }
};

// Enhanced deductions calculation with Kenya's latest rates
payrollSchema.methods.calculateDeductions = function() {
  const grossPay = this.salaryBreakdown.grossPay;
  
  // PAYE calculation (Kenya Tax Bands 2024)
  let paye = 0;
  if (grossPay <= 24000) {
    paye = grossPay * 0.1;
  } else if (grossPay <= 32333) {
    paye = 2400 + ((grossPay - 24000) * 0.25);
  } else if (grossPay <= 500000) {
    paye = 4483.25 + ((grossPay - 32333) * 0.3);
  } else if (grossPay <= 800000) {
    paye = 144783.35 + ((grossPay - 500000) * 0.325);
  } else {
    paye = 242283.35 + ((grossPay - 800000) * 0.35);
  }
  
  // Personal relief
  paye = Math.max(0, paye - 2400);
  
  // NHIF calculation (updated rates)
  let nhif = 0;
  if (grossPay <= 5999) nhif = 150;
  else if (grossPay <= 7999) nhif = 300;
  else if (grossPay <= 11999) nhif = 400;
  else if (grossPay <= 14999) nhif = 500;
  else if (grossPay <= 19999) nhif = 600;
  else if (grossPay <= 24999) nhif = 750;
  else if (grossPay <= 29999) nhif = 850;
  else if (grossPay <= 34999) nhif = 900;
  else if (grossPay <= 39999) nhif = 950;
  else if (grossPay <= 44999) nhif = 1000;
  else if (grossPay <= 49999) nhif = 1100;
  else if (grossPay <= 59999) nhif = 1200;
  else if (grossPay <= 69999) nhif = 1300;
  else if (grossPay <= 79999) nhif = 1400;
  else if (grossPay <= 89999) nhif = 1500;
  else if (grossPay <= 99999) nhif = 1600;
  else nhif = 1700;
  
  // NSSF calculation (Tier I and II)
  const nssfTier1 = Math.min(grossPay, 7000) * 0.06; // 6% of first 7,000
  const nssfTier2 = grossPay > 7000 ? Math.min(grossPay - 7000, 29000) * 0.06 : 0; // 6% of next 29,000
  const nssf = nssfTier1 + nssfTier2;
  
  // Housing Levy (1.5% introduced in Kenya)
  const housingLevy = grossPay * 0.015;
  
  this.deductions.paye = Math.round(paye * 100) / 100;
  this.deductions.nhif = nhif;
  this.deductions.nssf = Math.round(nssf * 100) / 100;
  this.deductions.housingLevy = Math.round(housingLevy * 100) / 100;
  this.deductions.totalDeductions = 
    this.deductions.paye + 
    this.deductions.nhif + 
    this.deductions.nssf + 
    this.deductions.housingLevy + 
    this.deductions.otherDeductions;
};

// Method to validate overtime limits and working hours
payrollSchema.methods.validateWorkingHours = function() {
  const errors = [];
  
  // Check maximum working hours (Kenya Labour Act: 60 hours/week max)
  const weeklyHours = this.attendanceData.totalHours / 4;
  if (weeklyHours > 60) {
    errors.push(`Weekly hours (${weeklyHours.toFixed(1)}) exceed legal limit of 60 hours`);
  }
  
  // Check if overtime requires approval
  if (this.attendanceData.overtimeHours > 30 && !this.overtimeApproval.approvedBy) {
    errors.push(`Overtime hours (${this.attendanceData.overtimeHours}) require management approval`);
  }
  
  // Check for excessive premium overtime
  if (this.attendanceData.premiumOvertimeHours > 15) {
    errors.push(`Premium overtime hours (${this.attendanceData.premiumOvertimeHours}) are excessive`);
  }
  
  return errors;
};

// Static method to get overtime policy
payrollSchema.statics.getOvertimePolicy = function() {
  return {
    standardWorkingHours: 160, // per month
    maxRegularHours: 160,
    maxOvertimeHours: 60,
    overtimeTiers: [
      {
        name: "Standard Overtime",
        hours: "1-40",
        rate: "1.5x hourly rate",
        description: "First 40 overtime hours"
      },
      {
        name: "Premium Overtime", 
        hours: "41-60",
        rate: "2.0x hourly rate",
        description: "Additional overtime beyond 40 hours"
      }
    ],
    approvalRequired: {
      threshold: 30,
      description: "Overtime exceeding 30 hours requires management approval"
    },
    legalLimit: {
      weeklyHours: 60,
      monthlyHours: 260,
      description: "Kenya Labour Act maximum working hours"
    }
  };
};

// Indexes for efficient querying
payrollSchema.index({ employee: 1, 'payPeriod.startDate': 1, 'payPeriod.endDate': 1 }, { unique: true });
payrollSchema.index({ paymentStatus: 1 });
payrollSchema.index({ 'payPeriod.startDate': 1, 'payPeriod.endDate': 1 });
payrollSchema.index({ 'attendanceData.overtimeHours': 1 });
payrollSchema.index({ 'overtimeApproval.required': 1 });

export const Payroll = mongoose.model("Payroll", payrollSchema);