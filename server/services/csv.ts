import fs from 'fs';
import csv from 'csv-parser';
import { InsertContact } from '@shared/schema';

interface CSVContact {
  phone: string;
  name?: string;
  birth_date?: string;
  birthDate?: string;
  birthday?: string;
  tags?: string;
}

class CSVService {
  async parseContactsCSV(filePath: string, userId: number = 1): Promise<InsertContact[]> {
    return new Promise((resolve, reject) => {
      const contacts: InsertContact[] = [];
      const errors: string[] = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: CSVContact) => {
          try {
            const contact = this.parseContactRow(row, userId);
            if (contact) {
              contacts.push(contact);
            }
          } catch (error) {
            errors.push(`Row error: ${error.message}`);
          }
        })
        .on('end', () => {
          // Clean up uploaded file
          fs.unlink(filePath, (err) => {
            if (err) console.error('Failed to delete uploaded file:', err);
          });

          if (errors.length > 0) {
            console.warn('CSV parsing errors:', errors);
          }

          resolve(contacts);
        })
        .on('error', (error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        });
    });
  }

  private parseContactRow(row: CSVContact, userId: number): InsertContact | null {
    // Clean and validate phone number
    const phone = this.cleanPhoneNumber(row.phone);
    if (!phone) {
      throw new Error(`Invalid phone number: ${row.phone}`);
    }

    // Parse birth date
    let birthDate: Date | undefined;
    const birthDateStr = row.birth_date || row.birthDate || row.birthday;
    if (birthDateStr) {
      birthDate = this.parseBirthDate(birthDateStr);
    }

    // Parse tags
    let tags: string[] = [];
    if (row.tags) {
      tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    return {
      phone,
      name: row.name?.trim() || undefined,
      birthDate,
      tags,
      userId,
    };
  }

  private cleanPhoneNumber(phone: string): string | null {
    if (!phone) return null;

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Validate length (should be between 8 and 15 digits)
    if (cleaned.length < 8 || cleaned.length > 15) {
      return null;
    }

    // Add Brazil country code if not present and seems to be a Brazilian number
    if (cleaned.length <= 11 && !cleaned.startsWith('55')) {
      return '55' + cleaned;
    }

    return cleaned;
  }

  private parseBirthDate(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;

    // Try different date formats
    const formats = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY or MM/DD/YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY or MM-DD-YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY or MM.DD.YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let year, month, day;

        if (format === formats[0]) {
          // YYYY-MM-DD
          [, year, month, day] = match;
        } else {
          // Assume DD/MM/YYYY format (common in Brazil)
          [, day, month, year] = match;
        }

        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        // Validate the date
        if (date.getFullYear() == parseInt(year) &&
            date.getMonth() == parseInt(month) - 1 &&
            date.getDate() == parseInt(day)) {
          return date;
        }
      }
    }

    // Try parsing as ISO date
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (error) {
      // Ignore parsing error
    }

    return undefined;
  }

  async exportContactsCSV(contacts: any[], filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const headers = ['phone', 'name', 'birth_date', 'tags'];
      const csvContent = [
        headers.join(','),
        ...contacts.map(contact => [
          contact.phone,
          contact.name || '',
          contact.birthDate ? contact.birthDate.toISOString().split('T')[0] : '',
          contact.tags ? contact.tags.join(';') : ''
        ].map(field => `"${field}"`).join(','))
      ].join('\n');

      fs.writeFile(filePath, csvContent, 'utf8', (error) => {
        if (error) {
          reject(new Error(`Failed to export CSV: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  validateCSVStructure(filePath: string): Promise<{ isValid: boolean; errors: string[]; preview: any[] }> {
    return new Promise((resolve) => {
      const errors: string[] = [];
      const preview: any[] = [];
      let rowCount = 0;
      let hasPhoneColumn = false;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headers: string[]) => {
          // Check if phone column exists
          hasPhoneColumn = headers.some(header => 
            header.toLowerCase().includes('phone') || 
            header.toLowerCase().includes('telefone') ||
            header.toLowerCase().includes('numero')
          );

          if (!hasPhoneColumn) {
            errors.push('CSV must contain a phone/telefone/numero column');
          }
        })
        .on('data', (row: any) => {
          rowCount++;
          
          // Add first 5 rows to preview
          if (preview.length < 5) {
            preview.push(row);
          }

          // Validate phone number in first few rows
          if (rowCount <= 10) {
            const phoneFields = Object.entries(row).find(([key, value]) => 
              key.toLowerCase().includes('phone') || 
              key.toLowerCase().includes('telefone') ||
              key.toLowerCase().includes('numero')
            );

            if (phoneFields && !this.cleanPhoneNumber(phoneFields[1] as string)) {
              errors.push(`Invalid phone number in row ${rowCount}: ${phoneFields[1]}`);
            }
          }
        })
        .on('end', () => {
          const isValid = errors.length === 0 && hasPhoneColumn && rowCount > 0;
          
          if (rowCount === 0) {
            errors.push('CSV file is empty');
          }

          resolve({
            isValid,
            errors,
            preview
          });
        })
        .on('error', (error) => {
          resolve({
            isValid: false,
            errors: [`Failed to parse CSV: ${error.message}`],
            preview: []
          });
        });
    });
  }
}

export const csvService = new CSVService();
