/**
 * Payment Gateway Interface
 * Defines contract for payment providers (Factory pattern)
 *
 * @module modules/payment/interface
 */

export interface PaymentBooking {
  id: string;
  listingTitle: string;
  renterFirstName: string;
  renterLastName: string;
  renterEmail: string;
  renterPhone: string;
  ownerId: string;
  ownerPaywayBeneficiaryId: string;
}

export interface PaymentPricing {
  total_renter_pays: number;
  owner_payout: number;
}

export interface PreAuthResult {
  transaction_id: string;
  payway_tran_id: string;
  checkout_url: string;
}

export interface CaptureResult {
  success: boolean;
  grand_total: number;
  transaction_status: string;
}

export interface CancelResult {
  success: boolean;
  transaction_status: string;
}

export interface RefundResult {
  success: boolean;
  total_refunded: number;
  transaction_status: string;
}

export interface TransactionStatus {
  payment_status: string;
  amount: number;
  currency: string;
}

export interface PaymentGateway {
  readonly name: string;

  createPreAuth(booking: PaymentBooking, pricing: PaymentPricing): Promise<PreAuthResult>;

  capture(transactionId: string): Promise<CaptureResult>;

  cancelPreAuth(transactionId: string): Promise<CancelResult>;

  refund(transactionId: string): Promise<RefundResult>;

  checkTransaction(transactionId: string): Promise<TransactionStatus>;

  verifyCallback(payload: Record<string, unknown>): boolean;
}
