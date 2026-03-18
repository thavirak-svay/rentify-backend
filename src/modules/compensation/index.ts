/**
 * Compensation Module
 * Self-contained compensation queue module
 *
 * @example
 * import { CompensationService, queueCompensation } from "@/modules/compensation"
 *
 * const service = new CompensationService(supabaseClient);
 * await service.queue("cancel_preauth", { payway_tran_id: "..." });
 */

export {
  CompensationService,
  getFailedCompensations,
  processCompensationQueue,
  queueCompensation,
} from './service';
