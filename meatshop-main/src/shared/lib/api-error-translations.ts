type ApiErrorPayload = {
  code?: unknown;
  error?: unknown;
  message?: unknown;
  statusCode?: unknown;
};

const ERROR_CODE_MESSAGES: Record<string, string> = {
  EMAIL_ALREADY_EXISTS: "Já existe uma conta cadastrada com este e-mail.",
  CPF_ALREADY_EXISTS: "Já existe uma conta cadastrada com este CPF.",
  CNPJ_ALREADY_EXISTS: "Já existe um açougue cadastrado com este CNPJ.",
  RESOURCE_ALREADY_EXISTS: "Já existe um cadastro com estas informações.",
  INTERNAL_ERROR: "Não foi possível concluir a operação. Tente novamente em instantes.",
};

const STATUS_MESSAGES: Record<number, string> = {
  400: "Os dados enviados são inválidos. Revise as informações e tente novamente.",
  401: "Sua sessão expirou ou suas credenciais são inválidas.",
  403: "Você não tem permissão para realizar esta ação.",
  404: "O recurso solicitado não foi encontrado.",
  409: "Já existe um registro com essas informações.",
  422: "Não foi possível processar os dados informados.",
  429: "Muitas tentativas. Aguarde um momento e tente novamente.",
  500: "Ocorreu um erro interno. Tente novamente em instantes.",
  502: "O servidor está temporariamente indisponível.",
  503: "O serviço está temporariamente indisponível.",
  504: "O servidor demorou demais para responder.",
};

const MESSAGE_TRANSLATIONS: Array<[RegExp, string]> = [
  [/current password is incorrect/i, "A senha atual está incorreta."],
  [/cpf.*(in use|taken|registered|already exists)/i, "Já existe uma conta cadastrada com este CPF."],
  [/cnpj.*(in use|taken|registered|already exists)/i, "Já existe um açougue cadastrado com este CNPJ."],
  [/email.*(in use|taken|registered|already exists)/i, "Já existe uma conta cadastrada com este e-mail."],
  [/invalid credentials|incorrect (email|password)|wrong password/i, "E-mail ou senha inválidos."],
  [/unauthorized|not authenticated|authentication required/i, "Sua sessão expirou. Entre novamente."],
  [/forbidden|permission denied|access denied/i, "Você não tem permissão para realizar esta ação."],
  [/user not found/i, "Usuário não encontrado."],
  [/unit not found/i, "Unidade não encontrada."],
  [/product not found/i, "Produto não encontrado."],
  [/category not found/i, "Categoria não encontrada."],
  [/order not found/i, "Pedido não encontrado."],
  [/already exists|already registered|duplicate|unique constraint/i, "Já existe um registro com essas informações."],
  [/email.*(in use|taken|registered)/i, "Este e-mail já está cadastrado."],
  [/invalid email/i, "Informe um endereço de e-mail válido."],
  [/password.*(weak|short)|minimum.*password/i, "A senha informada não atende aos requisitos mínimos."],
  [/required|should not be empty|must be defined/i, "Preencha todos os campos obrigatórios."],
  [/must be a string/i, "Um dos campos deve ser preenchido com texto."],
  [/must be a number|must be an integer/i, "Um dos campos deve ser preenchido com um número válido."],
  [/network error|failed to fetch|load failed|econnrefused|connection refused/i, "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."],
  [/timeout|timed out/i, "O servidor demorou demais para responder. Tente novamente."],
  [/internal server error/i, "Ocorreu um erro interno. Tente novamente em instantes."],
  [/bad request/i, "Os dados enviados são inválidos."],
  [/not found/i, "O recurso solicitado não foi encontrado."],
];

const DEFAULT_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";

function parsePayload(value: unknown): ApiErrorPayload | null {
  if (!value || typeof value !== "object") return null;
  return value as ApiErrorPayload;
}

function extractMessages(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      return extractMessages(JSON.parse(trimmed));
    } catch {
      return [trimmed];
    }
  }

  if (Array.isArray(value)) {
    return value.flatMap(extractMessages);
  }

  const payload = parsePayload(value);
  if (!payload) return [];
  return extractMessages(payload.message ?? payload.error);
}

function translateMessage(message: string): string {
  for (const [pattern, translation] of MESSAGE_TRANSLATIONS) {
    if (pattern.test(message)) return translation;
  }

  // Mensagens que já vieram em português podem ser exibidas com segurança.
  if (/[áàâãéêíóôõúç]|\b(não|erro|senha|usuário|pedido|produto|unidade)\b/i.test(message)) {
    return message;
  }

  return DEFAULT_MESSAGE;
}

export function translateApiError(
  error: unknown,
  status?: number,
  fallback = DEFAULT_MESSAGE,
): string {
  const payload = parsePayload(error);
  const payloadStatus = typeof payload?.statusCode === "number" ? payload.statusCode : undefined;
  const errorCode = typeof payload?.code === "string" ? payload.code : undefined;
  if (errorCode && ERROR_CODE_MESSAGES[errorCode]) {
    return ERROR_CODE_MESSAGES[errorCode];
  }
  const messages = extractMessages(error);

  if (messages.length > 0) {
    const translated = [...new Set(messages.map(translateMessage))];
    if (translated.some((message) => message !== DEFAULT_MESSAGE)) {
      return translated.filter((message) => message !== DEFAULT_MESSAGE).join(" ");
    }
  }

  return STATUS_MESSAGES[status ?? payloadStatus ?? 0] ?? fallback;
}

export function getErrorMessage(error: unknown, fallback?: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return translateApiError(error.message, undefined, fallback);
  return translateApiError(error, undefined, fallback);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
