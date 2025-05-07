import React from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, Calendar, Clock, AlertCircle } from "lucide-react";

// Custom hook for fetching leave types
export const useLeaveTypes = () => {
  return useQuery({
    queryKey: ["leaveTypes"],
    queryFn: async () => {
      const response = await fetch("http://localhost:5005/api/leave", {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch leave types");
      }

      const data = await response.json();
      return data;
    },
  });
};

const LeaveTypeCard = ({ leave }) => {
  return (
    <Card
      className="overflow-hidden transition-all hover:shadow-lg border-t-4"
      style={{ borderTopColor: getLeaveTypeColor(leave.name) }}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold">{leave.name}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Max {leave.maxDays} days</span>
            </CardDescription>
          </div>
          <Badge
            variant={leave.requiresApproval ? "default" : "secondary"}
            className="shrink-0"
          >
            {leave.requiresApproval ? "Approval Needed" : "Auto-approve"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {leave.description}
        </p>
      </CardContent>

      <CardFooter className="bg-muted/50 pt-2 pb-2">
        <Button className="w-full" variant="default" size="sm">
          Apply for {leave.name}
        </Button>
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
  const { data, isLoading, isError, error } = useLeaveTypes();

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

  if (isError) {
    return (
      <div className="container max-w-2xl py-8 mx-auto">
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <span>{error.message || "Failed to load leave types"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Types</h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span>{data.count} types of leave available for your use</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {data.leaveTypes.map((leave) => (
          <LeaveTypeCard key={leave._id} leave={leave} />
        ))}
      </div>
    </div>
  );
};

export default LeavePage;
