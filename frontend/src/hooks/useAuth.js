import { useQuery } from "@tanstack/react-query";

export const useAuth = () => {
  return useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");

      const data = await response.json();

      if (!res.ok) throw new Error(data.error || "Auth failed");
      return data;
    },
  });
};
