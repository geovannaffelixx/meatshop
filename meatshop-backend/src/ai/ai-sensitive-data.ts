const NAME_PLACEHOLDER = '[nome removido]';

const MEAT_TERMS = new Set([
  'acem',
  'alcatra',
  'bife',
  'carne',
  'contrafile',
  'costela',
  'coxao',
  'cupim',
  'file',
  'fraldinha',
  'frango',
  'lagarto',
  'linguica',
  'lombo',
  'maminha',
  'musculo',
  'paleta',
  'patinho',
  'pernil',
  'picanha',
]);

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const CPF = /(?<!\d)\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[-.\s]?\d{2}(?!\d)/g;
const CEP = /(?<!\d)\d{5}-\d{3}(?!\d)|\bCEP:?\s*\d{8}(?!\d)/gi;
const PHONE = /(?<!\d)(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}(?!\d)/g;
const ADDRESS =
  /(?<!\p{L})(?:rua|avenida|av\.?|travessa|alameda|rodovia)\s+\p{L}[\p{L}\p{N}.'\- ]{0,60}?,?\s*(?:n[º°o]?\.?\s*)?\d{1,6}(?!\d)/giu;

const NAME_WORD = String.raw`\p{L}{2,}(?:['-]\p{L}+)?`;
const CAPITALIZED_WORD = String.raw`\p{Lu}[\p{Ll}'-]+`;
const SURNAMES = String.raw`(?:\s+(?:d[aeo]s?\s+)?${CAPITALIZED_WORD}){0,3}`;
const NAME_INTRO = new RegExp(
  String.raw`((?<!\p{L})(?:[Mm]eu\s+nome\s+[ée]|MEU\s+NOME\s+[ÉE]|[Mm]e\s+chamo|ME\s+CHAMO)\s+)(${NAME_WORD}${SURNAMES})`,
  'gu',
);
const NAME_SOU = new RegExp(
  String.raw`((?<!\p{L})(?:[Ss]ou|SOU)\s+[oaOA]\s+)(${CAPITALIZED_WORD}${SURNAMES})`,
  'gu',
);

function normalizeWord(word: string): string {
  return word
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function replaceName(match: string, intro: string, name: string): string {
  const firstWord = normalizeWord(name.split(/\s+/)[0]);
  return MEAT_TERMS.has(firstWord) ? match : `${intro}${NAME_PLACEHOLDER}`;
}

export function redactSensitiveText(text: string): string {
  return text
    .replace(EMAIL, '[e-mail removido]')
    .replace(CPF, '[CPF removido]')
    .replace(CEP, '[CEP removido]')
    .replace(PHONE, '[telefone removido]')
    .replace(ADDRESS, '[endereço removido]')
    .replace(NAME_INTRO, replaceName)
    .replace(NAME_SOU, replaceName);
}
