import express from "express";
import { body, param, validationResult } from "express-validator";

import { authenticate } from "../middleware/auth.js";
import {
  addCartItem,
  clearCart,
  getCartSnapshot,
  moveCartItemToWishlist,
  moveWishlistItemToCart,
  removeCartItem,
  removeWishlistItem,
  updateCartItemQuantity,
  validateCouponCode,
} from "../services/cartService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

const ensureValid = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

router.get(
  "/",
  authenticate(),
  asyncHandler(async (req, res) => {
    const cart = await getCartSnapshot(req.db, req.user.id);
    res.json(cart);
  })
);

router.post(
  "/items",
  authenticate(),
  [body("productId").isInt({ min: 1 }), body("quantity").optional().isInt({ min: 1, max: 999 })],
  ensureValid,
  asyncHandler(async (req, res) => {
    const cart = await addCartItem(req.db, req.user.id, {
      productId: Number(req.body.productId),
      quantity: req.body.quantity,
    });
    res.status(201).json(cart);
  })
);

router.patch(
  "/items/:productId",
  authenticate(),
  [param("productId").isInt({ min: 1 }), body("quantity").isInt({ min: 0, max: 999 })],
  ensureValid,
  asyncHandler(async (req, res) => {
    const cart = await updateCartItemQuantity(
      req.db,
      req.user.id,
      Number(req.params.productId),
      req.body.quantity
    );
    res.json(cart);
  })
);

router.delete(
  "/items/:productId",
  authenticate(),
  [param("productId").isInt({ min: 1 })],
  ensureValid,
  asyncHandler(async (req, res) => {
    const cart = await removeCartItem(req.db, req.user.id, Number(req.params.productId));
    res.json(cart);
  })
);

router.delete(
  "/",
  authenticate(),
  asyncHandler(async (req, res) => {
    const cart = await clearCart(req.db, req.user.id);
    res.json(cart);
  })
);

router.post(
  "/items/:productId/move-to-wishlist",
  authenticate(),
  [param("productId").isInt({ min: 1 })],
  ensureValid,
  asyncHandler(async (req, res) => {
    const cart = await moveCartItemToWishlist(req.db, req.user.id, Number(req.params.productId));
    res.json(cart);
  })
);

router.post(
  "/wishlist/items/:productId/move-to-cart",
  authenticate(),
  [param("productId").isInt({ min: 1 })],
  ensureValid,
  asyncHandler(async (req, res) => {
    const cart = await moveWishlistItemToCart(
      req.db,
      req.user.id,
      Number(req.params.productId)
    );
    res.json(cart);
  })
);

router.delete(
  "/wishlist/items/:productId",
  authenticate(),
  [param("productId").isInt({ min: 1 })],
  ensureValid,
  asyncHandler(async (req, res) => {
    const cart = await removeWishlistItem(req.db, req.user.id, Number(req.params.productId));
    res.json(cart);
  })
);

router.post(
  "/coupons/validate",
  authenticate(),
  [body("code").trim().notEmpty(), body("subtotal").optional().isFloat({ min: 0 })],
  ensureValid,
  asyncHandler(async (req, res) => {
    const coupon = await validateCouponCode(req.db, req.body.code, req.body.subtotal);
    if (!coupon) {
      return res.status(404).json({ error: "Coupon code is not active" });
    }
    res.json({ coupon });
  })
);

export default router;
