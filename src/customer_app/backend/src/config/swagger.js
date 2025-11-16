export const buildSwaggerDocument = () => {
  const port = process.env.PORT || 4000;
  const swaggerServerUrl = process.env.SWAGGER_SERVER_URL || `http://localhost:${port}`;

  return {
    openapi: "3.0.3",
    info: {
      title: "Cafe Commerce API",
      version: "1.0.0",
      description:
        "Interactive documentation for the Cafe Commerce middleware API. Use the operations below to authenticate, browse products, manage orders, and contact support.",
      contact: {
        name: "Cafe Commerce Support",
        email: "support@cafecoffeeday.com",
      },
    },
    servers: [
      {
        url: swaggerServerUrl,
        description: "Current environment",
      },
    ],
    tags: [
      { name: "Health" },
      { name: "Auth" },
      { name: "Products" },
      { name: "Orders" },
      { name: "Support" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Profile: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            email: { type: "string", example: "customer@cafecoffeeday.com" },
            role: { type: "string", example: "customer" },
            firstName: { type: "string", example: "Ava" },
            lastName: { type: "string", example: "Lopez" },
            theme: { type: "string", example: "sunrise" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            token: { type: "string", description: "JWT token" },
            profile: { $ref: "#/components/schemas/Profile" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        ProductList: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  name: { type: "string" },
                  category: { type: "string" },
                  price: { type: "number" },
                  averageRating: { type: "number" },
                },
              },
            },
            page: { type: "integer" },
            pageSize: { type: "integer" },
            total: { type: "integer" },
            totalPages: { type: "integer" },
          },
        },
        OrderList: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  orderDate: { type: "string", format: "date-time" },
                  totalAmount: { type: "number" },
                  paymentStatus: { type: "string" },
                },
              },
            },
            page: { type: "integer" },
            pageSize: { type: "integer" },
            total: { type: "integer" },
            totalPages: { type: "integer" },
          },
        },
      },
    },
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health probe",
          responses: {
            200: {
              description: "API is running",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ok" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Create a customer account",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["firstName", "lastName", "email", "password"],
                  properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string", format: "password" },
                    phone: { type: "string" },
                    address: { type: "string" },
                    gender: { type: "string" },
                    theme: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Account created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            400: {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            409: {
              description: "Email already registered",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
          security: [],
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login and obtain a JWT",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", format: "password" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            401: {
              description: "Invalid credentials",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
          security: [],
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Return the authenticated profile",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Current profile",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { profile: { $ref: "#/components/schemas/Profile" } },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/auth/profile": {
        put: {
          tags: ["Auth"],
          summary: "Update profile preferences (theme, avatar, details)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    phone: { type: "string" },
                    address: { type: "string" },
                    gender: { type: "string" },
                    theme: { type: "string" },
                    avatarStyle: { type: "string" },
                    profileImage: { type: "string", description: "Base64 encoded avatar" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Profile updated",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { profile: { $ref: "#/components/schemas/Profile" } },
                  },
                },
              },
            },
          },
        },
      },
      "/api/products": {
        get: {
          tags: ["Products"],
          summary: "List catalogue items",
          parameters: [
            { in: "query", name: "category", schema: { type: "string" } },
            { in: "query", name: "minPrice", schema: { type: "number" } },
            { in: "query", name: "maxPrice", schema: { type: "number" } },
            { in: "query", name: "search", schema: { type: "string" } },
            { in: "query", name: "sort", schema: { type: "string", enum: ["name", "price_asc", "price_desc", "popular", "newest"] } },
            { in: "query", name: "page", schema: { type: "integer", minimum: 1 } },
            { in: "query", name: "pageSize", schema: { type: "integer", minimum: 1, maximum: 50 } },
          ],
          responses: {
            200: {
              description: "Paginated catalogue",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ProductList" },
                },
              },
            },
          },
          security: [],
        },
      },
      "/api/orders": {
        get: {
          tags: ["Orders"],
          summary: "List orders for the authenticated user (admins see all)",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "page", schema: { type: "integer", minimum: 1 } },
            { in: "query", name: "pageSize", schema: { type: "integer", minimum: 1, maximum: 100 } },
            { in: "query", name: "status", schema: { type: "string" } },
            { in: "query", name: "startDate", schema: { type: "string", format: "date" } },
            { in: "query", name: "endDate", schema: { type: "string", format: "date" } },
          ],
          responses: {
            200: {
              description: "Order history",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/OrderList" },
                },
              },
            },
          },
        },
        post: {
          tags: ["Orders"],
          summary: "Create a new order",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items", "totalAmount"],
                  properties: {
                    items: {
                      type: "array",
                      minItems: 1,
                      items: {
                        type: "object",
                        required: ["productId", "productName", "price"],
                        properties: {
                          productId: { type: "integer" },
                          productName: { type: "string" },
                          category: { type: "string" },
                          price: { type: "number" },
                          quantity: { type: "integer" },
                        },
                      },
                    },
                    totalAmount: { type: "number" },
                    paymentStatus: { type: "string" },
                    payment: {
                      type: "object",
                      properties: {
                        method: { type: "string" },
                        status: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Order created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      totalAmount: { type: "number" },
                      paymentStatus: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/orders/{orderId}": {
        get: {
          tags: ["Orders"],
          summary: "Retrieve a single order",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "orderId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            200: {
              description: "Order detail",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      items: { type: "array", items: { type: "object" } },
                      totalAmount: { type: "number" },
                    },
                  },
                },
              },
            },
            404: {
              description: "Order not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/orders/{orderId}/invoice": {
        get: {
          tags: ["Orders"],
          summary: "Download the PDF invoice for an order",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "orderId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            200: {
              description: "PDF stream",
              content: {
                "application/pdf": {
                  schema: { type: "string", format: "binary" },
                },
              },
            },
            404: {
              description: "Order not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/support/contact": {
        post: {
          tags: ["Support"],
          summary: "Send a concierge/support request",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "topic", "message"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    topic: { type: "string" },
                    message: { type: "string", minLength: 10 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Request accepted",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { success: { type: "boolean", example: true } },
                  },
                },
              },
            },
            400: {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
          security: [],
        },
      },
    },
  };
};
