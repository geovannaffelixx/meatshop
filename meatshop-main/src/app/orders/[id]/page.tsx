import { OrderDetailScreen } from "@/modules/orders";

export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;
  return <OrderDetailScreen orderId={id} />;
}
