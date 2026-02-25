import { Hono } from "hono";
import * as categoryService from "../services/category.service";

const categories = new Hono();

categories.get("/", async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const categories = await categoryService.getCategories(supabaseAdmin);

  return c.json({ data: categories });
});

categories.get("/:slug", async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const slug = c.req.param("slug");

  const category = await categoryService.getCategory(supabaseAdmin, slug);

  return c.json({ data: category });
});

export default categories;