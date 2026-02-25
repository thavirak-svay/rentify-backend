import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { requireAuth } from "../middleware/auth";

const openApi = new OpenAPIHono();

openApi.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const supabase = c.get("supabase");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (user) {
      c.set("user", user);
      c.set("userId", user.id);
    }
  }
  await next();
});

const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

// ============================================
// HEALTH
// ============================================

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["Health"],
  summary: "Health check endpoint",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.string(),
            timestamp: z.string(),
            version: z.string(),
          }),
        },
      },
      description: "Service is healthy",
    },
  },
});

openApi.openapi(healthRoute, (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// ============================================
// CATEGORIES
// ============================================

const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  sort_order: z.number(),
  created_at: z.string(),
});

const listCategoriesRoute = createRoute({
  method: "get",
  path: "/categories",
  tags: ["Categories"],
  summary: "List all categories",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(CategorySchema),
          }),
        },
      },
      description: "List of categories",
    },
  },
});

openApi.openapi(listCategoriesRoute, async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const { data, error } = await supabaseAdmin.from("categories").select().order("sort_order");

  if (error) {
    return c.json({ error: { code: "DATABASE_ERROR", message: error.message } }, 500);
  }

  return c.json({ data: data || [] });
});

// ============================================
// LISTINGS
// ============================================

const ListingSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(["offer", "request"]),
  status: z.enum(["draft", "active", "paused", "archived"]),
  price_hourly: z.number().nullable(),
  price_daily: z.number(),
  price_weekly: z.number().nullable(),
  deposit_amount: z.number(),
  currency: z.string(),
  address_city: z.string().nullable(),
  address_country: z.string().nullable(),
  delivery_available: z.boolean(),
  delivery_fee: z.number(),
  pickup_available: z.boolean(),
  view_count: z.number(),
  rating_avg: z.number(),
  rating_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

const CreateListingSchema = z.object({
  title: z.string().min(5).max(200).openapi({ example: "Professional Camera Kit" }),
  description: z.string().max(2000).optional(),
  category_id: z.string().uuid().optional(),
  type: z.enum(["offer", "request"]).default("offer"),
  price_hourly: z.number().int().positive().optional(),
  price_daily: z.number().int().positive().openapi({ example: 5000 }),
  price_weekly: z.number().int().positive().optional(),
  deposit_amount: z.number().int().min(0).default(0),
  currency: z.string().length(3).default("USD"),
  address_city: z.string().optional(),
  address_country: z.string().length(2).optional(),
  delivery_available: z.boolean().default(false),
  delivery_fee: z.number().int().min(0).default(0),
  pickup_available: z.boolean().default(true),
});

const createListingRoute = createRoute({
  method: "post",
  path: "/listings",
  tags: ["Listings"],
  summary: "Create a new listing",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateListingSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ data: ListingSchema }),
        },
      },
      description: "Listing created successfully",
    },
    401: {
      content: {
        "application/json": { schema: ErrorSchema },
      },
      description: "Authentication required",
    },
  },
});

openApi.openapi(createListingRoute, async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Missing auth token" } }, 401);
  }

  const body = c.req.valid("json");

  const { data, error } = await supabaseAdmin
    .from("listings")
    .insert({
      owner_id: userId,
      title: body.title,
      description: body.description,
      category_id: body.category_id,
      type: body.type,
      price_hourly: body.price_hourly,
      price_daily: body.price_daily,
      price_weekly: body.price_weekly,
      deposit_amount: body.deposit_amount,
      currency: body.currency,
      address_city: body.address_city,
      address_country: body.address_country,
      delivery_available: body.delivery_available,
      delivery_fee: body.delivery_fee,
      pickup_available: body.pickup_available,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return c.json({ error: { code: "DATABASE_ERROR", message: error.message } }, 500);
  }

  return c.json({ data }, 201);
});

const getListingRoute = createRoute({
  method: "get",
  path: "/listings/{id}",
  tags: ["Listings"],
  summary: "Get listing by ID",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ data: ListingSchema }),
        },
      },
      description: "Listing details",
    },
    404: {
      content: {
        "application/json": { schema: ErrorSchema },
      },
      description: "Listing not found",
    },
  },
});

openApi.openapi(getListingRoute, async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const { id } = c.req.valid("param");

  const { data, error } = await supabaseAdmin.from("listings").select().eq("id", id).single();

  if (error || !data) {
    return c.json({ error: { code: "NOT_FOUND", message: "Listing not found" } }, 404);
  }

  return c.json({ data });
});

// ============================================
// BOOKINGS
// ============================================

const BookingSchema = z.object({
  id: z.string().uuid(),
  listing_id: z.string().uuid(),
  renter_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  start_time: z.string(),
  end_time: z.string(),
  status: z.enum([
    "requested",
    "approved",
    "declined",
    "auto_declined",
    "active",
    "completed",
    "cancelled",
    "disputed",
    "resolved",
  ]),
  subtotal: z.number(),
  service_fee: z.number(),
  total_amount: z.number(),
  currency: z.string(),
  created_at: z.string(),
});

const CreateBookingSchema = z.object({
  listing_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  delivery_method: z.enum(["pickup", "delivery"]).optional(),
  protection_plan: z.enum(["none", "basic", "premium"]).optional(),
});

const createBookingRoute = createRoute({
  method: "post",
  path: "/bookings",
  tags: ["Bookings"],
  summary: "Create a booking request",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateBookingSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({
            data: z.object({
              booking: BookingSchema,
              checkout_url: z.string(),
            }),
          }),
        },
      },
      description: "Booking created with payment URL",
    },
    401: {
      content: {
        "application/json": { schema: ErrorSchema },
      },
      description: "Authentication required",
    },
  },
});

openApi.openapi(createBookingRoute, async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Missing auth token" } }, 401);
  }

  const body = c.req.valid("json");

  const { data: listing, error: listingError } = await supabaseAdmin
    .from("listings")
    .select()
    .eq("id", body.listing_id)
    .single();

  if (listingError || !listing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Listing not found" } }, 404);
  }

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .insert({
      listing_id: body.listing_id,
      renter_id: userId,
      owner_id: listing.owner_id,
      start_time: body.start_time,
      end_time: body.end_time,
      status: "requested",
      subtotal: listing.price_daily,
      service_fee: Math.round(listing.price_daily * 0.12),
      delivery_fee: 0,
      protection_fee: 0,
      deposit_amount: listing.deposit_amount,
      total_amount: Math.round(listing.price_daily * 1.12) + listing.deposit_amount,
      owner_payout: Math.round(listing.price_daily * 0.94),
      currency: listing.currency,
      delivery_method: body.delivery_method || "pickup",
      protection_plan: body.protection_plan || "none",
      payment_authorized: false,
    })
    .select()
    .single();

  if (bookingError) {
    return c.json({ error: { code: "DATABASE_ERROR", message: bookingError.message } }, 500);
  }

  return c.json(
    {
      data: {
        booking,
        checkout_url: "https://checkout-sandbox.payway.com.kh",
      },
    },
    201
  );
});

// ============================================
// REVIEWS
// ============================================

const ReviewSchema = z.object({
  id: z.string().uuid(),
  booking_id: z.string().uuid(),
  listing_id: z.string().uuid(),
  reviewer_id: z.string().uuid(),
  target_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  created_at: z.string(),
});

const CreateReviewSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

const createReviewRoute = createRoute({
  method: "post",
  path: "/reviews",
  tags: ["Reviews"],
  summary: "Create a review (post-booking only)",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateReviewSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ data: ReviewSchema }),
        },
      },
      description: "Review created successfully",
    },
    400: {
      content: {
        "application/json": { schema: ErrorSchema },
      },
      description: "Cannot review this booking",
    },
  },
});

openApi.openapi(createReviewRoute, async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Missing auth token" } }, 401);
  }

  const body = c.req.valid("json");

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .select()
    .eq("id", body.booking_id)
    .single();

  if (bookingError || !booking) {
    return c.json({ error: { code: "NOT_FOUND", message: "Booking not found" } }, 404);
  }

  if (booking.status !== "completed") {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Can only review completed bookings" } }, 400);
  }

  if (booking.renter_id !== userId && booking.owner_id !== userId) {
    return c.json({ error: { code: "FORBIDDEN", message: "Not authorized to review this booking" } }, 403);
  }

  const targetId = booking.renter_id === userId ? booking.owner_id : booking.renter_id;

  const { data: review, error: reviewError } = await supabaseAdmin
    .from("reviews")
    .insert({
      booking_id: body.booking_id,
      listing_id: booking.listing_id,
      reviewer_id: userId,
      target_id: targetId,
      rating: body.rating,
      comment: body.comment,
    })
    .select()
    .single();

  if (reviewError) {
    return c.json({ error: { code: "DATABASE_ERROR", message: reviewError.message } }, 500);
  }

  return c.json({ data: review }, 201);
});

// ============================================
// MESSAGES
// ============================================

const MessageSchema = z.object({
  id: z.string().uuid(),
  thread_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  content: z.string(),
  created_at: z.string(),
});

const SendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

const sendMessageRoute = createRoute({
  method: "post",
  path: "/threads/{id}/messages",
  tags: ["Messages"],
  summary: "Send a message",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: SendMessageSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ data: MessageSchema }),
        },
      },
      description: "Message sent successfully",
    },
    403: {
      content: {
        "application/json": { schema: ErrorSchema },
      },
      description: "Not a participant in this thread",
    },
  },
});

openApi.openapi(sendMessageRoute, async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Missing auth token" } }, 401);
  }

  const { id: threadId } = c.req.valid("param");
  const body = c.req.valid("json");

  const { data: thread, error: threadError } = await supabaseAdmin
    .from("message_threads")
    .select("participant_ids")
    .eq("id", threadId)
    .single();

  if (threadError || !thread) {
    return c.json({ error: { code: "NOT_FOUND", message: "Thread not found" } }, 404);
  }

  if (!thread.participant_ids.includes(userId)) {
    return c.json({ error: { code: "FORBIDDEN", message: "Not a participant in this thread" } }, 403);
  }

  const { data: message, error: messageError } = await supabaseAdmin
    .from("messages")
    .insert({
      thread_id: threadId,
      sender_id: userId,
      content: body.content,
    })
    .select()
    .single();

  if (messageError) {
    return c.json({ error: { code: "DATABASE_ERROR", message: messageError.message } }, 500);
  }

  await supabaseAdmin
    .from("message_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", threadId);

  return c.json({ data: message }, 201);
});

// ============================================
// SCALAR UI
// ============================================

openApi.get(
  "/docs",
  Scalar({
    url: "/openapi.json",
    theme: "purple",
    pageTitle: "Rentify API Reference",
  })
);

openApi.doc("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Rentify API",
    version: "1.0.0",
    description: "Cambodia-first rental marketplace API. All endpoints implemented in Hono.",
    contact: {
      name: "Rentify Support",
      email: "support@rentify.com",
    },
  },
  servers: [
    {
      url: "http://localhost:8787",
      description: "Development",
    },
    {
      url: "https://api.rentify.com",
      description: "Production",
    },
  ],
  security: [
    {
      Bearer: [],
    },
  ],
  components: {
    securitySchemes: {
      Bearer: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Supabase JWT token",
      },
    },
  },
});

export default openApi;