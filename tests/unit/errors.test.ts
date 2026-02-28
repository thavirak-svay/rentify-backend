import { describe, expect, test } from "bun:test";
import {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PaymentError,
  BookingTransitionError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  isAppError,
  getErrorCode,
  getStatusCode,
} from "../../src/lib/errors";

describe("Errors", () => {
  describe("AppError", () => {
    test("should create error with default values", () => {
      const error = new AppError("Something went wrong");
      
      expect(error.message).toBe("Something went wrong");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("INTERNAL_ERROR");
      expect(error.name).toBe("AppError");
    });

    test("should create error with custom status code", () => {
      const error = new AppError("Bad request", 400);
      
      expect(error.statusCode).toBe(400);
    });

    test("should create error with custom code", () => {
      const error = new AppError("Error", 500, "CUSTOM_CODE");
      
      expect(error.code).toBe("CUSTOM_CODE");
    });

    test("should create error with details", () => {
      const error = new AppError("Error", 500, "CODE", { field: "value" });
      
      expect(error.details).toEqual({ field: "value" });
    });

    test("toJSON should serialize correctly", () => {
      const error = new AppError("Error", 400, "CODE", { field: "value" });
      const json = error.toJSON();
      
      expect(json.name).toBe("AppError");
      expect(json.message).toBe("Error");
      expect(json.code).toBe("CODE");
      expect(json.statusCode).toBe(400);
      expect(json.details).toEqual({ field: "value" });
    });

    test("toJSON should omit details when undefined", () => {
      const error = new AppError("Error");
      const json = error.toJSON();
      
      expect(json.details).toBeUndefined();
    });
  });

  describe("ValidationError", () => {
    test("should create validation error with 400 status", () => {
      const error = new ValidationError("Invalid input");
      
      expect(error.message).toBe("Invalid input");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.name).toBe("ValidationError");
    });
  });

  describe("AuthenticationError", () => {
    test("should create auth error with default message", () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe("Authentication required");
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("AUTHENTICATION_REQUIRED");
      expect(error.name).toBe("AuthenticationError");
    });

    test("should create auth error with custom message", () => {
      const error = new AuthenticationError("Token expired");
      
      expect(error.message).toBe("Token expired");
    });
  });

  describe("ForbiddenError", () => {
    test("should create forbidden error with default message", () => {
      const error = new ForbiddenError();
      
      expect(error.message).toBe("Access denied");
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe("FORBIDDEN");
      expect(error.name).toBe("ForbiddenError");
    });

    test("should create forbidden error with custom message", () => {
      const error = new ForbiddenError("Admin only");
      
      expect(error.message).toBe("Admin only");
    });
  });

  describe("NotFoundError", () => {
    test("should create not found error with default message", () => {
      const error = new NotFoundError();
      
      expect(error.message).toBe("Resource not found");
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
      expect(error.name).toBe("NotFoundError");
    });

    test("should create not found error with custom message", () => {
      const error = new NotFoundError("User not found");
      
      expect(error.message).toBe("User not found");
    });
  });

  describe("ConflictError", () => {
    test("should create conflict error", () => {
      const error = new ConflictError("Booking already exists");
      
      expect(error.message).toBe("Booking already exists");
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe("CONFLICT");
      expect(error.name).toBe("ConflictError");
    });
  });

  describe("PaymentError", () => {
    test("should create payment error", () => {
      const error = new PaymentError("Payment failed");
      
      expect(error.message).toBe("Payment failed");
      expect(error.statusCode).toBe(402);
      expect(error.code).toBe("PAYMENT_ERROR");
      expect(error.name).toBe("PaymentError");
    });
  });

  describe("BookingTransitionError", () => {
    test("should create transition error with from and to states", () => {
      const error = new BookingTransitionError("requested", "completed");
      
      expect(error.message).toBe("Cannot transition booking from requested to completed");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("INVALID_TRANSITION");
      expect(error.name).toBe("BookingTransitionError");
    });
  });

  describe("RateLimitError", () => {
    test("should create rate limit error with default message", () => {
      const error = new RateLimitError();
      
      expect(error.message).toBe("Too many requests");
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(error.name).toBe("RateLimitError");
      expect(error.details?.retryAfter).toBeUndefined();
    });

    test("should create rate limit error with retryAfter", () => {
      const error = new RateLimitError("Too many requests", 60);
      
      expect(error.details?.retryAfter).toBe(60);
    });
  });

  describe("DatabaseError", () => {
    test("should create database error without original error", () => {
      const error = new DatabaseError("Query failed");
      
      expect(error.message).toBe("Query failed");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.name).toBe("DatabaseError");
    });

    test("should create database error with original error", () => {
      const original = new Error("Original error");
      const error = new DatabaseError("Query failed", original);
      
      expect(error.details?.originalError).toBe("Original error");
    });
  });

  describe("ExternalServiceError", () => {
    test("should create external service error", () => {
      const error = new ExternalServiceError("Stripe", "Connection failed");
      
      expect(error.message).toBe("Stripe service error: Connection failed");
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe("EXTERNAL_SERVICE_ERROR");
      expect(error.name).toBe("ExternalServiceError");
    });
  });

  describe("Error helpers", () => {
    test("isAppError should return true for AppError", () => {
      const error = new AppError("test");
      expect(isAppError(error)).toBe(true);
    });

    test("isAppError should return false for regular Error", () => {
      const error = new Error("test");
      expect(isAppError(error)).toBe(false);
    });

    test("isAppError should return false for unknown", () => {
      expect(isAppError("string")).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
    });

    test("getErrorCode should return code for AppError", () => {
      const error = new ValidationError("test");
      expect(getErrorCode(error)).toBe("VALIDATION_ERROR");
    });

    test("getErrorCode should return INTERNAL_ERROR for non-AppError", () => {
      const error = new Error("test");
      expect(getErrorCode(error)).toBe("INTERNAL_ERROR");
    });

    test("getStatusCode should return statusCode for AppError", () => {
      const error = new NotFoundError("test");
      expect(getStatusCode(error)).toBe(404);
    });

    test("getStatusCode should return 500 for non-AppError", () => {
      const error = new Error("test");
      expect(getStatusCode(error)).toBe(500);
    });
  });

  describe("Error inheritance", () => {
    test("all errors should be instance of Error", () => {
      const errors = [
        new AppError("test"),
        new ValidationError("test"),
        new AuthenticationError("test"),
        new ForbiddenError("test"),
        new NotFoundError("test"),
        new ConflictError("test"),
        new PaymentError("test"),
        new BookingTransitionError("a", "b"),
        new RateLimitError(),
        new DatabaseError("test"),
        new ExternalServiceError("s", "m"),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
      });
    });

    test("custom errors should be instance of AppError", () => {
      const errors = [
        new ValidationError("test"),
        new AuthenticationError("test"),
        new ForbiddenError("test"),
        new NotFoundError("test"),
        new ConflictError("test"),
        new PaymentError("test"),
        new BookingTransitionError("a", "b"),
        new RateLimitError(),
        new DatabaseError("test"),
        new ExternalServiceError("s", "m"),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(AppError);
      });
    });
  });
});
