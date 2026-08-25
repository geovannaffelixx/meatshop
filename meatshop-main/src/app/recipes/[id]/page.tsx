import { RecipeFormScreen } from "@/modules/recipes";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecipeFormScreen recipeId={Number(id)} />;
}
