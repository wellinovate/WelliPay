import { auth } from '../firebase';
import { CostEstimate, PayerPlanRule, BenefitCheckRequest, BenefitCheckResult, BenefitUsage } from '../types';

export class EstimateError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'EstimateError';
    this.statusCode = statusCode;
  }
}

/**
 * Common helper to obtain Firebase ID token or dev-token fallback
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      headers['Authorization'] = 'Bearer dev-token';
    }
  } else {
    headers['Authorization'] = 'Bearer dev-token';
  }

  return headers;
}

/**
 * Reusable price-lookup function
 * Fetches the tariff and publication state for a specific provider and standardised master diagnostic test.
 * Used directly by Cost Estimation (Phase 1) and Benefit Check (Phase 2).
 */
export async function getCostEstimate(
  providerId: string,
  masterServiceId: number
): Promise<CostEstimate> {
  if (!providerId || !masterServiceId) {
    throw new EstimateError('providerId and masterServiceId are required.', 400);
  }

  const headers = await getAuthHeaders();
  const url = `/api/cost-estimate?providerId=${encodeURIComponent(providerId)}&masterServiceId=${masterServiceId}`;

  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || 'Failed to retrieve cost estimate.';
    throw new EstimateError(errorMsg, res.status);
  }

  if (!data.estimate) {
    throw new EstimateError('Invalid estimate response received from server.', 500);
  }

  return data.estimate as CostEstimate;
}

/**
 * Fetches available HMO plans, optionally filtered by payer name
 */
export async function getPayerPlans(payerName?: string): Promise<PayerPlanRule[]> {
  const url = payerName ? `/api/payer-plans?payer=${encodeURIComponent(payerName)}` : '/api/payer-plans';
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.plans) {
    throw new EstimateError(data.error || 'Failed to fetch payer plans.', res.status);
  }
  return data.plans as PayerPlanRule[];
}

/**
 * Reusable HMO Benefit Check & Copay Calculation
 * Combines provider pricing (from Phase 1 foundation) with payer plan coverage rules,
 * pre-auth thresholds, and copay math with zero duplicated logic.
 */
export async function checkBenefitCoverage(
  params: BenefitCheckRequest
): Promise<BenefitCheckResult> {
  const { providerId, masterServiceId, payerName, planName, patientId } = params;
  if (!providerId || !masterServiceId || !payerName || !planName) {
    throw new EstimateError('providerId, masterServiceId, payerName, and planName are required.', 400);
  }

  const headers = await getAuthHeaders();
  let url = `/api/benefit-check?providerId=${encodeURIComponent(providerId)}&masterServiceId=${masterServiceId}&payerName=${encodeURIComponent(payerName)}&planName=${encodeURIComponent(planName)}`;
  if (patientId) {
    url += `&patientId=${encodeURIComponent(patientId)}`;
  }

  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new EstimateError(data.error || 'Failed to check benefit coverage.', res.status);
  }

  if (!data.benefitCheck) {
    throw new EstimateError('Invalid benefit check response received from server.', 500);
  }

  return data.benefitCheck as BenefitCheckResult;
}

/**
 * How much of a patient's annual HMO benefit cap is left, based on
 * WelliPay's own claim records for this payer/plan this year (see the
 * endpoint's own note on why this is a lower bound, not a live payer balance).
 */
export async function getBenefitUsage(
  patientId: string,
  payerName: string,
  planName: string
): Promise<BenefitUsage> {
  const headers = await getAuthHeaders();
  const url = `/api/patients/${encodeURIComponent(patientId)}/benefit-usage?payerName=${encodeURIComponent(payerName)}&planName=${encodeURIComponent(planName)}`;

  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new EstimateError(data.error || 'Failed to fetch benefit usage.', res.status);
  }

  return data as BenefitUsage;
}
