import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../config/env";
import { dataArrayResponse } from "../lib/openapi-helpers";
import { SearchListingSchema } from "../lib/schemas";
import { optionalAuth } from "../middleware/optional-auth";
import * as searchService from "../services/search.service";
import type { Variables } from "../types/variables";

const search = new Hono<{ Bindings: Env; Variables: Variables }>();

search.use("*", optionalAuth);

search.get(
  "/",
  describeRoute({
    tags: ["Search"],
    summary: "Search listings",
    responses: { 200: dataArrayResponse(SearchListingSchema, "Search results") },
  }),
  validator(
    "query",
    z.object({
      q: z.string().optional(),
      lat: z.coerce.number().min(-90).max(90).optional(),
      lng: z.coerce.number().min(-180).max(180).optional(),
      radius: z.coerce.number().min(1).max(1000).optional().default(25),
      category: z.string().optional(),
      type: z.enum(["offer", "request"]).optional(),
      min_price: z.coerce.number().int().min(0).optional(),
      max_price: z.coerce.number().int().min(0).optional(),
      sort: z
        .enum(["relevance", "price_asc", "price_desc", "rating", "newest"])
        .optional()
        .default("relevance"),
      limit: z.coerce.number().int().min(1).max(100).optional().default(20),
      offset: z.coerce.number().int().min(0).optional().default(0),
    })
  ),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const params = c.req.valid("query");
    const data = await searchService.searchListings(supabaseAdmin, params);
    return c.json({ data });
  }
);

export default search;
