import { useQuery } from "@tanstack/react-query";

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