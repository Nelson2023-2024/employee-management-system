import { useMutation, useQuery } from "@tanstack/react-query";

export function useLogin() {
  const query = useQuery();

  const {
    mutate: login,
    isError,
    isPending,
    error,
  } = useMutation({
    mutationFn: async ({ email, password }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST ",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Something went wrong");
      }

      console.log(data);
    },

    onSuccess: () => {},
    onError: () => {},
  });
}
