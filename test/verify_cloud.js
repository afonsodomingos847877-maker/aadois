const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dnvnftvky',
  api_key: process.env.CLOUDINARY_API_KEY || '259851568455899',
  api_secret: process.env.CLOUDINARY_API_SECRET || '3hRsXzUVd3pnwn9IKQWN7UAeJLc',
  secure: true,
});

const prisma = new PrismaClient();

async function verifyCloudSetup() {
  console.log('====================================================');
  console.log('☁️ ADOIS — VERIFICAÇÃO MONGODB ATLAS & CLOUDINARY');
  console.log('====================================================\n');

  try {
    // 1. Test MongoDB Atlas Connection
    console.log('1. A testar conexão ao MongoDB Atlas (aadoisdb)...');
    const userCount = await prisma.user.count();
    console.log(`✔ Conexão MongoDB Atlas bem-sucedida! Utilizadores na base: ${userCount}`);

    // 2. Test Cloudinary Encrypted Blob Upload
    console.log('\n2. A testar upload de blob cifrado para o Cloudinary...');
    const mockEncryptedData = Buffer.from('TESTE_PAYLOAD_CIFRADO_ADOIS_AES_256_GCM_RAW_BLOB');

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'adois_encrypted_vault_test',
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result);
        }
      );
      stream.end(mockEncryptedData);
    });

    console.log(`✔ Upload para Cloudinary concluído com sucesso!`);
    console.log(`  - URL Seguro: ${uploadResult.secure_url}`);
    console.log(`  - Public ID: ${uploadResult.public_id}`);
    console.log(`  - Resource Type: ${uploadResult.resource_type}`);
    console.log(`  - Bytes: ${uploadResult.bytes}`);

    // 3. Test Downloading the Encrypted Blob from Cloudinary
    console.log('\n3. A descarregar e verificar integridade do blob cifrado...');
    const response = await fetch(uploadResult.secure_url);
    if (!response.ok) throw new Error(`Falha no download: ${response.status}`);
    const downloadedBuffer = Buffer.from(await response.arrayBuffer());

    if (downloadedBuffer.equals(mockEncryptedData)) {
      console.log('✔ Integridade binária confirmada: o blob descarregado é idêntico ao enviado.');
    } else {
      throw new Error('Inconsistência de integridade binária!');
    }

    // 4. Cleanup Cloudinary Test Asset
    console.log('\n4. A limpar recurso de teste do Cloudinary...');
    await cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: 'raw' });
    console.log('✔ Recurso de teste removido do Cloudinary.');

    console.log('\n====================================================');
    console.log('✅ MONGODB ATLAS E CLOUDINARY TOTALMENTE OPERACIONAIS!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ ERRO NA VERIFICAÇÃO CLOUD:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCloudSetup();

