import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../hooks/useProducts.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useAnalytics } from "../../hooks/useAnalytics.js";

const LOYALTY_QUERY_KEY = ["loyalty", "preferences"];
const BUNDLES_QUERY_KEY = ["loyalty", "bundles"];

export const useReminderBundles = () => {
  const { authHeaders, token } = useAuth();
  return useQuery({
    queryKey: BUNDLES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get("/loyalty/bundles", authHeaders);
      return data.bundles || [];
    },
    enabled: Boolean(token),
  });
};

export const useReminderPreferences = () => {
  const { authHeaders, token } = useAuth();
  return useQuery({
    queryKey: LOYALTY_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get("/loyalty/preferences", authHeaders);
      return data.preferences;
    },
    enabled: Boolean(token),
  });
};

export const useSaveReminderPreferences = () => {
  const { authHeaders } = useAuth();
  const queryClient = useQueryClient();
  const { trackEvent } = useAnalytics();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put(
        "/loyalty/preferences",
        payload,
        authHeaders
      );
      return data.preferences;
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData(LOYALTY_QUERY_KEY, preferences);
      trackEvent("reminder_preferences_saved", {
        frequency: preferences.frequency,
        channel: preferences.channel,
        bundleCount: preferences.bundlePreferences.length,
      });
    },
  });
};
