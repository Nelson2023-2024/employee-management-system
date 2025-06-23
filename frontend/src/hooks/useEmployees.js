// src/hooks/useGetAllEmployees.js
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useGetAllEmployees() {
  const {
    data: employees,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["employees"], // Unique key for this query
    queryFn: async () => {
      try {
        const response = await fetch("http://localhost:5005/api/admin-mangage-employee/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Important for sending cookies/tokens
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch employees");
        }

        const data = await response.json();
        // The backend returns { users: [...] }, so we need to access data.users
        return data.users;
      } catch (error) {
        console.error("Error fetching employees:", error);
        throw error;
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to load employees.");
    },
  });

  return { employees, isLoading, isError, error };
}

// Hook for creating a new employee
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  const { mutate: createEmployee, isLoading } = useMutation({
    mutationFn: async (employeeData) => {
      const res = await fetch(
        "http://localhost:5005/api/admin-mangage-employee/register-employee",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(employeeData),
          credentials: "include",
        }
      );
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create employee");
      }
      return data;
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries(["employees"]);
      toast.success(payload.message || "Employee created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Could not create employee");
    },
  });

  return { createEmployee, isLoading };
}