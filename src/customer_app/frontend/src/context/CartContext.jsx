import React, { createContext, useContext, useMemo, useReducer } from "react";

const CartContext = createContext();

const initialState = {
  items: [],
};

const reducer = (state, action) => {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find(
        (item) => item.variantId === action.payload.variantId
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.variantId === action.payload.variantId
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, action.payload],
      };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.variantId !== action.payload),
      };
    case "CLEAR":
      return initialState;
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo(
    () => ({
      items: state.items,
      subtotal: state.items.reduce(
        (acc, item) => acc + Number(item.price) * item.quantity,
        0
      ),
      addItem: (payload) => dispatch({ type: "ADD_ITEM", payload }),
      removeItem: (variantId) =>
        dispatch({ type: "REMOVE_ITEM", payload: variantId }),
      clear: () => dispatch({ type: "CLEAR" }),
    }),
    [state.items]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
