export function maskCPF(value: string) {
  return value.replace(/\D/g, '').slice(0, 11).replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(value: string) {
  const raw = value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 14);
  return raw.slice(0, 2) + (raw.length > 2 ? `.${raw.slice(2, 5)}` : '') + (raw.length > 5 ? `.${raw.slice(5, 8)}` : '') + (raw.length > 8 ? `/${raw.slice(8, 12)}` : '') + (raw.length > 12 ? `-${raw.slice(12)}` : '');
}

export function maskCEP(value: string) {
  return value.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}

export function maskCPFOrCNPJ(value: string) {
  return /[a-z]/i.test(value) || value.replace(/\D/g, '').length > 11 ? maskCNPJ(value) : maskCPF(value);
}
