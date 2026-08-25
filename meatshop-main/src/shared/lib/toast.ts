export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastInput = {
  title?: string;
  description: string;
  duration?: number;
  variant?: ToastVariant;
};

export const TOAST_EVENT = "meatshop:toast";

function show(input: ToastInput) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<ToastInput>(TOAST_EVENT, {
      detail: { duration: 5000, variant: "info", ...input },
    }),
  );
}

export const toast = {
  show,
  success(description: string, title = "Sucesso") {
    show({ description, title, variant: "success" });
  },
  error(description: string, title = "Algo deu errado") {
    show({ description, title, variant: "error", duration: 7000 });
  },
  warning(description: string, title = "Atenção") {
    show({ description, title, variant: "warning" });
  },
  info(description: string, title = "Informação") {
    show({ description, title, variant: "info" });
  },
};
