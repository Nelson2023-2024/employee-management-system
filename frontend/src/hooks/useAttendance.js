// frontend/src/hooks/useAttendance.js

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

// Hook to mark attendance
export function useMarkAttendance() {
  const queryClient = useQueryClient();

  const {
    mutate: markAttendance,
    isLoading: isMarking,
    isError: isMarkError,
    error: markError,
  } = useMutation({
    mutationFn: async (status) => {
      const response = await fetch("http://localhost:5005/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to mark attendance");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["attendance"]);
      queryClient.invalidateQueries(["todayAttendance"]);
      toast.success("Attendance marked successfully!");
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to mark attendance");
    },
  });

  return { markAttendance, isMarking, isMarkError, markError };
}

// Hook to fetch today's attendance
export function useTodayAttendance() {
  const {
    data,
    isLoading: isLoadingToday,
    isError: isTodayError,
    error: todayError,
  } = useQuery({
    queryKey: ["todayAttendance"],
    queryFn: async () => {
      const response = await fetch(
        "http://localhost:5005/api/attendance/today",
        { credentials: "include" }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch today's attendance");
      }
      return data;
    },
  });

  return { todayAttendance: data, isLoadingToday, isTodayError, todayError };
}
