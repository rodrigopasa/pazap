import { db } from '../db.js';
import { users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function createAdminUser() {
  try {
    // Verificar se o usuário admin já existe
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'Hisoka')).limit(1);
    
    if (existingAdmin.length === 0) {
      // Criar o usuário admin
      await db.insert(users).values({
        username: 'Hisoka',
        email: 'admin@whatsapp.com',
        password: 'Antonio1209#', // Em produção, você deve usar hash da senha
        role: 'admin'
      });
      
      console.log('✅ Usuário admin Hisoka criado com sucesso');
    } else {
      console.log('ℹ️ Usuário admin Hisoka já existe');
    }
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error);
  }
}