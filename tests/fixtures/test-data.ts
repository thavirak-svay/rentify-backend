import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { Database, Profile, Listing, Booking, Category, MessageThread, Transaction } from "../../src/shared/types/database";

// Test configuration - use environment variables
export const TEST_CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || "",
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SECRET_KEY || "",
  API_URL: process.env.API_URL || "http://localhost:8787",
};

// Test user personas
export interface TestUser {
  id?: string;
  email: string;
  password: string;
  displayName: string;
  token?: string;
  role: "owner" | "renter" | "both";
  metadata?: Record<string, unknown>;
}

export const USER_PERSONAS = {
  sophea: {
    email: `sophea.test.${Date.now()}@rentify.test`,
    password: "TestPass123!",
    displayName: "Sophea Photography",
    role: "owner" as const,
    metadata: {
      bio: "Professional photographer with 10 years experience",
      location: "Phnom Penh, Cambodia",
      identity_status: "verified",
    },
  },
  dara: {
    email: `dara.test.${Date.now()}@rentify.test`,
    password: "TestPass123!",
    displayName: "Dara Video Productions",
    role: "renter" as const,
    metadata: {
      bio: "Freelance videographer",
      location: "Siem Reap, Cambodia",
      identity_status: "verified",
    },
  },
  rith: {
    email: `rith.test.${Date.now()}@rentify.test`,
    password: "TestPass123!",
    displayName: "Rith Hardware Store",
    role: "owner" as const,
    metadata: {
      bio: "Hardware store owner renting power tools",
      location: "Phnom Penh, Cambodia",
      identity_status: "verified",
      payway_beneficiary_id: "BEN_RITH_001",
    },
  },
  maya: {
    email: `maya.test.${Date.now()}@rentify.test`,
    password: "TestPass123!",
    displayName: "Maya DIY",
    role: "renter" as const,
    metadata: {
      bio: "Homeowner doing renovation projects",
      location: "Phnom Penh, Cambodia",
      identity_status: "unverified",
    },
  },
  vanna: {
    email: `vanna.test.${Date.now()}@rentify.test`,
    password: "TestPass123!",
    displayName: "Vanna Event Planning",
    role: "both" as const,
    metadata: {
      bio: "Event planner who owns and rents equipment",
      location: "Battambang, Cambodia",
      identity_status: "verified",
      payway_beneficiary_id: "BEN_VANNA_001",
    },
  },
};

// Test data factories
export function createListingData(overrides: Partial<Listing> = {}): Partial<Listing> {
  return {
    title: "Test Camera Equipment",
    description: "Professional camera for rent",
    type: "offer",
    status: "draft",
    price_daily: 2500,
    price_hourly: 500,
    price_weekly: 12000,
    deposit_amount: 10000,
    currency: "USD",
    delivery_available: true,
    delivery_fee: 300,
    pickup_available: true,
    ...overrides,
  };
}

export function createBookingData(overrides: Partial<Booking> = {}): Partial<Booking> {
  const startTime = new Date(Date.now() + 86400000); // Tomorrow
  const endTime = new Date(Date.now() + 3 * 86400000); // 3 days later

  return {
    status: "requested",
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    delivery_method: "pickup",
    protection_plan: "none",
    subtotal: 5000,
    service_fee: 600,
    total_amount: 5600,
    owner_payout: 4700,
    currency: "USD",
    ...overrides,
  };
}

export function createMessageData(overrides: Partial<{ content: string }> = {}) {
  return {
    content: "Hi, is this item still available?",
    ...overrides,
  };
}

// Helper class for test setup/teardown
export class TestDataManager {
  private supabaseAdmin: SupabaseClient<Database>;
  private createdUserIds: string[] = [];
  private createdListingIds: string[] = [];
  private createdBookingIds: string[] = [];
  private createdThreadIds: string[] = [];

  constructor() {
    this.supabaseAdmin = createClient<Database>(
      TEST_CONFIG.SUPABASE_URL,
      TEST_CONFIG.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  async createUser(persona: TestUser): Promise<TestUser & { id: string; token: string }> {
    // Create auth user
    const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
      email: persona.email,
      password: persona.password,
      email_confirm: true,
      user_metadata: {
        display_name: persona.displayName,
        ...persona.metadata,
      },
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create user: ${authError?.message}`);
    }

    const userId = authData.user.id;
    this.createdUserIds.push(userId);

    // Login to get token
    const { data: sessionData, error: sessionError } = await this.supabaseAdmin.auth.signInWithPassword({
      email: persona.email,
      password: persona.password,
    });

    if (sessionError || !sessionData.session) {
      throw new Error(`Failed to login: ${sessionError?.message}`);
    }

    return {
      ...persona,
      id: userId,
      token: sessionData.session.access_token,
    };
  }

  async cleanup(): Promise<void> {
    // Delete users (this cascades to all related data in Supabase)
    for (const userId of this.createdUserIds) {
      try {
        await this.supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (e) {
        console.error(`Failed to delete user ${userId}:`, e);
      }
    }

    this.createdUserIds = [];
    this.createdListingIds = [];
    this.createdBookingIds = [];
    this.createdThreadIds = [];
  }

  trackListing(id: string): void {
    this.createdListingIds.push(id);
  }

  trackBooking(id: string): void {
    this.createdBookingIds.push(id);
  }

  trackThread(id: string): void {
    this.createdThreadIds.push(id);
  }
}

// API client for E2E tests
export class ApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string = TEST_CONFIG.API_URL) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string): void {
    this.token = token;
  }

  async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ status: number; data: Record<string, unknown>; headers: Headers }> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, data, headers: res.headers };
  }

  // Convenience methods
  get(path: string) {
    return this.request("GET", path);
  }

  post(path: string, body?: unknown) {
    return this.request("POST", path, body);
  }

  patch(path: string, body?: unknown) {
    return this.request("PATCH", path, body);
  }

  delete(path: string) {
    return this.request("DELETE", path);
  }
}

// Valid UUID for testing
export const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
export const VALID_UUID_2 = "550e8400-e29b-41d4-a716-446655440001";
export const INVALID_UUID = "not-a-valid-uuid";

// Date helpers
export const tomorrow = () => new Date(Date.now() + 86400000);
export const nextWeek = () => new Date(Date.now() + 7 * 86400000);
export const formatDate = (date: Date) => date.toISOString();