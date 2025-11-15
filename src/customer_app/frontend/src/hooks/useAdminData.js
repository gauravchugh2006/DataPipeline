import { useQuery } from "@tanstack/react-query";

export const useAdminData = (entity, page, pageSize) =>
  useQuery({
    queryKey: ["admin", entity, page, pageSize],
    queryFn: async () => {
      const response = await fetch(`/api/admin/${entity}?page=${page}&pageSize=${pageSize}`, {
        headers: {
          "x-admin-role": "admin"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to load ${entity}`);
      }
      return response.json();
    }
  });
