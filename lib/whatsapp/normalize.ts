export function normalizeWhatsAppNumber(input: string): string {
  return input.replace(/\D/g, '')
}
