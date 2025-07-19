// routes/payroll.route.js
import { Router } from "express";
import { User } from "../models/User.model.js";
import { Department } from "../models/Department.model.js";
import { Attendance } from "../models/Attendance.model.js";
import { LeaveRequest } from "../models/LeaveRequest.model.js";
import { Notification } from "../models/Notifications.model.js";
import { Payroll } from "../models/Payroll.model.js";
import { adminRoute, protectRoute } from "../middleware/protectRoute.js";
import { stripe } from "../lib/stripe.js";

const router = Router();

// Calculate payroll for a specific period
router.post("/calculate", protectRoute, adminRoute, async (req, res) => {
  try {
    const { startDate, endDate, employeeIds } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate date range
    if (start >= end) {
      return res.status(400).json({ message: "Start date must be before end date" });
    }

    // Get employees (all or specific ones)
    const query = employeeIds && employeeIds.length > 0 
      ? { _id: { $in: employeeIds }, employeeStatus: "Active" }
      : { employeeStatus: "Active" };

    const employees = await User.find(query)
      .populate("department", "name")
      .select("-password");

    if (employees.length === 0) {
      return res.status(404).json({ message: "No active employees found" });
    }

    const payrollCalculations = [];

    for (const employee of employees) {
      // Validate employee has basic salary
      if (!employee.basicSalary || employee.basicSalary <= 0) {
        continue; // Skip employees without salary
      }

      // Calculate working days in period
      const totalWorkingDays = getWorkingDays(start, end);
      
      // Get attendance records for the period
      const attendanceRecords = await Attendance.find({
        employee: employee._id,
        date: { $gte: start, $lte: end }
      });

      // Get approved leave days in period
      const approvedLeaves = await LeaveRequest.find({
        employee: employee._id,
        status: "Approved",
        startDate: { $lte: end },
        endDate: { $gte: start }
      });

      // Calculate actual working days and leave days
      const presentDays = attendanceRecords.filter(a => a.status === "Present").length;
      const lateDays = attendanceRecords.filter(a => a.status === "Late").length;
      const absentDays = attendanceRecords.filter(a => a.status === "Absent").length;
      
      let totalLeaveDays = 0;
      approvedLeaves.forEach(leave => {
        const leaveStart = new Date(Math.max(leave.startDate, start));
        const leaveEnd = new Date(Math.min(leave.endDate, end));
        totalLeaveDays += getWorkingDays(leaveStart, leaveEnd);
      });

      // Calculate gross pay
      const dailyRate = employee.basicSalary / 30; // Assuming 30 days per month
      const grossPay = employee.basicSalary;

      // Calculate deductions
      const absentDeduction = absentDays * dailyRate;
      const lateDeduction = lateDays * (dailyRate * 0.1); // 10% deduction for late days
      
      // Calculate statutory deductions (Kenya rates)
      const nhifDeduction = calculateNHIF(grossPay);
      const nssfDeduction = calculateNSSF(grossPay);
      const payeDeduction = calculatePAYE(grossPay);

      const totalDeductions = absentDeduction + lateDeduction + nhifDeduction + nssfDeduction + payeDeduction;
      const netPay = Math.max(0, grossPay - totalDeductions); // Ensure net pay is not negative

      const payrollData = {
        employee: employee._id,
        employeeDetails: {
          fullName: employee.fullName,
          email: employee.email,
          position: employee.position,
          department: employee.department?.name || "Unknown",
          bankDetails: employee.bankDetails
        },
        period: {
          startDate: start,
          endDate: end
        },
        attendance: {
          totalWorkingDays,
          presentDays,
          lateDays,
          absentDays,
          leaveDays: totalLeaveDays
        },
        salary: {
          basicSalary: employee.basicSalary,
          grossPay,
          netPay
        },
        deductions: {
          absentDeduction: Math.round(absentDeduction * 100) / 100,
          lateDeduction: Math.round(lateDeduction * 100) / 100,
          nhifDeduction,
          nssfDeduction: Math.round(nssfDeduction * 100) / 100,
          payeDeduction: Math.round(payeDeduction * 100) / 100,
          totalDeductions: Math.round(totalDeductions * 100) / 100
        },
        status: "calculated"
      };

      payrollCalculations.push(payrollData);
    }

    res.status(200).json({
      message: "Payroll calculated successfully",
      period: { startDate: start, endDate: end },
      totalEmployees: payrollCalculations.length,
      payroll: payrollCalculations
    });

  } catch (error) {
    console.error("Payroll calculation error:", error.message);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Process payments via Stripe (Test Mode)
router.post("/process-payments", protectRoute, adminRoute, async (req, res) => {
  try {
    const { payrollData, paymentDescription = "Salary Payment" } = req.body;

    if (!payrollData || !Array.isArray(payrollData) || payrollData.length === 0) {
      return res.status(400).json({ message: "Payroll data is required" });
    }

    const paymentResults = [];
    const failedPayments = [];

    for (const payroll of payrollData) {
      try {
        // Validate employee data
        if (!payroll.employeeDetails?.email) {
          failedPayments.push({
            employee: payroll.employeeDetails?.fullName || "Unknown",
            reason: "No email address found"
          });
          continue;
        }

        if (payroll.salary.netPay <= 0) {
          failedPayments.push({
            employee: payroll.employeeDetails.fullName,
            reason: "Net pay is zero or negative"
          });
          continue;
        }

        // Create Stripe payment intent (TEST MODE)
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(payroll.salary.netPay * 100), // Convert to cents
          currency: 'kes', // Kenyan Shilling
          payment_method_types: ['card'],
          metadata: {
            employeeId: payroll.employee.toString(),
            employeeName: payroll.employeeDetails.fullName,
            payrollPeriod: `${payroll.period.startDate.toISOString().split('T')[0]} to ${payroll.period.endDate.toISOString().split('T')[0]}`,
            paymentType: 'salary'
          },
          description: `${paymentDescription} - ${payroll.employeeDetails.fullName}`,
          receipt_email: payroll.employeeDetails.email,
          // Automatically confirm for test mode (simulates successful payment)
          confirm: true,
          payment_method: 'pm_card_visa', // Test payment method
          return_url: process.env.CLIENT_URL || 'http://localhost:5173'
        });

        // Save payroll record to database
        const payrollRecord = await Payroll.create({
          employee: payroll.employee,
          period: payroll.period,
          attendance: payroll.attendance,
          salary: payroll.salary,
          deductions: payroll.deductions,
          stripePaymentIntentId: paymentIntent.id,
          paymentStatus: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
          paymentDate: paymentIntent.status === 'succeeded' ? new Date() : null,
          processedBy: req.user._id
        });

        // Create notification for employee
        await Notification.create({
          recipient: payroll.employee,
          sender: req.user._id,
          title: "Salary Payment Processed",
          message: `Your salary of KES ${payroll.salary.netPay.toLocaleString()} for the period ${new Date(payroll.period.startDate).toDateString()} to ${new Date(payroll.period.endDate).toDateString()} has been processed successfully.`,
          type: "payroll"
        });

        paymentResults.push({
          employee: payroll.employeeDetails.fullName,
          amount: payroll.salary.netPay,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          payrollRecordId: payrollRecord._id
        });

      } catch (paymentError) {
        console.error(`Payment error for ${payroll.employeeDetails?.fullName}:`, paymentError);
        failedPayments.push({
          employee: payroll.employeeDetails?.fullName || "Unknown",
          reason: paymentError.message || "Payment processing failed"
        });
      }
    }

    // Create notification for admin
    await Notification.create({
      recipient: req.user._id,
      sender: null,
      title: "Payroll Processing Complete",
      message: `Processed ${paymentResults.length} successful payments, ${failedPayments.length} failed payments.`,
      type: "system"
    });

    res.status(200).json({
      message: "Payroll processing completed",
      successful: paymentResults,
      failed: failedPayments,
      summary: {
        totalProcessed: paymentResults.length,
        totalFailed: failedPayments.length,
        totalAmount: paymentResults.reduce((sum, p) => sum + p.amount, 0)
      }
    });

  } catch (error) {
    console.error("Process payments error:", error.message);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Get payroll history
router.get("/history", protectRoute, adminRoute, async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, employeeId } = req.query;

    const query = {};
    if (startDate && endDate) {
      query['period.startDate'] = { $gte: new Date(startDate) };
      query['period.endDate'] = { $lte: new Date(endDate) };
    }
    if (employeeId) {
      query.employee = employeeId;
    }

    const payrolls = await Payroll.find(query)
      .populate('employee', 'fullName email position')
      .populate('processedBy', 'fullName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payroll.countDocuments(query);

    res.status(200).json({
      payrolls,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Get payroll history error:", error.message);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Generate payslip
router.get("/payslip/:payrollId", protectRoute, async (req, res) => {
  try {
    const { payrollId } = req.params;

    const payroll = await Payroll.findById(payrollId)
      .populate('employee', 'fullName email position')
      .populate('processedBy', 'fullName');

    if (!payroll) {
      return res.status(404).json({ message: "Payroll record not found" });
    }

    // Check if user is admin or the employee themselves
    if (req.user.role !== 'admin' && req.user._id.toString() !== payroll.employee._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({
      message: "Payslip retrieved successfully",
      payslip: {
        id: payroll._id,
        employee: payroll.employee,
        period: payroll.period,
        attendance: payroll.attendance,
        salary: payroll.salary,
        deductions: payroll.deductions,
        paymentStatus: payroll.paymentStatus,
        paymentDate: payroll.paymentDate,
        processedDate: payroll.createdAt,
        processedBy: payroll.processedBy
      }
    });

  } catch (error) {
    console.error("Get payslip error:", error.message);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Get employee's own payroll history
router.get("/my-payrolls", protectRoute, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const payrolls = await Payroll.find({ employee: req.user._id })
      .populate('processedBy', 'fullName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payroll.countDocuments({ employee: req.user._id });

    res.status(200).json({
      payrolls,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Get my payrolls error:", error.message);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Get payroll statistics for admin dashboard
router.get("/stats", protectRoute, adminRoute, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let startDate, endDate;
    if (month && year) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const stats = await Payroll.aggregate([
      {
        $match: {
          'period.startDate': { $gte: startDate },
          'period.endDate': { $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPayrolls: { $sum: 1 },
          totalGrossPay: { $sum: '$salary.grossPay' },
          totalNetPay: { $sum: '$salary.netPay' },
          totalDeductions: { $sum: '$deductions.totalDeductions' },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'succeeded'] }, 1, 0] }
          },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalPayrolls: 0,
      totalGrossPay: 0,
      totalNetPay: 0,
      totalDeductions: 0,
      successfulPayments: 0,
      pendingPayments: 0,
      failedPayments: 0
    };

    res.status(200).json({
      message: "Payroll statistics retrieved successfully",
      period: { startDate, endDate },
      stats: result
    });

  } catch (error) {
    console.error("Get payroll stats error:", error.message);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Update payment status (for manual updates or testing)
router.patch("/update-payment-status/:payrollId", protectRoute, adminRoute, async (req, res) => {
  try {
    const { payrollId } = req.params;
    const { status, notes } = req.body;

    if (!["pending", "processing", "succeeded", "failed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    const updateData = { 
      paymentStatus: status,
      ...(notes && { notes })
    };

    if (status === "succeeded") {
      updateData.paymentDate = new Date();
    }

    const payroll = await Payroll.findByIdAndUpdate(
      payrollId,
      updateData,
      { new: true }
    ).populate('employee', 'fullName email');

    if (!payroll) {
      return res.status(404).json({ message: "Payroll record not found" });
    }

    // Create notification for status change
    await Notification.create({
      recipient: payroll.employee._id,
      sender: req.user._id,
      title: "Payment Status Updated",
      message: `Your salary payment status has been updated to: ${status}`,
      type: "payroll"
    });

    res.status(200).json({
      message: "Payment status updated successfully",
      payroll
    });

  } catch (error) {
    console.error("Update payment status error:", error.message);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Utility functions
function getWorkingDays(startDate, endDate) {
  let workingDays = 0;
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    // Exclude weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
}

// Kenya NHIF rates (simplified but accurate)
function calculateNHIF(grossPay) {
  if (grossPay <= 5999) return 150;
  if (grossPay <= 7999) return 300;
  if (grossPay <= 11999) return 400;
  if (grossPay <= 14999) return 500;
  if (grossPay <= 19999) return 600;
  if (grossPay <= 24999) return 750;
  if (grossPay <= 29999) return 850;
  if (grossPay <= 34999) return 900;
  if (grossPay <= 39999) return 950;
  if (grossPay <= 44999) return 1000;
  if (grossPay <= 49999) return 1100;
  if (grossPay <= 59999) return 1200;
  if (grossPay <= 69999) return 1300;
  if (grossPay <= 79999) return 1400;
  if (grossPay <= 89999) return 1500;
  if (grossPay <= 99999) return 1600;
  return 1700; // For amounts above 100,000
}

// Kenya NSSF rates (6% of gross pay, max 1080)
function calculateNSSF(grossPay) {
  return Math.min(grossPay * 0.06, 1080);
}

// Simplified PAYE calculation (Kenya tax rates)
function calculatePAYE(grossPay) {
  const nhif = calculateNHIF(grossPay);
  const nssf = calculateNSSF(grossPay);
  const taxableIncome = grossPay - nhif - nssf;
  
  let tax = 0;
  
  if (taxableIncome <= 24000) {
    tax = taxableIncome * 0.1;
  } else if (taxableIncome <= 32333) {
    tax = 24000 * 0.1 + (taxableIncome - 24000) * 0.25;
  } else {
    tax = 24000 * 0.1 + 8333 * 0.25 + (taxableIncome - 32333) * 0.3;
  }
  
  // Personal relief
  tax = Math.max(0, tax - 2400);
  
  return tax;
}

export { router as payrollRoutes };

// Updated server.js file
/* 
Add this line to your imports:
import { payrollRoutes } from "./routes/payroll.route.js";

Add this line to your routes:
app.use("/api/payroll", payrollRoutes)
*/