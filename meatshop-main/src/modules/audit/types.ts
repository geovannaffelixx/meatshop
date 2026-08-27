export type AuditOutcome = "SUCCESS" | "FAILURE";
export type AuditLog = {
  id: number; user_id: number | null; unit_id: number | null; action: string;
  entity: string; entity_id: string | null; description: string; outcome: AuditOutcome; actor_type: string;
  method: string | null; path: string | null; status_code: number | null;
  correlation_id: string | null; ip_address: string | null; user_agent: string | null;
  old_data: string | null; new_data: string | null; created_at: string;
  user?: { id: number; name: string } | null; unit?: { id: number; name: string } | null;
};
export type AuditResult = { data: AuditLog[]; meta: { page: number; limit: number; total: number; totalPages: number } };
export type AuditSummary = { total: number; success: number; failure: number; last24Hours: number };
