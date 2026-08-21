import OrderDetails from "@/components/order-details"

export default function OrderDetailsPage({ params }: any) {
  const { id } = params
  return <OrderDetails orderId={id} />
}
