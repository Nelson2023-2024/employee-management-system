// pages/leavePage.jsx
import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Loader2, Calendar, Clock, AlertCircle, Trash2 } from "lucide-react";
import { useLeaveTypes, useToggleLeave, useMyLeaveRequests } from "../../hooks/useLeave";
import { useDeleteLeaveType } from "../../hooks/useLeave"; // Import the delete hook
import { toast } from "react-hot-toast"; // Import toast for notifications
import { useAuth } from "../../hooks/useAuth"; // Import auth hook to check admin status

const LeaveTypeCard = ({ leave, activeRequests }) => {
  // Use the toggle leave hook
  const { toggleLeave, isLoading } = useToggleLeave();
  
  // Use the delete leave type hook
  const { mutate: deleteLeaveType, isLoading: isDeleting } = useDeleteLeaveType();
  
  // For debugging delete functionality
  const handleDeleteWithLogging = (id) => {
    console.log("Attempting to delete leave type with ID:", id);
    deleteLeaveType(id);
  };
  
  // Get current user to check if admin
  const { data: authUser } = useAuth();
  const isAdmin = authUser?.role === "admin";
  console.log("Auth user:", authUser);
  console.log("Is admin?", isAdmin);

  // Debug - see what's happening with activeRequests
  console.log("Active requests for", leave.name, ":", activeRequests);
  
  // Check if this leave type is already applied for - explicit true/false value
  const isApplied = Boolean(activeRequests?.some(
    request => request.leaveType._id === leave._id && 
    ["Pending", "Approved"].includes(request.status)
  ));

  // Handle the button click
  const handleToggleLeave = () => {
    toggleLeave(leave._id);
  };
  
  // Handle delete button click
  const handleDeleteLeave = () => {
    if (window.confirm(`Are you sure you want to delete the "${leave.name}" leave type?`)) {
      console.log("Deleting leave type:", leave);
      handleDeleteWithLogging(leave._id);
    }
  };

  return (
    <Card
      className="overflow-hidden transition-all hover:shadow-lg border-t-4"
      style={{ borderTopColor: getLeaveTypeColor(leave.name) }}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold">
              {leave.name}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Max {leave.maxDays} days</span>
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge
              variant={leave.requiresApproval ? "default" : "secondary"}
              className="shrink-0"
            >
              {leave.requiresApproval ? "Approval Needed" : "Auto-approve"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          {leave.description}
        </p>
        {isApplied && <Badge variant="outline">Applied</Badge>}
      </CardContent>

      <CardFooter className="bg-muted/50 pt-2 pb-2">
        <div className="w-full flex gap-2">
          <Button 
            className="flex-1 cursor-pointer" 
            variant={isApplied ? "destructive" : "default"} 
            size="sm"
            onClick={handleToggleLeave}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              isApplied ? (
                `Cancel ${leave.name}`
              ) : (
                `Apply for ${leave.name}`
              )
            )}
          </Button>
          
          {/* Delete button - only visible for admins */}
          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteLeave}
              disabled={isDeleting}
              className="cursor-pointer flex-shrink-0"
              title="Delete leave type"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
          
          {/* Debug Admin Status */}
          {process.env.NODE_ENV === 'development' && (
            <span className="text-xs text-muted-foreground hidden">Admin: {isAdmin ? 'Yes' : 'No'}</span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

// Function to generate consistent colors based on leave type name
function getLeaveTypeColor(leaveName) {
  const colorMap = {
    "Annual Leave": "#22c55e", // Green
    "Sick Leave": "#ef4444", // Red
    "Maternity Leave": "#ec4899", // Pink
    "Paternity Leave": "#3b82f6", // Blue
    "Study Leave": "#8b5cf6", // Purple
    "Unpaid Leave": "#64748b", // Slate
    "Bereavement Leave": "#6b7280", // Gray
    "Work From Home": "#0ea5e9", // Sky
    "Compensatory Off": "#f97316", // Orange
  };
  // Return the mapped color or a default color
  return colorMap[leaveName] || "#6366f1"; // Default to indigo
}

const LeavePage = () => {
  const { data: leaveTypesData, isLoading: isLoadingTypes, isError: isTypesError, error: typesError } = useLeaveTypes();
  const { data: myLeavesData, isLoading: isLoadingMyLeaves } = useMyLeaveRequests();

  // Combined loading state
  const isLoading = isLoadingTypes || isLoadingMyLeaves;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">
            Loading leave information...
          </p>
        </div>
      </div>
    );
  }

  if (isTypesError) {
    return (
      <div className="container max-w-2xl py-8 mx-auto">
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <span>{typesError.message || "Failed to load leave types"}</span>
        </div>
      </div>
    );
  }

  // Get active leave requests (Pending or Approved)
  const activeRequests = myLeavesData?.leaveRequests?.filter(
    request => ["Pending", "Approved"].includes(request.status)
  ) || [];

  return (
    <div className="container max-w-2xl py-8 mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Types</h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span>{leaveTypesData?.count} types of leave available for your use</span>
          </p>
        </div>
        
        {activeRequests.length > 0 && (
          <Badge variant="secondary" className="py-1 px-2">
            {activeRequests.length} Active Request{activeRequests.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {leaveTypesData?.leaveTypes?.map((leave) => (
          <LeaveTypeCard 
            key={leave._id} 
            leave={leave} 
            activeRequests={activeRequests}
          />
        ))}
      </div>
    </div>
  );
};

export default LeavePage;