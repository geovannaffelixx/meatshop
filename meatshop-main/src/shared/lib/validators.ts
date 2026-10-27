import { validationSchemas } from './validation-schemas';
import { requiredTextSchema } from './validation-schemas';

export { BRAZILIAN_UFS, normalizeCPF, normalizeCNPJ } from './validation-rules';

export function validateCPF(value: string) {
  return validationSchemas.cpf.safeParse(value).success;
}

export function validateCNPJ(value: string) {
  return validationSchemas.cnpj.safeParse(value).success;
}

export function validateEmail(value: string) {
  return validationSchemas.email.safeParse(value).success;
}

export function validatePhone(value: string) {
  return validationSchemas.phone.safeParse(value).success;
}

export function validateName(value: string) {
  return validationSchemas.name.safeParse(value).success;
}

export function validateRG(value: string) {
  return validationSchemas.rg.safeParse(value).success;
}

export function validateCNH(value: string) {
  return validationSchemas.cnh.safeParse(value).success;
}

export function validateUF(value: string) {
  return validationSchemas.uf.safeParse(value).success;
}

export function validateCEP(value: string) {
  return validationSchemas.cep.safeParse(value).success;
}

export function validatePassword(value: string) {
  return validationSchemas.password.safeParse(value).success;
}

export function validateDocument(value: string) {
  return validationSchemas.document.safeParse(value).success;
}

export function validateRequiredText(value: string, maximum = 150, minimum = 1) {
  return requiredTextSchema(maximum, minimum).safeParse(value).success;
}
