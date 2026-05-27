/* CoreCount API Hook
 * All fetch calls use /api/v1 as the base — works via Vite proxy in dev
 * and directly against Express in production (Electron or built PWA).
 */

const BASE = '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const j = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(j.error ?? `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

// ── Shared types ────────────────────────────────────────────────────────────

export type Supply = {
  item_id: number;
  item_name: string;
  item_brand: string | null;
  material_category: string;
  current_stock_on_hand: number;
  min_threshold: number;
  unit_fair_market_value: number;
  lowStock: boolean;
};

export type Client = {
  client_id: string;
  first_name: string;
  family_size: number;
  last_hygiene_date: string | null;
  last_laundry_date: string | null;
  last_cleaning_date: string | null;
  last_special_date: string | null;
  created_at: string;
};

export type Eligibility = {
  eligible: boolean;
  daysRemaining: number;
  nextAvailableDate: string | null;
};

export type Draft = {
  id: number;
  draft_type: string;
  subject: string | null;
  body: string;
  status: string;
  trigger_item_id: number | null;
  created_at: string;
};

export type Volunteer = {
  id: number;
  volunteer_name: string;
  emergency_contact: string;
  emergency_phone: string;
  relationship: string;
  is_minor: number;
  submission_date: string;
};

export type TxLog = {
  id: number;
  transaction_id: string;
  item_id: number | null;
  item_category: string | null;
  bulk_oz_intake: number | null;
  calculated_predicted_packs: number | null;
  mcl_verification_state: string;
  created_at: string;
};
