'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { io, Socket } from 'socket.io-client';
import {
  getLocalKeyPair,
  importPeerPublicKey,
  deriveRoomKey,
  encryptTextMessage,
  decryptTextMessage,
  computeSafetyNumber,
} from '@/lib/crypto';
import {
  Send,
  Lock,
  Clock,
  Trash2,
  CornerUpLeft,
  Search,
  ShieldCheck,
  Check,
  CheckCheck,
  X,
  FileUp,
  FolderLock,
  AlertTriangle,
  ArrowLeft,
  LogOut,
} from 'lucide-react';

interface DecryptedMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'read';
  ephemeralTtl: number | null;
  expiresAt: string | null;
  replyToId?: string | null;
  reactions?: Record<string, string[]>;
}

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [space, setSpace] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // E2EE state
  const [roomKey, setRoomKey] = useState<CryptoKey | null>(null);
  const [cryptoError, setCryptoError] = useState('');
  const [safetyNumbers, setSafetyNumbers] = useState<string[] | null>(null);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [ephemeralTtl, setEphemeralTtl] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<DecryptedMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Privacy screen shield on blur/tab switch
  const [isScreenHidden, setIsScreenHidden] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [terminating, setTerminating] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPartnerTyping]);

  // Privacy screen blur on visibility change
  useEffect(() => {
    const onVisibilityChange = () => {
      setIsScreenHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // 1. Initial Load & E2EE Handshake
  useEffect(() => {
    let socket: Socket;

    async function initChat() {
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
        if (!localKeyPairData) {
          setCryptoError('Chave privada local não encontrada neste navegador.');
          setLoading(false);
          return;
        }

        if (!peer.publicKey) {
          setCryptoError('O segundo participante ainda não registou uma chave pública.');
          setLoading(false);
          return;
        }

        const peerCryptoKey = await importPeerPublicKey(peer.publicKey);
        const derived = await deriveRoomKey(
          localKeyPairData.keyPair.privateKey,
          peerCryptoKey,
          currentSpace.id
        );
        setRoomKey(derived);

        // Compute Safety Numbers
        if (localKeyPairData.spki && peer.publicKey) {
          const numbers = await computeSafetyNumber(localKeyPairData.spki, peer.publicKey);
          setSafetyNumbers(numbers);
        }

        // Fetch History
        const historyRes = await fetch(`/api/messages/history?spaceId=${currentSpace.id}`);
        const historyData = await historyRes.json();

        if (historyData.messages) {
          const decryptedList: DecryptedMessage[] = [];
          for (const raw of historyData.messages) {
            try {
              const plain = await decryptTextMessage(raw.ciphertext, raw.iv, derived);
              let reactionsObj: Record<string, string[]> = {};
              if (raw.reactions) {
                try {
                  reactionsObj = JSON.parse(raw.reactions);
                } catch (e) {}
              }
              decryptedList.push({
                id: raw.id,
                senderId: raw.senderId,
                text: plain,
                createdAt: raw.createdAt,
                status: raw.status,
                ephemeralTtl: raw.ephemeralTtl,
                expiresAt: raw.expiresAt,
                replyToId: raw.replyToId,
                reactions: reactionsObj,
              });
            } catch (decErr) {
              console.error('Decryption failed for message:', raw.id);
            }
          }
          setMessages(decryptedList);
        }

        // Connect Socket.IO
        socket = io(window.location.origin, {
          transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('join-space', { spaceId: currentSpace.id });
        });

        socket.on('space-joined', ({ isPartnerOnline: pOnline }) => {
          setIsPartnerOnline(pOnline);
        });

        socket.on('partner-presence', ({ status }) => {
          setIsPartnerOnline(status === 'online');
        });

        socket.on('partner-typing', ({ isTyping }) => {
          setIsPartnerTyping(isTyping);
        });

        socket.on('receive-message', async (newMsg) => {
          try {
            const plain = await decryptTextMessage(newMsg.ciphertext, newMsg.iv, derived);
            setMessages((prev) => [
              ...prev,
              {
                id: newMsg.id,
                senderId: newMsg.senderId,
                text: plain,
                createdAt: newMsg.createdAt,
                status: 'read',
                ephemeralTtl: newMsg.ephemeralTtl,
                expiresAt: newMsg.expiresAt,
                replyToId: newMsg.replyToId,
                reactions: {},
              },
            ]);

            socket.emit('mark-read', {
              spaceId: currentSpace.id,
              messageIds: [newMsg.id],
            });
          } catch (e) {
            console.error('Error decrypting incoming message:', e);
          }
        });

        socket.on('messages-read', ({ messageIds }) => {
          setMessages((prev) =>
            prev.map((m) => (messageIds.includes(m.id) ? { ...m, status: 'read' } : m))
          );
        });

        socket.on('message-deleted', ({ messageId }) => {
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        });

        socket.on('message-reaction-updated', ({ messageId, reactions }) => {
          try {
            const parsed = JSON.parse(reactions);
            setMessages((prev) =>
              prev.map((m) => (m.id === messageId ? { ...m, reactions: parsed } : m))
            );
          } catch (e) {}
        });

        setLoading(false);
      } catch (err: any) {
        console.error('Chat init error:', err);
        setCryptoError(err.message || 'Falha ao inicializar chat privado.');
        setLoading(false);
      }
    }

    initChat();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [router]);

  const handleTerminateConnection = async () => {
    if (!space?.id) return;
    setTerminating(true);
    try {
      const res = await fetch('/api/spaces/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId: space.id }),
      });
      if (res.ok) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTerminating(false);
    }
  };

  // Typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socketRef.current || !space) return;

    socketRef.current.emit('typing', { spaceId: space.id, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { spaceId: space.id, isTyping: false });
    }, 2000);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !roomKey || !space || !socketRef.current) return;

    const messageText = inputText.trim();
    setInputText('');

    try {
      const { ciphertext, iv } = await encryptTextMessage(messageText, roomKey);

      socketRef.current.emit(
        'send-message',
        {
          spaceId: space.id,
          ciphertext,
          iv,
          ephemeralTtl: ephemeralTtl || null,
          replyToId: replyingTo?.id || null,
        },
        (res: any) => {
          if (res?.success && res.message) {
            setMessages((prev) => [
              ...prev,
              {
                id: res.message.id,
                senderId: currentUser.id,
                text: messageText,
                createdAt: res.message.createdAt,
                status: 'sent',
                ephemeralTtl: res.message.ephemeralTtl,
                expiresAt: res.message.expiresAt,
                replyToId: replyingTo?.id || null,
                reactions: {},
              },
            ]);
            setReplyingTo(null);
          }
        }
      );
    } catch (err) {
      console.error('Failed to send encrypted message:', err);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!socketRef.current || !space) return;
    socketRef.current.emit('delete-message', { spaceId: space.id, messageId });
  };

  const handleReact = (messageId: string, emoji: string) => {
    if (!socketRef.current || !space) return;
    socketRef.current.emit('react-message', { spaceId: space.id, messageId, emoji });
  };

  // Auto detect URLs for clickable links
  const renderMessageContent = (text: string) => {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlPattern);

    return parts.map((part, index) => {
      if (part.match(urlPattern)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80 break-all text-sky-400 font-medium"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const filteredMessages = searchQuery
    ? messages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono text-sm uppercase tracking-widest">
        A inicializar chaves criptográficas ponta a ponta...
      </div>
    );
  }

  if (cryptoError) {
    return (
      <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
        <Navbar />
        <div className="pt-36 max-w-lg mx-auto px-6 text-center">
          <div className="p-6 border border-red-500/40 bg-red-950/20 text-red-300 text-sm mb-6">
            <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-400" />
            <span className="font-bold uppercase tracking-wider block mb-2">
              Erro de Criptografia
            </span>
            <span>{cryptoError}</span>
          </div>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden selection:bg-white selection:text-black">
      {/* Privacy Shield Overlay on Focus Loss */}
      {isScreenHidden && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-center p-6 select-none">
          <Lock className="w-12 h-12 text-zinc-500 mb-4" />
          <div className="text-base font-bold uppercase tracking-[0.3em] text-white">ADOIS</div>
          <div className="text-xs text-zinc-400 font-mono tracking-widest mt-2">
            CONTEÚDO PRIVADO PROTEGIDO
          </div>
        </div>
      )}

      {/* 1. TOP HEADER - ULTRA-CLEAR PRESENCE INDICATOR */}
      <header className="h-18 border-b border-zinc-800 bg-[#0d0d0f] px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="p-2 border border-zinc-700/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Voltar ao Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center font-bold text-sm uppercase text-white shadow-inner">
              {partner?.name?.charAt(0)}
            </div>

            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-white">
                {partner?.name}
              </div>

              {/* CLEAR AND PROMINENT ONLINE BADGE */}
              <div className="flex items-center space-x-2 mt-0.5">
                {isPartnerOnline ? (
                  <span className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold tracking-wide uppercase">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                    <span>ONLINE AGORA</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 font-medium tracking-wide uppercase">
                    <span className="w-2 h-2 rounded-full bg-zinc-500" />
                    <span>OFFLINE</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Ephemeral Timer Selector */}
          <div className="flex items-center space-x-1.5 border border-zinc-700/80 px-2.5 py-1.5 bg-zinc-900 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={ephemeralTtl || ''}
              onChange={(e) => setEphemeralTtl(e.target.value ? Number(e.target.value) : null)}
              className="bg-transparent text-zinc-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-zinc-950 text-white">Mensagens: Permanentes</option>
              <option value="30" className="bg-zinc-950 text-white">Autodestruição: 30 seg</option>
              <option value="300" className="bg-zinc-950 text-white">Autodestruição: 5 min</option>
              <option value="3600" className="bg-zinc-950 text-white">Autodestruição: 1 hora</option>
              <option value="86400" className="bg-zinc-950 text-white">Autodestruição: 24 horas</option>
            </select>
          </div>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2.5 border border-zinc-700/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Pesquisar mensagens"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSafetyModal(true)}
            className="p-2.5 border border-zinc-700/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Código de Segurança E2EE"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </button>

          <Link
            href="/space/files"
            className="p-2.5 border border-zinc-700/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="O Nosso Espaço (Ficheiros)"
          >
            <FolderLock className="w-4 h-4" />
          </Link>

          <button
            onClick={() => setShowTerminateModal(true)}
            className="p-2.5 border border-zinc-700/80 hover:border-red-500/50 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
            title="Encerrar conexão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. SEARCH DRAWER */}
      {showSearch && (
        <div className="p-3 bg-[#111114] border-b border-zinc-800 flex items-center space-x-3 px-6">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Pesquisar mensagens decifradas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none flex-1 font-sans"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* 3. MESSAGES SCROLL AREA (SUPER LEGIBLE) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black">
        {/* Security Banner */}
        <div className="max-w-md mx-auto my-4 p-4 border border-zinc-800 bg-[#0e0e10] text-center">
          <div className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest text-zinc-300 font-mono mb-1">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Criptografia Ponta a Ponta Ativa</span>
          </div>
          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            Apenas tu e {partner?.name} conseguem ler estas mensagens. O servidor não tem acesso às chaves.
          </p>
        </div>

        {/* Messages */}
        {filteredMessages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const repliedMsg = msg.replyToId
            ? messages.find((m) => m.id === msg.replyToId)
            : null;

          return (
            <div
              key={msg.id}
              className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
            >
              {/* Replied Message Quote */}
              {repliedMsg && (
                <div
                  className={`text-xs text-zinc-400 mb-1 max-w-sm truncate border-l-2 pl-2 ${
                    isMe ? 'border-white text-right' : 'border-zinc-500 text-left'
                  }`}
                >
                  <span className="font-semibold uppercase tracking-wider text-zinc-300">
                    {repliedMsg.senderId === currentUser.id ? 'Tu: ' : `${partner?.name}: `}
                  </span>
                  {repliedMsg.text}
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`relative max-w-md md:max-w-lg p-4 text-[15px] sm:text-base leading-relaxed transition-all shadow-md ${
                  isMe
                    ? 'bg-white text-black font-normal rounded-2xl rounded-tr-sm'
                    : 'bg-[#1c1c1f] text-zinc-100 font-normal border border-zinc-700/60 rounded-2xl rounded-tl-sm'
                }`}
              >
                <div>{renderMessageContent(msg.text)}</div>

                {/* Footer metadata */}
                <div
                  className={`flex items-center justify-end space-x-2 mt-2 text-xs font-mono ${
                    isMe ? 'text-zinc-600' : 'text-zinc-400'
                  }`}
                >
                  {msg.ephemeralTtl && (
                    <span className="flex items-center space-x-1" title="Mensagem temporária">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{msg.ephemeralTtl}s</span>
                    </span>
                  )}
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString('pt-PT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isMe && (
                    <span>
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-4 h-4 text-black" />
                      ) : (
                        <Check className="w-4 h-4 text-zinc-500" />
                      )}
                    </span>
                  )}
                </div>

                {/* Reactions badge */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="absolute -bottom-3 right-2 flex items-center space-x-1 bg-black border border-zinc-700 px-2 py-0.5 rounded-full text-xs shadow-md">
                    {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                      <span key={emoji} className="flex items-center space-x-0.5">
                        <span>{emoji}</span>
                        {userIds.length > 1 && (
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {userIds.length}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Hover Quick Actions */}
              <div
                className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2 mt-1 text-zinc-400 text-xs px-1 ${
                  isMe ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <button
                  onClick={() => setReplyingTo(msg)}
                  className="hover:text-white p-1"
                  title="Responder"
                >
                  <CornerUpLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleReact(msg.id, '❤️')}
                  className="hover:scale-125 transition-transform"
                >
                  ❤️
                </button>
                <button
                  onClick={() => handleReact(msg.id, '👍')}
                  className="hover:scale-125 transition-transform"
                >
                  👍
                </button>
                <button
                  onClick={() => handleReact(msg.id, '🔥')}
                  className="hover:scale-125 transition-transform"
                >
                  🔥
                </button>
                {isMe && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="hover:text-red-400 p-1"
                    title="Apagar mensagem"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Partner Typing Bubble */}
        {isPartnerTyping && (
          <div className="flex items-center space-x-2 text-xs text-zinc-300 font-mono py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce" />
            <span>{partner?.name} está a escrever...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. REPLYING BAR */}
      {replyingTo && (
        <div className="p-3 bg-[#131316] border-t border-zinc-800 flex items-center justify-between px-6 text-xs text-zinc-300">
          <div className="flex items-center space-x-2 truncate">
            <CornerUpLeft className="w-4 h-4 text-white" />
            <span className="uppercase tracking-wider text-white font-semibold">
              A responder a:
            </span>
            <span className="truncate italic">"{replyingTo.text}"</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. BOTTOM INPUT BAR (HIGH CONTRAST & VERY LEGIBLE) */}
      <footer className="p-4 border-t border-zinc-800 bg-[#0d0d0f] shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto flex items-center space-x-3">
          <Link
            href="/space/files"
            className="p-3.5 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Enviar ficheiro encriptado"
          >
            <FileUp className="w-5 h-5" />
          </Link>

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Mensagem encriptada ponta a ponta..."
            className="flex-1 px-4 py-3.5 bg-black border border-zinc-700 text-white text-base placeholder:text-zinc-500 focus:outline-none focus:border-white transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-6 py-3.5 bg-white text-black font-bold text-sm uppercase tracking-wider hover:bg-zinc-200 transition-colors flex items-center space-x-2 disabled:opacity-30 shadow-md"
          >
            <span>Enviar</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>

      {/* 6. SAFETY MODAL */}
      {showSafetyModal && safetyNumbers && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-zinc-700 bg-[#0d0d0f] p-8 text-center shadow-2xl">
            <div className="w-12 h-12 border border-zinc-700 mx-auto flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-wider text-white mb-2">
              Verificação de Identidade
            </h3>
            <p className="text-sm text-zinc-300 font-light leading-relaxed mb-6">
              Compara este código de 30 dígitos com o que aparece no ecrã de {partner?.name} para
              confirmar que a ligação é 100% segura e direta.
            </p>

            <div className="grid grid-cols-3 gap-2 font-mono text-sm font-bold text-white mb-8">
              {safetyNumbers.map((group, idx) => (
                <div key={idx} className="p-3 border border-zinc-700 bg-black tracking-widest shadow-inner">
                  {group}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowSafetyModal(false)}
              className="w-full py-3.5 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors"
            >
              Confirmar e Fechar
            </button>
          </div>
        </div>
      )}

      {/* 7. TERMINATE CONNECTION CONFIRMATION MODAL */}
      {showTerminateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-zinc-800 bg-[#0e0e10] p-8 text-center relative shadow-2xl">
            <button
              onClick={() => setShowTerminateModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold uppercase tracking-wider text-white mb-2">
              Encerrar Conexão com {partner?.name}?
            </h3>
            <p className="text-xs text-zinc-400 font-light leading-relaxed mb-6">
              Ao encerrar esta conexão, este espaço será finalizado e poderás iniciar ou entrar num
              novo espaço com outra pessoa.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleTerminateConnection}
                disabled={terminating}
                className="w-full sm:w-auto px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {terminating ? 'A encerrar...' : 'Sim, Encerrar'}
              </button>
              <button
                onClick={() => setShowTerminateModal(false)}
                className="w-full sm:w-auto px-6 py-3.5 border border-zinc-700 text-zinc-300 hover:text-white text-xs uppercase tracking-widest transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
