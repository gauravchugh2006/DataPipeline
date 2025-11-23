import { useQuery } from "@tanstack/react-query";

export const useReminderConfigurations = () =>
  useQuery({
    queryKey: ["reminder-configurations"],
    queryFn: async () => {
      const response = await fetch("/api/reminders/configurations");
      if (!response.ok) {
        throw new Error("Failed to load reminder configurations");
      }
      return response.json();
    }
  });
