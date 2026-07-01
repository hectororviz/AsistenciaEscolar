import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
  // Admin user
  const hash = await bcrypt.hash('123456', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hash },
    create: { username: 'admin', password: hash, role: 'ADMIN' },
  });

  // Tipos de personal
  const tipos = ['Docente', 'Directivo', 'Auxiliar', 'Administrativo'];
  for (const t of tipos) {
    await prisma.tipoPersonal.upsert({ where: { nombre: t }, update: {}, create: { nombre: t } });
  }

  // Materia por defecto
  await prisma.materia.upsert({ where: { nombre: 'General' }, update: {}, create: { nombre: 'General' } });

  console.log('Seed: admin, tipos de personal y materia creados.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
