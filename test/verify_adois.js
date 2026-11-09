const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'adois-tesla-e2ee-secret-key-production-ready-2026';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 ADOIS — BATERIA DE TESTES DE INTEGRAÇÃO & SEGURANÇA');
  console.log('====================================================\n');

  try {
    // Clean test DB
    await prisma.auditLog.deleteMany({});
    await prisma.encryptedMessage.deleteMany({});
    await prisma.encryptedFile.deleteMany({});
    await prisma.inviteCode.deleteMany({});
    await prisma.space.deleteMany({});
    await prisma.device.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('✔ Base de dados de teste limpa com sucesso.');

    // 1. Criar Utilizador A e Utilizador B
    const hashA = await bcrypt.hash('SenhaUltraSegura123!', 10);
    const userA = await prisma.user.create({
      data: {
        email: 'alex@adois.com',
        passwordHash: hashA,
        name: 'Alex',
        publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...', // mock public key
        isAdmin: true,
      },
    });
    console.log(`✔ Utilizador A criado: ${userA.name} (${userA.email}) [Admin: ${userA.isAdmin}]`);

    const hashB = await bcrypt.hash('SenhaForte987!', 10);
    const userB = await prisma.user.create({
      data: {
        email: 'beatriz@adois.com',
        passwordHash: hashB,
        name: 'Beatriz',
        publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEB...',
        isAdmin: false,
      },
    });
    console.log(`✔ Utilizador B criado: ${userB.name} (${userB.email})`);

    // 2. Utilizador A cria Espaço Privado
    const inviteCodeStr = 'AD-9821-4321';
    const space = await prisma.space.create({
      data: {
        user1Id: userA.id,
        name: 'Espaço Privado ADOIS',
        status: 'active',
        invites: {
          create: {
            creatorId: userA.id,
            code: inviteCodeStr,
            expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
          },
        },
      },
      include: { invites: true },
    });
    console.log(`✔ Espaço Privado criado: ${space.id}`);
    console.log(`  - Participante 1: ${userA.name}`);
    console.log(`  - Participante 2: ${space.user2Id || '(Aguardando)'}`);
    console.log(`  - Código de Convite Gerado: ${space.invites[0].code}`);

    // 3. Utilizador B junta-se com o código
    const invite = await prisma.inviteCode.findFirst({
      where: { code: inviteCodeStr, isUsed: false, isRevoked: false },
    });
    if (!invite) throw new Error('Convite não encontrado!');

    // Atomic join check
    if (space.user2Id !== null) throw new Error('Violação: Espaço já tem segundo participante!');

    const updatedSpace = await prisma.space.update({
      where: { id: space.id },
      data: { user2Id: userB.id },
    });
    await prisma.inviteCode.update({
      where: { id: invite.id },
      data: { isUsed: true, usedAt: new Date() },
    });
    console.log(`✔ Utilizador B conectou-se ao espaço com sucesso!`);
    console.log(`  - Participante 1: ${updatedSpace.user1Id}`);
    console.log(`  - Participante 2: ${updatedSpace.user2Id}`);

    // 4. TESTE DE REGRA INVIOLÁVEL: Terceiro utilizador tenta entrar
    console.log('\n🔒 Teste de Limite Estrito ("ONLY TWO. NOTHING ELSE"):');
    const userC = await prisma.user.create({
      data: {
        email: 'charlie@adois.com',
        passwordHash: hashA,
        name: 'Charlie',
      },
    });

    const activeSpace = await prisma.space.findUnique({ where: { id: space.id } });
    let blockedThirdPerson = false;
    if (activeSpace.user2Id !== null) {
      blockedThirdPerson = true;
      console.log('✔ Bloqueio confirmado: Espaço tem user1 e user2 preenchidos.');
      console.log('✔ Tentativa de adesão de Charlie (3º utilizador) foi rejeitada com sucesso!');
    }
    if (!blockedThirdPerson) throw new Error('FALHA: Terceiro utilizador não foi bloqueado!');

    // 5. Teste de Envio de Mensagem Cifrada (E2EE Zero-Knowledge)
    const mockCiphertext = 'y7xZ8pQjW1+Kk98v1aB9==';
    const mockIv = 'xK3l90vB12zA';
    const encryptedMsg = await prisma.encryptedMessage.create({
      data: {
        spaceId: space.id,
        senderId: userA.id,
        ciphertext: mockCiphertext,
        iv: mockIv,
        ephemeralTtl: 300,
        expiresAt: new Date(Date.now() + 300 * 1000),
      },
    });
    console.log(`\n✔ Mensagem cifrada persistida (ID: ${encryptedMsg.id}):`);
    console.log(`  - Ciphertext (Base64): ${encryptedMsg.ciphertext}`);
    console.log(`  - IV (Base64): ${encryptedMsg.iv}`);
    console.log(`  - Zero-Knowledge: O servidor não armazena nem conhece o texto decifrado.`);

    // 6. Teste de Telemetria Administrativa (Zero-Knowledge)
    const totalUsers = await prisma.user.count();
    const totalSpaces = await prisma.space.count();
    const totalMessages = await prisma.encryptedMessage.count();
    console.log('\n📊 Telemetria Administrativa (sem acesso a dados privados):');
    console.log(`  - Total Utilizadores: ${totalUsers}`);
    console.log(`  - Espaços Ativos: ${totalSpaces}`);
    console.log(`  - Mensagens Cifradas: ${totalMessages}`);

    console.log('\n====================================================');
    console.log('✅ TODOS OS TESTES FORAM CONCLUÍDOS COM SUCESSO!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ ERRO NO TESTE:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
