import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PaymentManagement } from "./payment-management"
import { apiGet } from "@/shared/lib/api"
import { resetApiCache } from '@/shared/lib/query-cache';

const settleQueries = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });

jest.mock("@/shared/providers/panel-access-provider", () => {
  const hasPermission = (permission: string) => permission === "VIEW_FINANCE"
  return { usePanelAccess: () => ({ hasPermission }) }
})
jest.mock("@/shared/lib/api", () => ({ apiGet: jest.fn(), apiPost: jest.fn() }))

describe("Payment list loading and unit isolation", () => {
  let container: HTMLDivElement
  let root: Root
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    jest.clearAllMocks()
    resetApiCache();
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    resetApiCache();
    container.remove()
  })

  it("shows loading before deciding that a payment list is empty", async () => {
    let finish!: (value: unknown) => void
    jest.mocked(apiGet).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    await act(async () => root.render(<PaymentManagement unitId={1} />))
    expect(container.querySelector('[role="status"]')).not.toBeNull()
    expect(container.textContent).not.toContain("Nenhum pagamento encontrado")
    await act(async () => finish([]))
    await settleQueries();
    expect(container.textContent).toContain("Nenhum pagamento encontrado")
    expect(container.querySelector('[role="status"]')).toBeNull()
  })

  it("shows request errors instead of presenting them as an empty result", async () => {
    jest
      .mocked(apiGet)
      .mockRejectedValueOnce(new Error("Falha ao consultar pagamentos"))
    await act(async () => root.render(<PaymentManagement unitId={1} />))
    await settleQueries();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Falha ao consultar pagamentos",
    )
    expect(container.textContent).not.toContain("Nenhum pagamento encontrado")
  })

  it("ignores a previous unit response after the selected unit changes", async () => {
    let finish!: (value: unknown) => void
    jest
      .mocked(apiGet)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve
        }),
      )
      .mockResolvedValueOnce([])
    await act(async () => root.render(<PaymentManagement unitId={1} />))
    await act(async () => root.render(<PaymentManagement unitId={2} />))
    await act(async () =>
      finish([
        {
          id: 999,
          status: "PENDING",
          payment_status: "PENDING",
          total_amount: 50,
          method: "Cash",
          fee_amount: 0,
          refunded_amount: 0,
          refund_status: null,
        },
      ]),
    )
    expect(container.textContent).not.toContain("Pedido #999")
    await settleQueries();
    expect(container.textContent).toContain("Nenhum pagamento encontrado")
  })
})
