export type CouponType = "PLATFORM" | "UNIT";
export type DiscountType = "PERCENTAGE" | "FIXED";
export type Coupon = {
  id: number; code: string; name: string; description: string | null; type: CouponType;
  unit_id: number | null; unit?: { id: number; name: string } | null;
  allowed_units: Array<{ unit_id: number; unit?: { id: number; name: string } }>;
  discount_type: DiscountType; discount_amount: number | string; maximum_discount: number | string | null;
  minimum_order_value: number | string; starts_at: string; expires_at: string;
  total_usage_limit: number | null; usage_limit_per_user: number | null; current_usage_count: number;
  active: boolean; created_at: string;
};
export type CouponResult = { data: Coupon[]; meta: { page: number; total: number; totalPages: number } };
export type Redemption = { id: number; order_id: number; discount_amount: string; status: "REDEEMED" | "RELEASED"; redeemed_at: string; user?: { name: string }; unit?: { name: string } };
