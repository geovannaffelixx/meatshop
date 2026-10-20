export type NextAction = {
  label: string
  endpoint: "confirm" | "status"
  targetStatus?: string
}

export function getNextAction(status: string, deliveryType: string): NextAction | null {
  switch (status) {
    case "PENDING":
      return { label: "Confirmar pedido", endpoint: "confirm" }
    case "CONFIRMED":
      return { label: "Iniciar preparo", endpoint: "status", targetStatus: "PREPARING" }
    case "PREPARING":
      return { label: "Marcar como pronto", endpoint: "status", targetStatus: "READY" }
    case "READY":
      return deliveryType === "PICKUP"
        ? { label: "Marcar como entregue", endpoint: "status", targetStatus: "DELIVERED" }
        : null
    case "OUT_FOR_DELIVERY":
      return null
    default:
      return null
  }
}

const TERMINAL_STATUSES = ["DELIVERED", "CANCELLED"]
const SCHEDULABLE_STATUSES = ["PENDING", "CONFIRMED"]

export function canCancel(status: string): boolean {
  return !TERMINAL_STATUSES.includes(status)
}

export function canReschedule(status: string): boolean {
  return SCHEDULABLE_STATUSES.includes(status)
}
