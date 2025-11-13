import express from "express";
import { body, validationResult } from "express-validator";

import {
  createProductReview,
  getProductById,
  getProductReviews,
  listProducts,
} from "../services/productService.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const filters = {
    category: req.query.category,
    color: req.query.color,
    size: req.query.size,
    minPrice: req.query.minPrice,
    maxPrice: req.query.maxPrice,
    search: req.query.search,
    sort: req.query.sort,
    limit: req.query.limit,
    offset: req.query.offset,
  };

  const products = await listProducts(req.db, filters);
  res.json({ items: products });
});

router.get("/:id", async (req, res) => {
  const product = await getProductById(req.db, req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(product);
});

router.get("/:id/reviews", async (req, res) => {
  const reviews = await getProductReviews(req.db, req.params.id, {
    limit: req.query.limit || 10,
    offset: req.query.offset || 0,
  });
  res.json({ items: reviews });
});

router.post(
  "/:id/reviews",
  authenticate(),
  [
    body("rating").isInt({ min: 1, max: 5 }),
    body("comment").isLength({ min: 4 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const review = await createProductReview(req.db, {
      productId: req.params.id,
      userId: req.user.id,
      customerName: req.user.name,
      rating: req.body.rating,
      comment: req.body.comment,
    });

    res.status(201).json(review);
  }
);

export default router;
