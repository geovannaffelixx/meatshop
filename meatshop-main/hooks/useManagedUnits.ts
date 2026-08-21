"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export type ManagedUnit = { id: number; name: string };

export function useManagedUnits() {
  const [units, setUnits] = useState<ManagedUnit[]>([]);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet("/units/mine")
      .then((data: ManagedUnit[]) => {
        setUnits(data ?? []);
        if (data?.length > 0) setUnitId(data[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { units, unitId, setUnitId, loading, error };
}
