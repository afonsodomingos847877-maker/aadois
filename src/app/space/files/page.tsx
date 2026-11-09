'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  getLocalKeyPair,
  importPeerPublicKey,
  deriveRoomKey,
  encryptFileBuffer,
  decryptFileBuffer,
  encryptTextMessage,
  decryptTextMessage,
} from '@/lib/crypto';
import {
  FileText,
  Image as ImageIcon,
  Video,
  UploadCloud,
  Download,
  Lock,
  Search,
  Eye,
  X,
  FileCheck,
  FolderLock,
  ArrowLeft,
} from 'lucide-react';

interface EncryptedFileItem {
  id: string;
  senderId: string;
  fileType: 'image' | 'video' | 'document';
  mimeType: string;
  sizeBytes: number;
  iv: string;
  fileNameCiphertext: string;
  createdAt: string;
  decryptedFileName?: string;
  blobUrl?: string;
}

export default function OurSpaceFilesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [space, setSpace] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [roomKey, setRoomKey] = useState<CryptoKey | null>(null);

  const [files, setFiles] = useState<EncryptedFileItem[]>([]);
  const [category, setCategory] = useState<'all' | 'image' | 'video' | 'document'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Preview modal
  const [previewItem, setPreviewItem] = useState<{
    fileType: string;
    blobUrl: string;
    fileName: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadSpace() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/auth');
          return;
        }
        const meData = await meRes.json();
        setCurrentUser(meData.user);

        const currentSpace = meData.space;
        if (!currentSpace || !currentSpace.user2) {
          router.push('/dashboard');
          return;
        }
        setSpace(currentSpace);
        const peer =
          currentSpace.user1.id === meData.user.id ? currentSpace.user2 : currentSpace.user1;
        setPartner(peer);

        // Derive E2EE Key
        const localKeyPairData = await getLocalKeyPair();
        if (!localKeyPairData || !peer.publicKey) {
          router.push('/chat');
          return;
        }

        const peerCryptoKey = await importPeerPublicKey(peer.publicKey);
        const derived = await deriveRoomKey(
          localKeyPairData.keyPair.privateKey,
          peerCryptoKey,
          currentSpace.id
        );
        setRoomKey(derived);

        // Fetch files list
        const filesRes = await fetch(`/api/files/space/${currentSpace.id}`);
        const filesData = await filesRes.json();

        if (filesData.files) {
          // Decrypt filenames
          const listWithNames: EncryptedFileItem[] = [];
          for (const f of filesData.files) {
            let decryptedName = 'Ficheiro Encriptado';
            try {
              if (f.fileNameCiphertext) {
                decryptedName = await decryptTextMessage(f.fileNameCiphertext, f.iv, derived);
              }
            } catch (e) {
              console.error('Filename decrypt failed', e);
            }
            listWithNames.push({
              ...f,
              decryptedFileName: decryptedName,
            });
          }
          setFiles(listWithNames);
        }
      } catch (err) {
        console.error('Error loading files space:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSpace();
  }, [router]);

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !roomKey || !space) return;

    setUploading(true);
    setUploadProgress('A encriptar ficheiro no dispositivo (AES-256-GCM)...');

    try {
      // 1. Read file buffer
      const arrayBuffer = await selectedFile.arrayBuffer();

      // 2. Encrypt file buffer locally
      const { encryptedBuffer, ivBase64 } = await encryptFileBuffer(arrayBuffer, roomKey);

      // 3. Encrypt original filename using same key
      const nameEnc = await encryptTextMessage(selectedFile.name, roomKey);

      setUploadProgress('A transferir dados cifrados para o cofre...');

      // 4. Determine category
      let fileType: 'image' | 'video' | 'document' = 'document';
      if (selectedFile.type.startsWith('image/')) fileType = 'image';
      else if (selectedFile.type.startsWith('video/')) fileType = 'video';

      // 5. Build FormData with encrypted binary blob
      const encryptedBlob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
      const formData = new FormData();
      formData.append('file', encryptedBlob);
      formData.append('spaceId', space.id);
      formData.append('fileType', fileType);
      formData.append('mimeType', selectedFile.type);
      formData.append('iv', ivBase64);
      formData.append('fileNameCiphertext', nameEnc.ciphertext);

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no upload');

      // Append newly uploaded file
      setFiles((prev) => [
        {
          id: data.file.id,
          senderId: currentUser.id,
          fileType,
          mimeType: selectedFile.type,
          sizeBytes: encryptedBlob.size,
          iv: ivBase64,
          fileNameCiphertext: nameEnc.ciphertext,
          createdAt: data.file.createdAt,
          decryptedFileName: selectedFile.name,
        },
        ...prev,
      ]);

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar ficheiro.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  // Download & Decrypt in memory
  const handleDownloadFile = async (item: EncryptedFileItem, isPreview = false) => {
    if (!roomKey) return;

    try {
      const res = await fetch(`/api/files/${item.id}/download`);
      if (!res.ok) throw new Error('Falha ao descarregar');

      const encryptedBuffer = await res.arrayBuffer();
      const decryptedBuffer = await decryptFileBuffer(encryptedBuffer, item.iv, roomKey);

      const blob = new Blob([decryptedBuffer], { type: item.mimeType });
      const blobUrl = URL.createObjectURL(blob);

      if (isPreview) {
        setPreviewItem({
          fileType: item.fileType,
          blobUrl,
          fileName: item.decryptedFileName || 'Ficheiro',
        });
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = item.decryptedFileName || `adois-${item.id}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Decryption failed on download:', err);
      alert('Não foi possível decifrar o ficheiro.');
    }
  };

  // Filter list
  const filteredFiles = files.filter((f) => {
    const matchesCategory = category === 'all' || f.fileType === category;
    const matchesSearch =
      !searchQuery ||
      (f.decryptedFileName &&
        f.decryptedFileName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-500 font-mono text-xs uppercase tracking-widest">
        A carregar cofre privado...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pt-32 pb-24">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-8 border-b border-white/[0.08] mb-10 gap-6">
          <div>
            <Link
              href="/dashboard"
              className="text-xs uppercase tracking-[0.25em] text-gray-500 hover:text-white flex items-center space-x-1 mb-3 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Dashboard</span>
            </Link>
            <h1 className="text-3xl font-bold uppercase tracking-widest text-white">
              O Nosso Espaço
            </h1>
            <p className="text-xs text-gray-400 font-light mt-1">
              Cofre exclusivo de memórias, fotografias e ficheiros partilhados entre ti e {partner?.name}.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-6 py-3.5 bg-white text-black font-semibold text-xs uppercase tracking-[0.2em] hover:bg-gray-200 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{uploading ? 'A encriptar...' : 'Enviar Ficheiro'}</span>
            </button>
          </div>
        </div>

        {uploadProgress && (
          <div className="mb-8 p-4 border border-white/20 bg-[#0d0d0d] text-xs font-mono text-gray-300 flex items-center space-x-3">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>{uploadProgress}</span>
          </div>
        )}

        {/* Filter Tabs and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/[0.06] mb-8 gap-4">
          <div className="flex space-x-2 overflow-x-auto">
            {(['all', 'image', 'video', 'document'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 text-xs uppercase tracking-widest font-semibold transition-colors ${
                  category === cat
                    ? 'bg-white text-black'
                    : 'text-gray-400 border border-white/10 hover:border-white/30'
                }`}
              >
                {cat === 'all'
                  ? 'Todos'
                  : cat === 'image'
                  ? 'Fotografias'
                  : cat === 'video'
                  ? 'Vídeos'
                  : 'Documentos'}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar ficheiros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-[#0c0c0c] border border-white/10 text-xs text-white focus:outline-none focus:border-white transition-colors"
            />
          </div>
        </div>

        {/* Files Grid / List */}
        {filteredFiles.length === 0 ? (
          <div className="py-20 text-center border border-white/[0.06] bg-[#080808]">
            <FolderLock className="w-8 h-8 text-gray-600 mx-auto mb-4" />
            <div className="text-sm uppercase tracking-widest font-semibold text-gray-400 mb-1">
              Nenhum ficheiro partilhado
            </div>
            <p className="text-xs text-gray-600 max-w-sm mx-auto">
              Todos os ficheiros enviados aqui são encriptados com AES-256-GCM antes de serem
              carregados e apenas podem ser decifrados por ti e por {partner?.name}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="border border-white/[0.08] bg-[#0c0c0c] p-6 flex flex-col justify-between hover:border-white/20 transition-colors group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 border border-white/10 bg-black text-white">
                      {file.fileType === 'image' ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : file.fileType === 'video' ? (
                        <Video className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(file.createdAt).toLocaleDateString('pt-PT')}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-white tracking-wide truncate mb-1" title={file.decryptedFileName}>
                    {file.decryptedFileName}
                  </h3>
                  <div className="text-[11px] text-gray-500 font-mono">
                    {formatSize(file.sizeBytes)} • {file.mimeType}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] text-green-400 font-mono flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>E2EE Cifrado</span>
                  </span>

                  <div className="flex items-center space-x-2">
                    {(file.fileType === 'image' || file.fileType === 'video') && (
                      <button
                        onClick={() => handleDownloadFile(file, true)}
                        className="p-1.5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Pré-visualizar"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadFile(file, false)}
                      className="p-1.5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title="Descarregar e decifrar"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox / Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => {
                URL.revokeObjectURL(previewItem.blobUrl);
                setPreviewItem(null);
              }}
              className="absolute -top-12 right-0 p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {previewItem.fileType === 'image' ? (
              <img
                src={previewItem.blobUrl}
                alt={previewItem.fileName}
                className="max-h-[80vh] max-w-full object-contain border border-white/10"
              />
            ) : (
              <video
                src={previewItem.blobUrl}
                controls
                autoPlay
                className="max-h-[80vh] max-w-full border border-white/10"
              />
            )}

            <div className="mt-4 text-xs font-mono text-gray-300">
              {previewItem.fileName} (Decifrado em memória)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
