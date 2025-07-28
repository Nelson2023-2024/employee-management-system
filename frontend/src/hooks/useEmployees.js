// src/hooks/useEmployees.js
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useGetAllEmployees() {
  const {
    data: employees,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      try {
        const response = await fetch("http://localhost:5005/api/admin-mangage-employee/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch employees");
        }

        const data = await response.json();
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

// Hook for getting a single employee by ID
export function useGetEmployee(employeeId) {
  const {
    data: employee,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      try {
        const response = await fetch(`http://localhost:5005/api/admin-mangage-employee/${employeeId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch employee");
        }

        const data = await response.json();
        return data.user;
      } catch (error) {
        console.error("Error fetching employee:", error);
        throw error;
      }
    },
    enabled: !!employeeId, // Only run query if employeeId is provided
    onError: (error) => {
      toast.error(error.message || "Failed to load employee details.");
    },
  });

  return { employee, isLoading, isError, error };
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

// Hook for deleting an employee
export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  const { mutate: deleteEmployee, isLoading } = useMutation({
    mutationFn: async (employeeId) => {
      const res = await fetch(
        `http://localhost:5005/api/admin-mangage-employee/${employeeId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete employee");
      }
      return data;
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries(["employees"]);
      toast.success(payload.message || "Employee deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Could not delete employee");
    },
  });

  return { deleteEmployee, isLoading };
}


// Hook for updating an employee
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  const { mutate: updateEmployee, isLoading } = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(
        `http://localhost:5005/api/admin-mangage-employee/${id}`,
        {
          method: "PUT", // or "PATCH" depending on your backend implementation
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          credentials: "include",
        }
      );
      
      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.message || "Failed to update employee");
      }
      return responseData;
    },
    onSuccess: (payload) => {
      // Invalidate multiple queries to ensure data consistency
      queryClient.invalidateQueries(["employees"]);
      queryClient.invalidateQueries(["employee"]); // This will refresh individual employee queries
      toast.success(payload.message || "Employee updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Could not update employee");
    },
  });

  return { updateEmployee, isLoading };
}