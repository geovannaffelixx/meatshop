export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  cpf: string;
  created_at: string;
  avatar_url?: string | null;
  global_role: "SUPER_ADMIN" | "USER";
};
