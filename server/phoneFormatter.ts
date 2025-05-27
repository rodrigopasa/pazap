/**
 * Formatador global para números de telefone brasileiros no WhatsApp
 * 
 * Regras para números brasileiros:
 * - Código do país: +55
 * - DDDs válidos: 11-99
 * - Celulares: começam com 6, 7, 8 ou 9 (após DDD)
 * - Fixos: começam com 2, 3, 4 ou 5 (após DDD)
 * - O WhatsApp não usa o 9º dígito adicional para celulares
 * - Formato: 55 + DDD (2 dígitos) + número (8 dígitos)
 */

// DDDs válidos no Brasil
const VALID_DDDS = [
  11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
  21, 22, 24, // RJ
  27, 28, // ES
  31, 32, 33, 34, 35, 37, 38, // MG
  41, 42, 43, 44, 45, 46, // PR
  47, 48, 49, // SC
  51, 53, 54, 55, // RS
  61, // DF
  62, 64, // GO
  63, // TO
  65, 66, // MT
  67, // MS
  68, // AC
  69, // RO
  71, 73, 74, 75, 77, // BA
  79, // SE
  81, 87, // PE
  82, // AL
  83, // PB
  84, // RN
  85, 88, // CE
  86, 89, // PI
  91, 93, 94, // PA
  92, 97, // AM
  95, // RR
  96, // AP
  98, 99  // MA
];

function isValidDDD(ddd: string): boolean {
  const dddNumber = parseInt(ddd, 10);
  return VALID_DDDS.includes(dddNumber);
}

function isCellphone(firstDigit: string): boolean {
  return ['6', '7', '8', '9'].includes(firstDigit);
}

function isLandline(firstDigit: string): boolean {
  return ['2', '3', '4', '5'].includes(firstDigit);
}

export function formatBrazilianWhatsAppNumber(phone: string): string {
  if (!phone) return '';

  // Remove tudo que não é número
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove códigos de país duplicados se existirem
  if (cleaned.startsWith('5555')) {
    cleaned = cleaned.substring(2);
  }
  
  // Normalizar para formato sem código do país primeiro
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    cleaned = cleaned.substring(2);
  }
  
  // Validar e processar números com 11 dígitos (DDD + 9 dígito + 8 dígitos)
  if (cleaned.length === 11) {
    const ddd = cleaned.substring(0, 2);
    const firstDigit = cleaned.substring(2, 3);
    const secondDigit = cleaned.substring(3, 4);
    
    // Validar DDD
    if (!isValidDDD(ddd)) {
      console.warn(`DDD inválido: ${ddd} em ${phone}`);
      return '';
    }
    
    // Se é celular e tem 9 na posição correta, é o 9º dígito adicional
    if (firstDigit === '9' && isCellphone(secondDigit)) {
      // Remove o 9º dígito adicional
      const number = cleaned.substring(3, 11);
      cleaned = ddd + number;
    } else if (isLandline(firstDigit)) {
      // Telefone fixo não precisa de alteração
      cleaned = cleaned;
    } else {
      console.warn(`Número com formato inesperado: ${phone}`);
      return '';
    }
  }
  // Processar números com 10 dígitos (DDD + 8 dígitos)
  else if (cleaned.length === 10) {
    const ddd = cleaned.substring(0, 2);
    const firstDigit = cleaned.substring(2, 3);
    
    // Validar DDD
    if (!isValidDDD(ddd)) {
      console.warn(`DDD inválido: ${ddd} em ${phone}`);
      return '';
    }
    
    // Verificar se é celular ou fixo válido
    if (!isCellphone(firstDigit) && !isLandline(firstDigit)) {
      console.warn(`Primeiro dígito inválido: ${firstDigit} em ${phone}`);
      return '';
    }
  } else {
    console.warn(`Número brasileiro com tamanho inválido: ${phone} (${cleaned.length} dígitos)`);
    return '';
  }
  
  // Validação final: deve ter exatamente 10 dígitos (DDD + 8 dígitos)
  if (cleaned.length !== 10) {
    console.warn(`Número brasileiro inválido após processamento: ${phone} -> ${cleaned} (${cleaned.length} dígitos)`);
    return '';
  }
  
  // Adicionar código do país e sufixo do WhatsApp
  return '55' + cleaned + '@s.whatsapp.net';
}

export function formatBrazilianPhoneDisplay(phone: string): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  // Formato com código do país (12 dígitos: 55 + DDD + 8 dígitos)
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    const ddd = cleaned.substring(2, 4);
    const number = cleaned.substring(4, 12);
    const firstPart = number.substring(0, 4);
    const secondPart = number.substring(4, 8);
    
    return `+55 (${ddd}) ${firstPart}-${secondPart}`;
  }
  
  // Formato sem código do país (10 dígitos: DDD + 8 dígitos)
  if (cleaned.length === 10) {
    const ddd = cleaned.substring(0, 2);
    const number = cleaned.substring(2, 10);
    const firstPart = number.substring(0, 4);
    const secondPart = number.substring(4, 8);
    
    return `(${ddd}) ${firstPart}-${secondPart}`;
  }
  
  // Formato com 9º dígito (11 dígitos: DDD + 9 + 8 dígitos)
  if (cleaned.length === 11) {
    const ddd = cleaned.substring(0, 2);
    const ninthDigit = cleaned.substring(2, 3);
    const number = cleaned.substring(3, 11);
    const firstPart = number.substring(0, 4);
    const secondPart = number.substring(4, 8);
    
    if (ninthDigit === '9' && isCellphone(number.substring(0, 1))) {
      return `(${ddd}) 9${firstPart}-${secondPart}`;
    }
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