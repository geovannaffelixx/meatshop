import { z } from 'zod';
import * as rules from './validation-rules';

export const validationSchemas = {
  cpf: z.string().refine(rules.validateCPF, 'Informe um CPF válido.'),
  cnpj: z.string().refine(rules.validateCNPJ, 'Informe um CNPJ válido.'),
  email: z.string().refine(rules.validateEmail, 'Informe um e-mail válido.'),
  phone: z.string().refine(rules.validatePhone, 'Informe um telefone válido.'),
  name: z.string().refine(rules.validateName, 'Informe um nome válido.'),
  rg: z.string().refine(rules.validateRG, 'Informe um RG válido.'),
  cnh: z.string().refine(rules.validateCNH, 'Informe uma CNH válida.'),
  uf: z.string().refine(rules.validateUF, 'Informe uma UF válida.'),
  cep: z.string().refine(rules.validateCEP, 'Informe um CEP válido.'),
  password: z.string().refine(rules.validatePassword, 'Use 8 a 64 caracteres, com maiúscula, minúscula, número e especial.'),
  document: z.string().refine(rules.validateDocument, 'Informe um CPF ou CNPJ válido.'),
};

export function requiredTextSchema(maximum = 150, minimum = 1) {
  return z.string().trim().min(minimum).max(maximum);
}

export const accountSchema = z.object({
  name: validationSchemas.name.transform(value => value.trim()),
  email: validationSchemas.email.transform(value => value.trim().toLowerCase()),
});

export type AccountInput = z.input<typeof accountSchema>;
