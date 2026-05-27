/**
 * CoreCount — Decanting Math Engine
 * ===================================
 * Pure deterministic functions for bulk-to-unit yield calculations.
 * No AI or external dependencies — fully testable and audit-ready.
 *
 * Used by: EventBusBackbone, intake route, batch logging
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type DecantInput = {
  bulkOzTotal: number;      // Total bulk ounces received
  unitYieldOz: number;      // Ounces per dispensable unit (e.g. 12oz bottle)
  wasteFactorPct?: number;  // Optional waste/overfill % (default: 5%)
};

export type DecantResult = {
  expectedYieldUnits: number;       // Units before waste
  adjustedYieldUnits: number;       // Units after applying waste factor
  wasteOz: number;                  // Estimated oz lost to overfill/waste
  valuePerUnit: number;             // Estimated fair market value per unit
  totalEstimatedValue: number;      // Total value of the decanted batch
};

// ─── Core yield calculation ───────────────────────────────────────────────────

/**
 * Calculates decanted unit yield from bulk input, applying a waste factor.
 * @param input  Bulk oz, unit oz, optional waste %
 * @param fairMarketValuePerUnit  Optional FMV per unit for financial reporting
 */
export function calculateDecant(
  input: DecantInput,
  fairMarketValuePerUnit: number = 0
): DecantResult {
  const { bulkOzTotal, unitYieldOz, wasteFactorPct = 5 } = input;

  if (bulkOzTotal <= 0) throw new Error('[Decanting] bulkOzTotal must be greater than 0');
  if (unitYieldOz <= 0) throw new Error('[Decanting] unitYieldOz must be greater than 0');

  const wasteMultiplier = 1 - wasteFactorPct / 100;
  const usableOz = bulkOzTotal * wasteMultiplier;
  const expectedYieldUnits = Math.floor(bulkOzTotal / unitYieldOz);
  const adjustedYieldUnits = Math.floor(usableOz / unitYieldOz);
  const wasteOz = parseFloat((bulkOzTotal - adjustedYieldUnits * unitYieldOz).toFixed(2));
  const totalEstimatedValue = parseFloat((adjustedYieldUnits * fairMarketValuePerUnit).toFixed(2));

  return {
    expectedYieldUnits,
    adjustedYieldUnits,
    wasteOz,
    valuePerUnit: fairMarketValuePerUnit,
    totalEstimatedValue,
  };
}

// ─── Cooldown eligibility check ───────────────────────────────────────────────

const COOLDOWN_DAYS: Record<string, number> = {
  Hygiene: 7,
  Laundry: 14,
  Cleaning: 30,
  Special: 60,
};

/**
 * Determines if a client is eligible for a resource based on the last dispense date.
 * @returns { eligible, daysRemaining, nextAvailableDate }
 */
export function checkCooldown(
  category: string,
  lastDate: string | null
): { eligible: boolean; daysRemaining: number; nextAvailableDate: string | null } {
  const cooldown = COOLDOWN_DAYS[category];
  if (cooldown == null) return { eligible: true, daysRemaining: 0, nextAvailableDate: null };
  if (!lastDate) return { eligible: true, daysRemaining: 0, nextAvailableDate: null };

  const last = new Date(lastDate);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const daysRemaining = Math.max(0, Math.ceil(cooldown - diffDays));
  const eligible = diffDays >= cooldown;

  const nextAvailableDate = eligible
    ? null
    : new Date(last.getTime() + cooldown * 24 * 60 * 60 * 1000).toISOString();

  return { eligible, daysRemaining, nextAvailableDate };
}

// ─── Stock alert threshold check ─────────────────────────────────────────────

/**
 * Returns true if current stock is at or below the item's minimum threshold.
 */
export function isLowStock(currentStock: number, minThreshold: number): boolean {
  return currentStock <= minThreshold;
}
