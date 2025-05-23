// frontend/src/pages/attendance/AttendancePage.jsx

import React from "react";
import { format } from "date-fns";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Label } from "../../components/ui/label";

import {
  useMarkAttendance,
  useTodayAttendance,
} from "../../hooks/useAttendance";

// Skeleton Component for Loading State
const AttendanceSkeleton = () => {
  return (
    <div className="container max-w-2xl py-8 mx-auto">
      <Card className="p-6 space-y-6 animate-pulse">
        {/* Header Section Skeleton */}
        <div className="text-center space-y-2">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto"></div>
          <div className="h-5 bg-gray-200 rounded w-64 mx-auto"></div>
        </div>

        {/* Form Section Skeleton */}
        <div className="space-y-6">
          {/* Radio Group Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Present Option Skeleton */}
            <div className="flex flex-col items-center rounded-md border-2 border-gray-200 p-4 space-y-2">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-5 bg-gray-200 rounded w-16"></div>
            </div>

            {/* Late Option Skeleton */}
            <div className="flex flex-col items-center rounded-md border-2 border-gray-200 p-4 space-y-2">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-5 bg-gray-200 rounded w-12"></div>
            </div>

            {/* Absent Option Skeleton */}
            <div className="flex flex-col items-center rounded-md border-2 border-gray-200 p-4 space-y-2">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-5 bg-gray-200 rounded w-16"></div>
            </div>
          </div>

          {/* Button Skeleton */}
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </Card>
    </div>
  );
};

// Skeleton for Already Marked State
const AlreadyMarkedSkeleton = () => {
  return (
    <div className="container max-w-2xl py-8 mx-auto">
      <Card className="p-6 space-y-6 text-center animate-pulse">
        {/* Icon Skeleton */}
        <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto"></div>
        
        {/* Title Skeleton */}
        <div className="h-8 bg-gray-200 rounded w-48 mx-auto"></div>
        
        {/* Description Skeleton */}
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-64 mx-auto"></div>
          <div className="h-5 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
        
        {/* Timestamp Skeleton */}
        <div className="h-4 bg-gray-200 rounded w-56 mx-auto"></div>
      </Card>
    </div>
  );
};

const AttendancePage = () => {
  const {
    todayAttendance,
    isLoadingToday,
  } = useTodayAttendance();

  const {
    markAttendance,
    isMarking,
  } = useMarkAttendance();

  const [status, setStatus] = React.useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (status) {
      markAttendance(status);
    }
  };

  // Enhanced loading state with proper skeleton
  if (isLoadingToday) {
    return <AttendanceSkeleton />;
  }

  // Already marked state with potential skeleton (if needed)
  if (todayAttendance?.status) {
    return (
      <div className="container max-w-2xl py-8 mx-auto">
        <Card className="p-6 space-y-6 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Attendance Marked!</h1>
          <p>
            You've already marked yourself as{" "}
            <span className="font-semibold text-primary">
              {todayAttendance.status}
            </span>{" "}
            today.
          </p>
          {todayAttendance.createdAt && (
            <p className="text-sm text-muted-foreground">
              Marked at{" "}
              {format(
                new Date(todayAttendance.createdAt),
                "hh:mm a"
              )}. Please come back tomorrow!
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 mx-auto">
      <Card className="p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Daily Attendance</h1>
          <p className="text-muted-foreground">
            Select your attendance status for today
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <RadioGroup
            value={status}
            onValueChange={setStatus}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Present */}
            <div>
              <RadioGroupItem
                value="Present"
                id="present"
                className="peer sr-only"
              />
              <Label
                htmlFor="present"
                className="flex flex-col items-center rounded-md border-2 border-muted p-4 hover:bg-accent peer-checked:border-primary"
              >
                <span className="text-2xl">✅</span>
                <span className="font-semibold">Present</span>
              </Label>
            </div>

            {/* Late */}
            <div>
              <RadioGroupItem value="Late" id="late" className="peer sr-only" />
              <Label
                htmlFor="late"
                className="flex flex-col items-center rounded-md border-2 border-muted p-4 hover:bg-accent peer-checked:border-yellow-500"
              >
                <span className="text-2xl">⏰</span>
                <span className="font-semibold">Late</span>
              </Label>
            </div>

            {/* Absent */}
            <div>
              <RadioGroupItem
                value="Absent"
                id="absent"
                className="peer sr-only"
              />
              <Label
                htmlFor="absent"
                className="flex flex-col items-center rounded-md border-2 border-muted p-4 hover:bg-accent peer-checked:border-destructive"
              >
                <span className="text-2xl">❌</span>
                <span className="font-semibold">Absent</span>
              </Label>
            </div>
          </RadioGroup>

          <Button type="submit" className="w-full" disabled={!status || isMarking}>
            {isMarking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Mark Attendance"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AttendancePage;