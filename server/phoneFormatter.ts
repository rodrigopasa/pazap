/**
 * Formatador global para números de telefone brasileiros no WhatsApp
 * 
 * Regras para números brasileiros:
 * - Código do país: +55
 * - O WhatsApp não usa o 9º dígito adicional que foi introduzido para celulares
 * - Formato: 55 + DDD (2 dígitos) + número (8 dígitos)
 * - Exemplo: 5511987654321 vira 5511987654321@s.whatsapp.net
 */

export function formatBrazilianWhatsAppNumber(phone: string): string {
  if (!phone) return '';

  // Remove tudo que não é número
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove códigos de país duplicados se existirem
  if (cleaned.startsWith('5555')) {
    cleaned = cleaned.substring(2);
  }
  
  // Se não começar com 55, adiciona o código do Brasil
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  // Tratamento especial para números brasileiros com 9º dígito
  if (cleaned.length === 13) { // 55 + DDD (2) + 9 + número (8)
    const countryCode = cleaned.substring(0, 2); // 55
    const areaCode = cleaned.substring(2, 4);    // DDD
    const ninthDigit = cleaned.substring(4, 5);  // 9 adicional
    const number = cleaned.substring(5, 13);     // 8 dígitos
    
    // Se o 9º dígito está presente e é realmente um 9, remove ele
    if (ninthDigit === '9' && number.length === 8) {
      cleaned = countryCode + areaCode + number;
    }
  } else if (cleaned.length === 12) { // 55 + DDD (2) + número (8) - formato correto
    // Já está no formato correto
  } else if (cleaned.length === 11) { // DDD + 9 + número (8)
    const areaCode = cleaned.substring(0, 2);    // DDD
    const ninthDigit = cleaned.substring(2, 3);  // 9 adicional
    const number = cleaned.substring(3, 11);     // 8 dígitos
    
    // Se tem o 9º dígito, remove
    if (ninthDigit === '9' && number.length === 8) {
      cleaned = '55' + areaCode + number;
    } else {
      cleaned = '55' + cleaned;
    }
  } else if (cleaned.length === 10) { // DDD + número (8) - formato correto sem código do país
    cleaned = '55' + cleaned;
  }
  
  // Validação final: deve ter exatamente 12 dígitos (55 + DDD + 8 dígitos)
  if (cleaned.length !== 12) {
    console.warn(`Número brasileiro inválido: ${phone} -> ${cleaned} (${cleaned.length} dígitos)`);
  }
  
  return cleaned + '@s.whatsapp.net';
}

export function formatBrazilianPhoneDisplay(phone: string): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    const areaCode = cleaned.substring(2, 4);
    const number = cleaned.substring(4, 12);
    const firstPart = number.substring(0, 4);
    const secondPart = number.substring(4, 8);
    
    return `+55 (${areaCode}) ${firstPart}-${secondPart}`;
  }
  
  return phone;
}

export function cleanBrazilianPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove tudo que não é número
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove o código do país se presente
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    cleaned = cleaned.substring(2);
  }
  
  // Remove o 9º dígito se presente
  if (cleaned.length === 11 && cleaned.substring(2, 3) === '9') {
    const areaCode = cleaned.substring(0, 2);
    const number = cleaned.substring(3, 11);
    cleaned = areaCode + number;
  }
  
  return cleaned;
}