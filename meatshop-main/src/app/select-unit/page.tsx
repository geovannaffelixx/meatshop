import type { Metadata } from "next";
import { SelectUnitScreen } from "@/modules/units/select-unit-screen";

export const metadata: Metadata = { title: "Escolha sua unidade | MeatShop" };

export default function SelectUnitPage() {
  return <SelectUnitScreen />;
}
