import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../config/env";
import { dataArrayResponse, dataResponse } from "../lib/openapi-helpers";
import { CategorySchema } from "../lib/schemas";
import { optionalAuth } from "../middleware/optional-auth";
import * as categoryService from "../services/category.service";
import type { Variables } from "../types/variables";

const categories = new Hono<{ Bindings: Env; Variables: Variables }>();

categories.use("*", optionalAuth);

categories.get(
  "/",
  describeRoute({
    tags: ["Categories"],
    summary: "List all categories",
    responses: { 200: dataArrayResponse(CategorySchema, "List of categories") },
  }),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const data = await categoryService.getCategories(supabaseAdmin);
    return c.json({ data });
  }
);

categories.get(
  "/:slug",
  describeRoute({
    tags: ["Categories"],
    summary: "Get category by slug",
    responses: { 200: dataResponse(CategorySchema, "Category details") },
  }),
  validator("param", z.object({ slug: z.string() })),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const { slug } = c.req.valid("param");
    const data = await categoryService.getCategory(supabaseAdmin, slug);
    return c.json({ data });
  }
);

export default categories;
