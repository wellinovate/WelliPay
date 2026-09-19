import { auth } from '../firebase';
import { CostEstimate } from '../types';

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
 * Fetches the tariff and publication state for a specific provider and standardized master diagnostic test.
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
