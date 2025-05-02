const leaveRequestSchema = new mongoose.Schema(
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
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
      numberOfDays: {
        type: Number,
        required: true,
      }, // Calculate this upon submission, and should be <= LeaveType.maxDays
      reason: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected", "Cancelled"],
        default: "Pending",
      },
      approver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      comments: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          comment: String,
          date: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      approvedDate: {
        type: Date,
      },
      rejectionReason: {
        type: String,
      },
    },
    { timestamps: true }
  ); // timestamps adds createdAt, updatedAt
  export const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);