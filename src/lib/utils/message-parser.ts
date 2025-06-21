// lib/utils/message-parser.ts
export interface ParsedBankMessage {
  accountNumber: string;
  type: 'deposit' | 'withdraw' | 'transfer';
  amount: number;
  description: string;
  rawMessage: string;
}

export class BankMessageParser {
  private static patterns = [
    // Updated to preserve masked account numbers
    {
      regex: /Main Account\(([^)]+)\)\s+(withdraw|deposit|transfer)\s*฿?([0-9,]+\.\d*)/i,
      bankName: 'BBL',
    },
    // ธนาคารกสิกรไทย
    {
      regex: /บัญชี[^\(]*\(([^)]+)\)\s+(ฝาก|ถอน|โอน)\s*฿?([0-9,]+\.?\d*)/i,
      bankName: 'KASIKORN',
    },
    // ธนาคารไทยพาณิชย์
    {
      regex: /SCB Account\s*\(([^)]+)\)\s+(CR|DR)\s*฿?([0-9,]+\.?\d*)/i,
      bankName: 'SCB',
    },
    // ธนาคารกรุงศรีอยุธยา
    {
      regex: /BAY Account\s*\(([^)]+)\)\s+(รับเงิน|จ่ายเงิน)\s*฿?([0-9,]+\.?\d*)/i,
      bankName: 'BAY',
    },
    // ธนาคารทหารไทยธนชาต
    {
      regex: /TTB Account\s*\(([^)]+)\)\s+(IN|OUT)\s*฿?([0-9,]+\.?\d*)/i,
      bankName: 'TTB',
    },
  ];

  static parse(message: string): ParsedBankMessage | null {
    for (const pattern of this.patterns) {
      const match = message.match(pattern.regex);
      if (match) {
        const accountNumber = match[1]; // รักษาเลขบัญชีที่มีการเซ็นเซอร์
        const type = this.normalizeTransactionType(match[2]);
        const amount = parseFloat(match[3].replace(/,/g, ''));

        return {
          accountNumber,
          type,
          amount,
          description: this.extractDescription(message),
          rawMessage: message,
        };
      }
    }
    return null;
  }

  private static normalizeTransactionType(
    type: string
  ): 'deposit' | 'withdraw' | 'transfer' {
    const lowerType = type.toLowerCase();

    // รูปแบบภาษาไทย
    if (lowerType.includes('ฝาก') || lowerType.includes('รับเงิน') || lowerType.includes('in')) {
      return 'deposit';
    }
    if (lowerType.includes('ถอน') || lowerType.includes('จ่ายเงิน') || lowerType.includes('out')) {
      return 'withdraw';
    }

    // รูปแบบภาษาอังกฤษ
    if (lowerType.includes('deposit') || lowerType.includes('credit') || lowerType.includes('cr')) {
      return 'deposit';
    }
    if (lowerType.includes('withdraw') || lowerType.includes('debit') || lowerType.includes('dr')) {
      return 'withdraw';
    }

    return 'transfer';
  }

  private static extractDescription(message: string): string {
    const descPatterns = [
      /\(([^)]*(?:Transfer|Withdrawal|Deposit|โอน|ถอน|ฝาก)[^)]*)\)/i,
      /รายการ:([^\n\r]+)/i,
      /หมายเหตุ:([^\n\r]+)/i,
    ];

    for (const pattern of descPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }
}