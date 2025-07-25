import { Router } from "express";
import { adminRoute, protectRoute } from "../middleware/protectRoute.js";
import { Payroll } from "../models/Payroll.model.js";
import { User } from "../models/User.model.js";
import { Attendance } from "../models/Attendance.model.js";
import { Notification } from "../models/Notifications.model.js";
import { stripe } from "../lib/stripe.js";
import mongoose from "mongoose";

const router = Router();

router.use(protectRoute);

// Get overtime policy information
router.get("/overtime-policy", async (req, res) => {
  try {
    const policy = Payroll.getOvertimePolicy();
    res.status(200).json({
      success: true,
      policy
    });
  } catch (error) {
    console.error("Error fetching overtime policy:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

// Get employee's payroll history with overtime breakdown
router.get("/", async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { limit = 10, page = 1 } = req.query;
    
    const payrolls = await Payroll.find({ employee: employeeId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate("employee", "fullName email position")
      .populate("approvedBy", "fullName")
      .populate("overtimeApproval.approvedBy", "fullName");

    const total = await Payroll.countDocuments({ employee: employeeId });

    // Calculate overtime statistics
    const overtimeStats = await Payroll.aggregate([
      { $match: { employee: new mongoose.Types.ObjectId(employeeId) } },
      {
        $group: {
          _id: null,
          totalOvertimeHours: { $sum: "$attendanceData.overtimeHours" },
          totalOvertimePay: { $sum: "$salaryBreakdown.totalOvertimePay" },
          averageOvertimeHours: { $avg: "$attendanceData.overtimeHours" },
          maxOvertimeInMonth: { $max: "$attendanceData.overtimeHours" }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      payrolls,
      overtimeStats: overtimeStats[0] || {
        totalOvertimeHours: 0,
        totalOvertimePay: 0,
        averageOvertimeHours: 0,
        maxOvertimeInMonth: 0
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching payroll history:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

// Admin routes
router.use(adminRoute);

// Enhanced payroll generation with overtime validation
router.post("/generate", async (req, res) => {
  try {
    const { startDate, endDate, validateOvertime = true } = req.body;
    const adminId = req.user._id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: "Start date must be before end date"
      });
    }

    // Get all active employees
    const employees = await User.find({ 
      employeeStatus: "Active",
      role: "employee" 
    });

    const generatedPayrolls = [];
    const errors = [];
    const overtimeWarnings = [];

    for (const employee of employees) {
      try {
        // Check if payroll already exists
        const existingPayroll = await Payroll.findOne({
          employee: employee._id,
          'payPeriod.startDate': start,
          'payPeriod.endDate': end
        });

        if (existingPayroll) {
          errors.push({
            employee: employee.fullName,
            error: "Payroll already exists for this period"
          });
          continue;
        }

        // Calculate attendance data
        const attendanceRecords = await Attendance.find({
          employee: employee._id,
          date: { $gte: start, $lte: end }
        });

        const attendanceData = attendanceRecords.reduce((acc, record) => {
          acc.totalHours += record.totalHours || 0;
          acc.regularHours += record.regularHours || 0;
          acc.overtimeHours += record.overtimeHours || 0;
          return acc;
        }, { totalHours: 0, regularHours: 0, overtimeHours: 0 });

        // Apply safety caps
        attendanceData.regularHours = Math.min(attendanceData.regularHours, 160);
        attendanceData.overtimeHours = Math.min(attendanceData.overtimeHours, 60);
        attendanceData.totalHours = attendanceData.regularHours + attendanceData.overtimeHours;

        // Create payroll record
        const payroll = new Payroll({
          employee: employee._id,
          payPeriod: { startDate: start, endDate: end },
          attendanceData: {
            ...attendanceData,
            standardWorkingHours: 160
          },
          salaryBreakdown: {
            basicSalary: employee.basicSalary
          },
          approvedBy: adminId,
          approvedDate: new Date()
        });

        // Validate working hours if requested
        if (validateOvertime) {
          const validationErrors = payroll.validateWorkingHours();
          if (validationErrors.length > 0) {
            overtimeWarnings.push({
              employee: employee.fullName,
              warnings: validationErrors,
              overtimeHours: attendanceData.overtimeHours
            });
          }
        }

        await payroll.save();
        generatedPayrolls.push(payroll);

        // Create notification with overtime details
        const overtimeMessage = attendanceData.overtimeHours > 0 
          ? ` (including ${attendanceData.overtimeHours} overtime hours)`
          : '';

        await Notification.create({
          recipient: employee._id,
          sender: adminId,
          title: "Payroll Generated",
          message: `Your payroll for period ${start.toDateString()} to ${end.toDateString()} has been generated${overtimeMessage}. Net pay: KES ${payroll.netPay.toLocaleString()}`,
          type: "payroll"
        });

      } catch (employeeError) {
        console.error(`Error generating payroll for ${employee.fullName}:`, employeeError);
        errors.push({
          employee: employee.fullName,
          error: employeeError.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Generated ${generatedPayrolls.length} payroll records`,
      generatedCount: generatedPayrolls.length,
      errorCount: errors.length,
      overtimeWarningCount: overtimeWarnings.length,
      payrolls: generatedPayrolls,
      errors: errors.length > 0 ? errors : undefined,
      overtimeWarnings: overtimeWarnings.length > 0 ? overtimeWarnings : undefined
    });

  } catch (error) {
    console.error("Error generating payrolls:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

// Approve overtime for specific payroll
router.post("/:payrollId/approve-overtime", async (req, res) => {
  try {
    const { payrollId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(payrollId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid payroll ID" 
      });
    }

    const payroll = await Payroll.findById(payrollId)
      .populate("employee", "fullName email");

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll record not found"
      });
    }

    if (!payroll.overtimeApproval.required) {
      return res.status(400).json({
        success: false,
        message: "This payroll does not require overtime approval"
      });
    }

    if (payroll.overtimeApproval.approvedBy) {
      return res.status(400).json({
        success: false,
        message: "Overtime has already been approved"
      });
    }

    // Approve overtime
    payroll.overtimeApproval.approvedBy = adminId;
    payroll.overtimeApproval.approvedDate = new Date();
    payroll.overtimeApproval.reason = reason || "Approved by management";

    await payroll.save();

    // Create notification
    await Notification.create({
      recipient: payroll.employee._id,
      sender: adminId,
      title: "Overtime Approved",
      message: `Your overtime hours (${payroll.attendanceData.overtimeHours} hours) have been approved for the pay period.`,
      type: "payroll"
    });

    res.status(200).json({
      success: true,
      message: "Overtime approved successfully",
      payroll
    });

  } catch (error) {
    console.error("Error approving overtime:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

// Get overtime analytics for admin
router.get("/admin/overtime-analytics", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate && endDate) {
      filter['payPeriod.startDate'] = { $gte: new Date(startDate) };
      filter['payPeriod.endDate'] = { $lte: new Date(endDate) };
    }

    const analytics = await Payroll.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalEmployees: { $addToSet: "$employee" },
          totalOvertimeHours: { $sum: "$attendanceData.overtimeHours" },
          totalStandardOvertimeHours: { $sum: "$attendanceData.standardOvertimeHours" },
          totalPremiumOvertimeHours: { $sum: "$attendanceData.premiumOvertimeHours" },
          totalOvertimePay: { $sum: "$salaryBreakdown.totalOvertimePay" },
          averageOvertimeHours: { $avg: "$attendanceData.overtimeHours" },
          maxOvertimeHours: { $max: "$attendanceData.overtimeHours" },
          employeesWithOvertime: {
            $sum: { $cond: [{ $gt: ["$attendanceData.overtimeHours", 0] }, 1, 0] }
          },
          overtimeApprovalsRequired: {
            $sum: { $cond: ["$overtimeApproval.required", 1, 0] }
          },
          overtimeApprovalsGiven: {
            $sum: { $cond: ["$overtimeApproval.approvedBy", 1, 0] }
          }
        }
      },
      {
        $project: {
          totalEmployees: { $size: "$totalEmployees" },
          totalOvertimeHours: 1,
          totalStandardOvertimeHours: 1,
          totalPremiumOvertimeHours: 1,
          totalOvertimePay: 1,
          averageOvertimeHours: { $round: ["$averageOvertimeHours", 2] },
          maxOvertimeHours: 1,
          employeesWithOvertime: 1,
          overtimeParticipationRate: {
            $round: [{ $multiply: [{ $divide: ["$employeesWithOvertime", { $size: "$totalEmployees" }] }, 100] }, 2]
          },
          overtimeApprovalsRequired: 1,
          overtimeApprovalsGiven: 1,
          pendingApprovals: { $subtract: ["$overtimeApprovalsRequired", "$overtimeApprovalsGiven"] }
        }
      }
    ]);

    // Get top overtime employees
    const topOvertimeEmployees = await Payroll.aggregate([
      { $match: { ...filter, "attendanceData.overtimeHours": { $gt: 0 } } },
      {
        $group: {
          _id: "$employee",
          totalOvertimeHours: { $sum: "$attendanceData.overtimeHours" },
          totalOvertimePay: { $sum: "$salaryBreakdown.totalOvertimePay" },
          payrollCount: { $sum: 1 }
        }
      },
      { $sort: { totalOvertimeHours: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "employee"
        }
      },
      {
        $project: {
          employeeName: { $arrayElemAt: ["$employee.fullName", 0] },
          employeePosition: { $arrayElemAt: ["$employee.position", 0] },
          totalOvertimeHours: 1,
          totalOvertimePay: 1,
          averageOvertimePerMonth: { $round: [{ $divide: ["$totalOvertimeHours", "$payrollCount"] }, 2] }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      analytics: analytics[0] || {
        totalEmployees: 0,
        totalOvertimeHours: 0,
        totalStandardOvertimeHours: 0,
        totalPremiumOvertimeHours: 0,
        totalOvertimePay: 0,
        averageOvertimeHours: 0,
        maxOvertimeHours: 0,
        employeesWithOvertime: 0,
        overtimeParticipationRate: 0,
        overtimeApprovalsRequired: 0,
        overtimeApprovalsGiven: 0,
        pendingApprovals: 0
      },
      topOvertimeEmployees
    });

  } catch (error) {
    console.error("Error fetching overtime analytics:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

// Get payrolls requiring overtime approval
router.get("/admin/pending-overtime-approvals", async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;

    const pendingApprovals = await Payroll.find({
      'overtimeApproval.required': true,
      'overtimeApproval.approvedBy': null
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .populate("employee", "fullName email position department")
    .populate("approvedBy", "fullName");

    const total = await Payroll.countDocuments({
      'overtimeApproval.required': true,
      'overtimeApproval.approvedBy': null
    });

    res.status(200).json({
      success: true,
      pendingApprovals,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Error fetching pending overtime approvals:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

// Get all payroll records with enhanced overtime details (admin view)
router.get("/admin/all", async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      status, 
      employeeId, 
      hasOvertime,
      overtimeApprovalStatus,
      limit = 20, 
      page = 1 
    } = req.query;

    const filter = {};
    
    if (startDate && endDate) {
      filter['payPeriod.startDate'] = { $gte: new Date(startDate) };
      filter['payPeriod.endDate'] = { $lte: new Date(endDate) };
    }

    if (status) {
      filter.paymentStatus = status;
    }

    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      filter.employee = employeeId;
    }

    if (hasOvertime === 'true') {
      filter['attendanceData.overtimeHours'] = { $gt: 0 };
    } else if (hasOvertime === 'false') {
      filter['attendanceData.overtimeHours'] = { $eq: 0 };
    }

    if (overtimeApprovalStatus === 'required') {
      filter['overtimeApproval.required'] = true;
      filter['overtimeApproval.approvedBy'] = null;
    } else if (overtimeApprovalStatus === 'approved') {
      filter['overtimeApproval.approvedBy'] = { $ne: null };
    }

    const payrolls = await Payroll.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate("employee", "fullName email position department")
      .populate("approvedBy", "fullName")
      .populate("overtimeApproval.approvedBy", "fullName");

    const total = await Payroll.countDocuments(filter);

    // Enhanced summary statistics with overtime breakdown
    const summaryStats = await Payroll.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalGrossPay: { $sum: "$salaryBreakdown.grossPay" },
          totalNetPay: { $sum: "$netPay" },
          totalDeductions: { $sum: "$deductions.totalDeductions" },
          totalRegularPay: { $sum: "$salaryBreakdown.regularPay" },
          totalOvertimePay: { $sum: "$salaryBreakdown.totalOvertimePay" },
          totalStandardOvertimePay: { $sum: "$salaryBreakdown.standardOvertimePay" },
          totalPremiumOvertimePay: { $sum: "$salaryBreakdown.premiumOvertimePay" },
          totalOvertimeHours: { $sum: "$attendanceData.overtimeHours" },
          totalStandardOvertimeHours: { $sum: "$attendanceData.standardOvertimeHours" },
          totalPremiumOvertimeHours: { $sum: "$attendanceData.premiumOvertimeHours" },
          averageNetPay: { $avg: "$netPay" },
          averageOvertimeHours: { $avg: "$attendanceData.overtimeHours" },
          totalRecords: { $sum: 1 },
          recordsWithOvertime: {
            $sum: { $cond: [{ $gt: ["$attendanceData.overtimeHours", 0] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      payrolls,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      summary: summaryStats[0] || {
        totalGrossPay: 0,
        totalNetPay: 0,
        totalDeductions: 0,
        totalRegularPay: 0,
        totalOvertimePay: 0,
        totalStandardOvertimePay: 0,
        totalPremiumOvertimePay: 0,
        totalOvertimeHours: 0,
        totalStandardOvertimeHours: 0,
        totalPremiumOvertimeHours: 0,
        averageNetPay: 0,
        averageOvertimeHours: 0,
        totalRecords: 0,
        recordsWithOvertime: 0
      }
    });

  } catch (error) {
    console.error("Error fetching admin payrolls:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

// Bulk approve overtime for multiple payrolls
router.post("/admin/bulk-approve-overtime", async (req, res) => {
  try {
    const { payrollIds, reason } = req.body;
    const adminId = req.user._id;

    if (!Array.isArray(payrollIds) || payrollIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Payroll IDs array is required"
      });
    }

    const invalidIds = payrollIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payroll IDs found",
        invalidIds
      });
    }

    const payrolls = await Payroll.find({
      _id: { $in: payrollIds },
      'overtimeApproval.required': true,
      'overtimeApproval.approvedBy': null
    }).populate("employee", "fullName email");

    if (payrolls.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No eligible payrolls found for overtime approval"
      });
    }

    const approvedPayrolls = [];
    const errors = [];

    for (const payroll of payrolls) {
      try {
        payroll.overtimeApproval.approvedBy = adminId;
        payroll.overtimeApproval.approvedDate = new Date();
        payroll.overtimeApproval.reason = reason || "Bulk approved by management";

        await payroll.save();

        // Create notification
        await Notification.create({
          recipient: payroll.employee._id,
          sender: adminId,
          title: "Overtime Approved",
          message: `Your overtime hours (${payroll.attendanceData.overtimeHours} hours) have been approved.`,
          type: "payroll"
        });

        approvedPayrolls.push({
          payrollId: payroll._id,
          employeeName: payroll.employee.fullName,
          overtimeHours: payroll.attendanceData.overtimeHours
        });

      } catch (approvalError) {
        console.error(`Error approving overtime for payroll ${payroll._id}:`, approvalError);
        errors.push({
          payrollId: payroll._id,
          employeeName: payroll.employee.fullName,
          error: approvalError.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk overtime approval completed. ${approvedPayrolls.length} approved, ${errors.length} failed.`,
      approvedPayrolls,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalProcessed: payrolls.length,
        approved: approvedPayrolls.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error("Error in bulk overtime approval:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

// Enhanced payment processing with overtime validation
router.post("/pay/:payrollId", async (req, res) => {
  try {
    const { payrollId } = req.params;
    const { forcePayment = false } = req.body;
    const adminId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(payrollId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid payroll ID" 
      });
    }

    const payroll = await Payroll.findById(payrollId)
      .populate("employee", "fullName email bankDetails");

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll record not found"
      });
    }

    if (payroll.paymentStatus === "Paid") {
      return res.status(400).json({
        success: false,
        message: "Payroll has already been paid"
      });
    }

    // Check overtime approval requirements
    if (payroll.overtimeApproval.required && !payroll.overtimeApproval.approvedBy && !forcePayment) {
      return res.status(400).json({
        success: false,
        message: "Overtime approval required before payment can be processed",
        requiresOvertimeApproval: true,
        overtimeHours: payroll.attendanceData.overtimeHours
      });
    }

    // Validate working hours
    const validationErrors = payroll.validateWorkingHours();
    if (validationErrors.length > 0 && !forcePayment) {
      return res.status(400).json({
        success: false,
        message: "Working hours validation failed",
        validationErrors,
        canForcePayment: true
      });
    }

    // Validate employee bank details
    const employee = payroll.employee;
    if (!employee.bankDetails.accountNumber || !employee.bankDetails.bankName) {
      return res.status(400).json({
        success: false,
        message: "Employee bank details are incomplete"
      });
    }

    // Update status to processing
    payroll.paymentStatus = "Processing";
    await payroll.save();

    try {
      // Create enhanced Stripe payment intent with overtime details
      const overtimeDescription = payroll.attendanceData.overtimeHours > 0 
        ? ` (Regular: KES ${payroll.salaryBreakdown.regularPay.toLocaleString()}, Overtime: KES ${payroll.salaryBreakdown.totalOvertimePay.toLocaleString()})`
        : '';

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(payroll.netPay * 100),
        currency: 'kes',
        description: `Salary payment for ${employee.fullName} - Period: ${payroll.payPeriod.startDate.toDateString()} to ${payroll.payPeriod.endDate.toDateString()}${overtimeDescription}`,
        metadata: {
          payrollId: payroll._id.toString(),
          employeeId: employee._id.toString(),
          employeeName: employee.fullName,
          payPeriod: `${payroll.payPeriod.startDate.toDateString()} - ${payroll.payPeriod.endDate.toDateString()}`,
          regularHours: payroll.attendanceData.regularHours.toString(),
          overtimeHours: payroll.attendanceData.overtimeHours.toString(),
          standardOvertimeHours: payroll.attendanceData.standardOvertimeHours.toString(),
          premiumOvertimeHours: payroll.attendanceData.premiumOvertimeHours.toString(),
          grossPay: payroll.salaryBreakdown.grossPay.toString(),
          netPay: payroll.netPay.toString()
        },
        automatic_payment_methods: {
          enabled: true
        }
      });

      // Update payroll with payment details
      payroll.paymentDetails.stripePaymentIntentId = paymentIntent.id;
      payroll.paymentDetails.paymentDate = new Date();
      payroll.paymentStatus = "Paid";
      await payroll.save();

      // Create enhanced notification with overtime breakdown
      let notificationMessage = `Your salary of KES ${payroll.netPay.toLocaleString()} has been processed and will be transferred to your account ending in ***${employee.bankDetails.accountNumber.slice(-4)}.`;
      
      if (payroll.attendanceData.overtimeHours > 0) {
        notificationMessage += ` This includes KES ${payroll.salaryBreakdown.totalOvertimePay.toLocaleString()} for ${payroll.attendanceData.overtimeHours} overtime hours.`;
      }

      await Notification.create({
        recipient: employee._id,
        sender: adminId,
        title: "Salary Paid",
        message: notificationMessage,
        type: "payroll"
      });

      res.status(200).json({
        success: true,
        message: "Payment processed successfully",
        payroll,
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        },
        overtimeDetails: payroll.attendanceData.overtimeHours > 0 ? {
          totalOvertimeHours: payroll.attendanceData.overtimeHours,
          standardOvertimeHours: payroll.attendanceData.standardOvertimeHours,
          premiumOvertimeHours: payroll.attendanceData.premiumOvertimeHours,
          totalOvertimePay: payroll.salaryBreakdown.totalOvertimePay,
          standardOvertimePay: payroll.salaryBreakdown.standardOvertimePay,
          premiumOvertimePay: payroll.salaryBreakdown.premiumOvertimePay
        } : null
      });

    } catch (stripeError) {
      console.error("Stripe payment error:", stripeError);
      
      // Update payroll status to failed
      payroll.paymentStatus = "Failed";
      await payroll.save();

      // Create failure notification
      await Notification.create({
        recipient: employee._id,
        sender: adminId,
        title: "Payment Failed",
        message: `Payment processing failed for your salary. Please contact HR for assistance.`,
        type: "payroll"
      });

      res.status(400).json({
        success: false,
        message: "Payment processing failed",
        error: stripeError.message
      });
    }

  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

// Enhanced update payroll record with overtime validation
router.put("/:payrollId", async (req, res) => {
  try {
    const { payrollId } = req.params;
    const { notes, otherDeductions, attendanceOverride } = req.body;
    const adminId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(payrollId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid payroll ID" 
      });
    }

    const payroll = await Payroll.findById(payrollId);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll record not found"
      });
    }

    if (payroll.paymentStatus === "Paid") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify paid payroll records"
      });
    }

    // Update allowed fields
    if (notes !== undefined) {
      payroll.notes = notes;
    }

    if (otherDeductions !== undefined && typeof otherDeductions === 'number' && otherDeductions >= 0) {
      payroll.deductions.otherDeductions = otherDeductions;
    }

    // Allow admin to override attendance data if necessary
    if (attendanceOverride && req.user.role === 'admin') {
      if (attendanceOverride.regularHours !== undefined) {
        payroll.attendanceData.regularHours = Math.min(Math.max(0, attendanceOverride.regularHours), 160);
      }
      if (attendanceOverride.overtimeHours !== undefined) {
        payroll.attendanceData.overtimeHours = Math.min(Math.max(0, attendanceOverride.overtimeHours), 60);
      }
      payroll.attendanceData.totalHours = payroll.attendanceData.regularHours + payroll.attendanceData.overtimeHours;
      
      // Check if overtime approval is needed after override
      if (payroll.attendanceData.overtimeHours > 30) {
        payroll.overtimeApproval.required = true;
        payroll.overtimeApproval.approvedBy = null;
        payroll.overtimeApproval.approvedDate = null;
      } else {
        payroll.overtimeApproval.required = false;
      }
    }

    await payroll.save(); // This will trigger the pre-save middleware to recalculate

    res.status(200).json({
      success: true,
      message: "Payroll updated successfully",
      payroll,
      validationErrors: payroll.validateWorkingHours()
    });

  } catch (error) {
    console.error("Error updating payroll:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

// Rest of the existing routes (batch payment, delete, etc.) remain the same...
// [Previous batch payment and delete routes would continue here]

export { router as payrollRoutes };