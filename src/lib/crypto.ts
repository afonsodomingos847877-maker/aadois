/**
 * ADOIS End-to-End Encryption (E2EE) Engine
 *
 * Implements Zero-Knowledge cryptographic operations using the standard W3C Web Crypto API.
 * - Key Agreement: ECDH (NIST P-256)
 * - Key Derivation: HKDF (SHA-256)
 * - Symmetric Encryption: AES-256-GCM with 96-bit unique IVs
 * - Safety Verification: Cryptographic Fingerprints (Safety Numbers)
 */

const DB_NAME = 'adois_secure_store_v1';
const STORE_NAME = 'key_pairs';
const KEY_RECORD_ID = 'local_identity_key';

// Helper: Convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// 1. IndexedDB Secure Storage for Private Keys (never sent to server)
async function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeLocalKeyPair(keyPair: CryptoKeyPair, publicSpkiBase64: string): Promise<void> {
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record = {
      id: KEY_RECORD_ID,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      spki: publicSpkiBase64,
      createdAt: Date.now(),
    };
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalKeyPair(): Promise<{
  keyPair: CryptoKeyPair;
  spki: string;
} | null> {
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(KEY_RECORD_ID);
    request.onsuccess = () => {
      const res = request.result;
      if (res && res.privateKey && res.publicKey) {
        resolve({
          keyPair: { privateKey: res.privateKey, publicKey: res.publicKey },
          spki: res.spki,
        });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// 2. ECDH Key Generation
export async function generateIdentityKeyPair(): Promise<{
  keyPair: CryptoKeyPair;
  publicSpkiBase64: string;
}> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );

  const spkiBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicSpkiBase64 = bufferToBase64(spkiBuffer);

  await storeLocalKeyPair(keyPair, publicSpkiBase64);

  return { keyPair, publicSpkiBase64 };
}

// 3. Import Peer Public Key (SPKI format in Base64)
export async function importPeerPublicKey(spkiBase64: string): Promise<CryptoKey> {
  const buffer = base64ToBuffer(spkiBase64);
  return await window.crypto.subtle.importKey(
    'spki',
    buffer as unknown as BufferSource,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    []
  );
}

// 4. Derive Room Symmetric Key (AES-256-GCM) via ECDH + HKDF
export async function deriveRoomKey(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey,
  spaceId: string
): Promise<CryptoKey> {
  // Compute raw shared secret bits
  const sharedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: theirPublicKey,
    },
    myPrivateKey,
    256
  );

  // Import bits as an HKDF master key
  const hkdfKey = await window.crypto.subtle.importKey(
    'raw',
    sharedBits,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  const enc = new TextEncoder();
  const salt = enc.encode(`ADOIS-SALT-${spaceId}`);
  const info = enc.encode('ADOIS-E2EE-AES-GCM-256');

  // Derive AES-GCM 256 key
  return await window.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info,
    },
    hkdfKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

// 5. Encrypt Text Message
export async function encryptTextMessage(
  plaintext: string,
  aesKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const encodedText = enc.encode(plaintext);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    aesKey,
    encodedText
  );

  return {
    ciphertext: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv),
  };
}

// 6. Decrypt Text Message
export async function decryptTextMessage(
  ciphertextBase64: string,
  ivBase64: string,
  aesKey: CryptoKey
): Promise<string> {
  const cipherBuffer = base64ToBuffer(ciphertextBase64);
  const iv = base64ToBuffer(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    aesKey,
    cipherBuffer as unknown as BufferSource
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

// 7. Encrypt File Buffer
export async function encryptFileBuffer(
  fileBuffer: ArrayBuffer,
  aesKey: CryptoKey
): Promise<{ encryptedBuffer: ArrayBuffer; ivBase64: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    aesKey,
    fileBuffer
  );

  return {
    encryptedBuffer,
    ivBase64: bufferToBase64(iv),
  };
}

// 8. Decrypt File Buffer
export async function decryptFileBuffer(
  encryptedBuffer: ArrayBuffer,
  ivBase64: string,
  aesKey: CryptoKey
): Promise<ArrayBuffer> {
  const iv = base64ToBuffer(ivBase64);
  return await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    aesKey,
    encryptedBuffer
  );
}

// 9. Compute Safety Number (Numeric Fingerprint for Identity Verification)
// Generates a human-verifiable 6-group 30-digit security code (like Signal)
export async function computeSafetyNumber(pubKeyA: string, pubKeyB: string): Promise<string[]> {
  const sorted = [pubKeyA, pubKeyB].sort();
  const enc = new TextEncoder();
  const data = enc.encode(sorted.join(':::ADOIS_SAFETY_NUMBER:::'));

  const hashBuffer = await window.crypto.subtle.digest('SHA-512', data);
  const hashBytes = new Uint8Array(hashBuffer);

  const groups: string[] = [];
  for (let i = 0; i < 6; i++) {
    const chunk = hashBytes.slice(i * 5, (i + 1) * 5);
    let num = 0;
    for (let j = 0; j < chunk.length; j++) {
      const b = chunk[j];
      num = (num * 256 + b) % 100000;
    }
    groups.push(num.toString().padStart(5, '0'));
  }

  return groups; // e.g. ["24819", "09412", "76192", "33401", "88210", "41098"]
}
