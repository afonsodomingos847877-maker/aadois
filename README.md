# ADOIS — Only Two. Nothing Else.

> **Plataforma digital de comunicação privada para exclusivamente duas pessoas.**  
> Inspirada na estética minimalista da Tesla. Protegida por Criptografia Ponta a Ponta Real (E2EE) Zero-Knowledge.

---

## ⚡ Conceito

A ADOIS não é uma rede social convencional. Não existem seguidores, canais públicos, feeds ou interações com desconhecidos.

**ONLY TWO. NOTHING ELSE.**

Duas pessoas. Um espaço privado. Uma conexão protegida.

---

## 🛡️ Arquitetura de Segurança & Criptografia Ponta a Ponta

- **Zero-Knowledge**: O servidor central e a equipa administrativa nunca têm acesso às chaves privadas, às chaves de sessão nem ao conteúdo decifrado de mensagens ou ficheiros.
- **Acordo de Chaves Assimétricas**: Utilização da **Web Crypto API** padrão do W3C com curvas elípticas **ECDH (NIST P-256)**.
- **Armazenamento Seguro Local**: As chaves privadas são geradas no navegador/smartphone e persistidas isoladamente no **IndexedDB** do dispositivo (`extractable: false`).
- **Derivação de Chave de Sessão**: **HKDF com SHA-256** combinando os segredos trocados e o identificador único do espaço.
- **Cifragem de Mensagens e Ficheiros**: **AES-256-GCM** com IVs criptográficos dinâmicos de 96 bits por mensagem e por ficheiro, garantindo integridade e confidencialidade autenticada (AEAD).
- **Código de Segurança (Safety Numbers)**: Impressão digital numérica verificável de 30 dígitos (como no Signal) para atestar a identidade de ambos os pares e prevenir ataques Man-in-the-Middle.
- **Regra Inviolável de Dois Participantes**: A modelagem de dados e as restrições transacionais garantem estritamente `user1` e `user2`. A entrada de um terceiro elemento é bloqueada estruturalmente.

---

## 📁 Estrutura do Projeto

```
/
├── prisma/
│   └── schema.prisma         # Modelagem relacional estrita (User, Space, EncryptedMessage, EncryptedFile, Device, AuditLog)
├── src/
│   ├── app/
│   │   ├── page.tsx          # Landing page minimalista estilo Tesla
│   │   ├── auth/             # Registo e Login com geração automática de chaves locais
│   │   ├── dashboard/        # Dashboard com estado conectado vs. pendente
│   │   ├── chat/             # Chat privado em tempo real (WebSockets + E2EE)
│   │   ├── space/files/      # "O Nosso Espaço" - Cofre de ficheiros decifrados em memória
│   │   ├── settings/         # Gestão de dispositivos, identidade e encerramento de conexão
│   │   ├── admin/            # Painel administrativo Zero-Knowledge (Telemetria)
│   │   └── api/              # Endpoints REST autenticados com HttpOnly cookies
│   ├── lib/
│   │   ├── crypto.ts         # Motor criptográfico Web Crypto API (ECDH, HKDF, AES-GCM)
│   │   ├── prisma.ts         # Singleton Prisma Client
│   │   └── auth.ts           # Hash bcrypt, JWT e sessões
│   └── components/
│       └── Navbar.tsx        # Navegação com tipografia geométrica
├── server.js                 # Servidor unificado Node.js + Next.js + Socket.IO
├── test/
│   └── verify_adois.js       # Suite de testes automatizados de integração e segurança
└── uploads/encrypted/        # Armazenamento de blobs binários opacos cifrados
```

---

## 🌐 Serviços em Nuvem Integrados

- **Base de Dados**: **MongoDB Atlas** (`cluster0.oe0akin.mongodb.net/aadoisdb`) via Prisma ORM com suporte a Replica Set e indexação atômica.
- **Armazenamento de Ficheiros Cifrados**: **Cloudinary** (`dnvnftvky`) em modo `raw`, armazenando blobs opacos protegidos por criptografia ponta a ponta (AES-256-GCM).

---

## 🚀 Como Executar

### 1. Instalar dependências
```bash
npm install
```

### 2. Inicializar a Base de Dados
```bash
npm run prisma:generate
npm run prisma:push
```

### 3. Executar a Suite de Testes
```bash
npm test
```

### 4. Iniciar o Servidor em Modo de Desenvolvimento
```bash
npm run dev
```

Aceda à plataforma em: **`http://localhost:3000`** (ou defina a porta via `PORT=3000`).

---

## 🎨 Identidade Visual (Tesla Aesthetic)

- **Preto absoluto**: `#000000`
- **Preto secundário**: `#111111`
- **Branco**: `#FFFFFF`
- **Cinzento escuro**: `#1A1A1A`
- **Cinzento médio**: `#808080`
- **Bordas sutis**: `rgba(255, 255, 255, 0.08)`
- Modo escuro permanente, botões lineares e tipografia geométrica.
