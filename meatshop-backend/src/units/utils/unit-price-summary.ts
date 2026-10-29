import type { EntityManager } from 'typeorm';

export async function unitPricesPerKg(
  manager: EntityManager,
  ids: number[],
): Promise<Map<number, number>> {
  if (ids.length === 0) return new Map();
  const rows: { unit_id: number; average: string }[] = await manager.query(
    `SELECT p.unit_id,
      AVG(CASE WHEN UPPER(TRIM(p.unit_of_measure)) = 'G' THEN p.price * 1000 ELSE p.price END) AS average
     FROM products p
     JOIN categories c ON c.id = p.category_id AND c.active = true
     JOIN stock s ON s.product_id = p.id AND s.quantity > 0
     WHERE p.unit_id = ANY($1::int[]) AND p.active = true
       AND UPPER(TRIM(p.unit_of_measure)) IN ('KG', 'G')
     GROUP BY p.unit_id`,
    [ids],
  );
  return new Map(rows.map((row) => [row.unit_id, Number(Number(row.average).toFixed(2))]));
}
