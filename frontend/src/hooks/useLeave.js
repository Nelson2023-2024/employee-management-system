// hooks/useAuth.js
import { useQuery } from "@tanstack/react-query";

export const useAuth = () => {
  return useQuery({
    queryKey: ["leaveData"],
    queryFn: async () => {
      const response = await fetch("http://localhost:5005/api/leave", {
        credentials: "include", // Important!
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Leave Fecth failed");
      return data.user;
    },
  });
};
