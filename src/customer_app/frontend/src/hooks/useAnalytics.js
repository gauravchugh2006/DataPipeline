import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";

import { apiClient } from "./useProducts.js";
import { useAuth } from "../context/AuthContext.jsx";

export const useAnalytics = () => {
  const { authHeaders } = useAuth();

  const mutation = useMutation({
    mutationFn: async ({ eventType, payload, source }) => {
      await apiClient.post(
        "/analytics/events",
        {
          eventType,
          payload,
          source: source || "frontend",
        },
        authHeaders
      );
    },
  });

  const trackEvent = useCallback(
    (eventType, payload = {}, source) => {
      if (!eventType) {
        return;
      }
      mutation.mutate({ eventType, payload, source });
    },
    [mutation]
  );

  return {
    trackEvent,
    status: mutation.status,
    error: mutation.error,
  };
};
