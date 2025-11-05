import OrderDetails from "@/components/order-details"

interface OrderDetailsPageProps {
  params: {
    id: string
  }
}

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { id } = params
  return <OrderDetails orderId={id} />
}
