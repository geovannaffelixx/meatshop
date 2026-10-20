import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PaymentHistory } from "./payment-history"
import { apiGet, apiPost } from "@/shared/lib/api"

let manage = true
jest.mock("@/shared/providers/panel-access-provider", () => ({
  usePanelAccess: () => ({
    hasPermission: (permission: string) =>
      permission === "VIEW_FINANCE" || manage,
  }),
}))
jest.mock("@/shared/lib/api", () => ({ apiGet: jest.fn(), apiPost: jest.fn() }))
const history = {
  transactions: [],
  manual: [],
  settlement: null,
  refunds: [
    {
      id: "refund-id",
      payment_id: "123",
      amount: 50,
      status: "FAILED",
      reason: "Cancelamento",
      attempts: 1,
      last_error: "Rejected",
      created_at: "2026-10-13T12:00:00Z",
      history: [],
    },
  ],
}

describe("Financial refund recovery", () => {
  let container: HTMLDivElement
  let root: Root
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    jest.clearAllMocks()
    manage = true
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })
  const click = async (label: string) => {
    await act(async () => {
      const button = [...container.querySelectorAll("button")].find(
        (b) => b.textContent === label,
      )
      expect(button).toBeDefined()
      button!.click()
    })
  }
  it("requires explicit confirmation and refreshes financial data after a retry", async () => {
    const onChange = jest.fn()
    jest
      .mocked(apiGet)
      .mockResolvedValueOnce(history)
      .mockResolvedValueOnce({ ...history, refunds: [] })
    await act(async () =>
      root.render(<PaymentHistory orderId={7} onChange={onChange} />),
    )
    await click("Ver histórico financeiro")
    await click("Retomar estorno")
    expect(apiPost).not.toHaveBeenCalled()
    await click("Confirmar retomada")
    expect(apiPost).toHaveBeenCalledWith(
      "/payments/orders/7/refunds/refund-id/retry",
      {},
    )
    expect(onChange).toHaveBeenCalledTimes(1)
  })
  it("lets financial viewers inspect failures without allowing them to retry", async () => {
    manage = false
    jest.mocked(apiGet).mockResolvedValueOnce(history)
    await act(async () =>
      root.render(<PaymentHistory orderId={7} onChange={() => {}} />),
    )
    await click("Ver histórico financeiro")
    expect(container.textContent).toContain("Precisa de atendimento")
    expect(container.textContent).not.toContain("Retomar estorno")
  })
})
