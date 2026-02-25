import { Hono } from "hono";
import * as searchService from "../services/search.service";

const search = new Hono();

search.get("/", async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const params = {
    q: c.req.query("q"),
    lat: c.req.query("lat") ? parseFloat(c.req.query("lat")!) : undefined,
    lng: c.req.query("lng") ? parseFloat(c.req.query("lng")!) : undefined,
    radius: c.req.query("radius") ? parseFloat(c.req.query("radius")!) : 25,
    category: c.req.query("category"),
    type: c.req.query("type") as "offer" | "request" | undefined,
    min_price: c.req.query("min_price") ? parseInt(c.req.query("min_price")!) : undefined,
    max_price: c.req.query("max_price") ? parseInt(c.req.query("max_price")!) : undefined,
    sort: (c.req.query("sort") as "relevance" | "price_asc" | "price_desc" | "rating" | "newest") || "relevance",
    limit: c.req.query("limit") ? parseInt(c.req.query("limit")!) : 20,
    offset: c.req.query("offset") ? parseInt(c.req.query("offset")!) : 0,
  };

  const results = await searchService.searchListings(supabaseAdmin, params);

  return c.json({ data: results });
});

export default search;