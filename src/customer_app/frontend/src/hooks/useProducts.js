import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

export const useProducts = (filters) => {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: async () => {
      const { data } = await api.get("/products", { params: filters });
      return data;
    },
    keepPreviousData: true,
  });
};

export const useProductDetail = (productId) => {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const { data } = await api.get(`/products/${productId}`);
      return data;
    },
    enabled: Boolean(productId),
  });
};

export const useProductReviews = (productId, pagination) => {
  return useQuery({
    queryKey: ["reviews", productId, pagination],
    queryFn: async () => {
      const { data } = await api.get(`/products/${productId}/reviews`, {
        params: pagination,
      });
      return data.items;
    },
    enabled: Boolean(productId),
  });
};

export const apiClient = api;
