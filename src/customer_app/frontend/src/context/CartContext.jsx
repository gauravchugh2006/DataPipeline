import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

import { apiClient } from "../hooks/useProducts.js";
import { useAuth } from "./AuthContext.jsx";
import { useNotifications } from "./NotificationContext.jsx";

const CartContext = createContext();

const STORAGE_KEY = "cafe-commerce-cart-state";

const initialState = {
  items: [],
  wishlist: [],
  loading: false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_STATE":
      return {
        ...state,
        items: action.payload.items || [],
        wishlist: action.payload.wishlist || [],
      };
    case "SET_LOADING":
      return { ...state, loading: Boolean(action.payload) };
    case "UPSERT_ITEM": {
      const existing = state.items.find((item) => item.productId === action.payload.productId);
      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.productId === action.payload.productId
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          ),
        };
      }
      return { ...state, items: [...state.items, action.payload] };
    }
    case "SET_ITEM_QUANTITY":
      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.productId !== action.payload),
      };
    case "CLEAR_CART":
      return {
        ...state,
        items: [],
      };
    case "UPSERT_WISHLIST_ITEM": {
      const existing = state.wishlist.find((item) => item.productId === action.payload.productId);
      if (existing) {
        return {
          ...state,
          wishlist: state.wishlist.map((item) =>
            item.productId === action.payload.productId
              ? { ...item, quantity: action.payload.quantity || item.quantity }
              : item
          ),
        };
      }
      return { ...state, wishlist: [...state.wishlist, action.payload] };
    }
    case "REMOVE_WISHLIST_ITEM":
      return {
        ...state,
        wishlist: state.wishlist.filter((item) => item.productId !== action.payload),
      };
    default:
      return state;
  }
};

const readPersistedState = () => {
  if (typeof window === "undefined") {
    return initialState;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return initialState;
    }
    const parsed = JSON.parse(stored);
    return {
      ...initialState,
      items: parsed.items || [],
      wishlist: parsed.wishlist || [],
    };
  } catch (error) {
    console.warn("Unable to parse stored cart state", error);
    return initialState;
  }
};

export const CartProvider = ({ children }) => {
  const { profile, authHeaders } = useAuth();
  const { notify } = useNotifications();
  const guestNoticeShown = useRef(false);
  const [state, dispatch] = useReducer(reducer, initialState, readPersistedState);

  const showGuestReminder = useCallback(() => {
    if (guestNoticeShown.current) {
      return;
    }
    guestNoticeShown.current = true;
    notify({
      title: "Sign in to sync your bag",
      message: "We keep it safe on this device until you log in.",
      tone: "info",
      duration: 5000,
    });
  }, [notify]);

  const requestCartUpdate = useCallback(
    async ({ remote, fallback, successMessage }) => {
      if (!profile) {
        fallback?.();
        if (successMessage) {
          notify({ title: "Cart updated", message: successMessage, tone: "success" });
        }
        showGuestReminder();
        return null;
      }
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const response = await remote();
        const data = response?.data || {};
        dispatch({ type: "SET_STATE", payload: data });
        if (successMessage) {
          notify({ title: "Cart updated", message: successMessage, tone: "success" });
        }
        return data;
      } catch (error) {
        const message = error.response?.data?.error || "Unable to update your cart right now.";
        notify({ title: "We hit a snag", message, tone: "error" });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [profile, notify, showGuestReminder]
  );

  const refreshCart = useCallback(async () => {
    if (!profile) {
      return null;
    }
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const { data } = await apiClient.get("/cart", authHeaders);
      dispatch({ type: "SET_STATE", payload: data });
      return data;
    } catch (error) {
      console.error("Unable to refresh cart", error);
      return null;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [profile, authHeaders]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items: state.items, wishlist: state.wishlist })
    );
  }, [state.items, state.wishlist]);

  useEffect(() => {
    if (profile) {
      guestNoticeShown.current = false;
      refreshCart();
    }
  }, [profile, refreshCart]);

  const addItem = useCallback(
    (payload) =>
      requestCartUpdate({
        remote: () =>
          apiClient.post(
            "/cart/items",
            { productId: payload.productId, quantity: payload.quantity },
            authHeaders
          ),
        fallback: () => {
          dispatch({ type: "UPSERT_ITEM", payload });
          dispatch({ type: "REMOVE_WISHLIST_ITEM", payload: payload.productId });
        },
        successMessage: `${payload.productName} was added to your cart`,
      }),
    [authHeaders, requestCartUpdate]
  );

  const updateQuantity = useCallback(
    (productId, quantity) => {
      const normalizedQty = Math.max(Number(quantity) || 0, 0);
      return requestCartUpdate({
        remote: () =>
          apiClient.patch(
            `/cart/items/${productId}`,
            { quantity: normalizedQty },
            authHeaders
          ),
        fallback: () => {
          if (normalizedQty <= 0) {
            dispatch({ type: "REMOVE_ITEM", payload: productId });
          } else {
            dispatch({ type: "SET_ITEM_QUANTITY", payload: { productId, quantity: normalizedQty } });
          }
        },
        successMessage: normalizedQty ? "Quantity updated" : "Item removed",
      });
    },
    [authHeaders, requestCartUpdate]
  );

  const removeItem = useCallback(
    (productId) =>
      requestCartUpdate({
        remote: () => apiClient.delete(`/cart/items/${productId}`, authHeaders),
        fallback: () => dispatch({ type: "REMOVE_ITEM", payload: productId }),
        successMessage: "Removed from cart",
      }),
    [authHeaders, requestCartUpdate]
  );

  const clearCart = useCallback(
    () =>
      requestCartUpdate({
        remote: () => apiClient.delete("/cart", authHeaders),
        fallback: () => dispatch({ type: "CLEAR_CART" }),
        successMessage: "Cart cleared",
      }),
    [authHeaders, requestCartUpdate]
  );

  const moveToWishlist = useCallback(
    (productId) =>
      requestCartUpdate({
        remote: () => apiClient.post(`/cart/items/${productId}/move-to-wishlist`, {}, authHeaders),
        fallback: () => {
          const item = state.items.find((cartItem) => cartItem.productId === productId);
          if (!item) return;
          dispatch({ type: "REMOVE_ITEM", payload: productId });
          dispatch({ type: "UPSERT_WISHLIST_ITEM", payload: item });
        },
        successMessage: "Saved for later",
      }),
    [state.items, authHeaders, requestCartUpdate]
  );

  const moveWishlistItemToCart = useCallback(
    (productId) =>
      requestCartUpdate({
        remote: () =>
          apiClient.post(`/cart/wishlist/items/${productId}/move-to-cart`, {}, authHeaders),
        fallback: () => {
          const item = state.wishlist.find((saved) => saved.productId === productId);
          if (!item) return;
          dispatch({ type: "UPSERT_ITEM", payload: { ...item } });
          dispatch({ type: "REMOVE_WISHLIST_ITEM", payload: productId });
        },
        successMessage: "Moved back to cart",
      }),
    [state.wishlist, authHeaders, requestCartUpdate]
  );

  const removeWishlistItem = useCallback(
    (productId) =>
      requestCartUpdate({
        remote: () => apiClient.delete(`/cart/wishlist/items/${productId}`, authHeaders),
        fallback: () => dispatch({ type: "REMOVE_WISHLIST_ITEM", payload: productId }),
        successMessage: "Removed from saved list",
      }),
    [authHeaders, requestCartUpdate]
  );

  const subtotal = useMemo(
    () => state.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [state.items]
  );
  const itemCount = useMemo(
    () => state.items.reduce((sum, item) => sum + item.quantity, 0),
    [state.items]
  );
  const wishlistCount = state.wishlist.length;

  const value = useMemo(
    () => ({
      items: state.items,
      wishlist: state.wishlist,
      subtotal,
      itemCount,
      wishlistCount,
      loading: state.loading,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      moveToWishlist,
      moveWishlistItemToCart,
      removeWishlistItem,
      refreshCart,
    }),
    [
      state.items,
      state.wishlist,
      state.loading,
      subtotal,
      itemCount,
      wishlistCount,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      moveToWishlist,
      moveWishlistItemToCart,
      removeWishlistItem,
      refreshCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
