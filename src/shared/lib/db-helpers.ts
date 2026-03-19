import type { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseError, NotFoundError } from './errors';

/**
 * Fetch a single record by ID or column value.
 * Throws NotFoundError if not found.
 */
export async function fetchOne<T>(
  supabase: SupabaseClient,
  table: string,
  options:
    | { id: string; column?: never; value?: never }
    | { id?: never; column: string; value: unknown },
  entityName = 'Resource',
): Promise<T> {
  let query = supabase.from(table).select();

  if (options.id) {
    query = query.eq('id', options.id);
  } else if (options.column && options.value !== undefined) {
    query = query.eq(options.column, options.value);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    throw new NotFoundError(`${entityName} not found`);
  }

  return data as T;
}

/**
 * Fetch a single record with related data.
 * Throws NotFoundError if not found.
 */
export async function fetchOneWithRelations<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  options:
    | { id: string; column?: never; value?: never }
    | { id?: never; column: string; value: unknown },
  entityName = 'Resource',
): Promise<T> {
  let query = supabase.from(table).select(select);

  if (options.id) {
    query = query.eq('id', options.id);
  } else if (options.column && options.value !== undefined) {
    query = query.eq(options.column, options.value);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    throw new NotFoundError(`${entityName} not found`);
  }

  return data as T;
}

/**
 * Fetch multiple records by column value.
 */
export async function fetchMany<T>(
  supabase: SupabaseClient,
  table: string,
  options?: {
    column?: string;
    value?: unknown;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  },
): Promise<T[]> {
  let query = supabase.from(table).select();

  if (options?.column && options.value !== undefined) {
    query = query.eq(options.column, options.value);
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new DatabaseError(`Failed to fetch from ${table}: ${error.message}`);
  }

  return (data || []) as T[];
}

/**
 * Insert a single record and return it.
 * Throws DatabaseError on failure.
 */
export async function insertOne<T>(
  supabase: SupabaseClient,
  table: string,
  input: Record<string, unknown>,
  entityName = 'Resource',
): Promise<T> {
  const { data, error } = await supabase.from(table).insert(input).select().single();

  if (error) {
    throw new DatabaseError(`Failed to create ${entityName.toLowerCase()}: ${error.message}`);
  }

  return data as T;
}

/**
 * Insert multiple records.
 * Throws DatabaseError on failure.
 */
export async function insertMany<T>(
  supabase: SupabaseClient,
  table: string,
  input: Record<string, unknown>[],
): Promise<T[]> {
  const { data, error } = await supabase.from(table).insert(input).select();

  if (error) {
    throw new DatabaseError(`Failed to insert into ${table}: ${error.message}`);
  }

  return (data || []) as T[];
}

/**
 * Update a single record by ID and return it.
 * Throws NotFoundError if record doesn't exist.
 */
export async function updateOne<T>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  updates: Record<string, unknown>,
  entityName = 'Resource',
): Promise<T> {
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();

  if (error) {
    throw new DatabaseError(`Failed to update ${entityName.toLowerCase()}: ${error.message}`);
  }

  if (!data) {
    throw new NotFoundError(`${entityName} not found`);
  }

  return data as T;
}

/**
 * Delete a single record by ID (soft delete with deleted_at).
 */
export async function softDeleteOne(
  supabase: SupabaseClient,
  table: string,
  id: string,
  entityName = 'Resource',
): Promise<void> {
  const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);

  if (error) {
    throw new DatabaseError(`Failed to delete ${entityName.toLowerCase()}: ${error.message}`);
  }
}

/**
 * Check if a record exists.
 */
export async function exists(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: unknown,
): Promise<boolean> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, value);

  if (error) {
    throw new DatabaseError(`Failed to check existence in ${table}: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

/**
 * Get count of records matching a condition.
 */
export async function count(
  supabase: SupabaseClient,
  table: string,
  column?: string,
  value?: unknown,
): Promise<number> {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });

  if (column && value !== undefined) {
    query = query.eq(column, value);
  }

  const { count: result, error } = await query;

  if (error) {
    throw new DatabaseError(`Failed to count ${table}: ${error.message}`);
  }

  return result ?? 0;
}