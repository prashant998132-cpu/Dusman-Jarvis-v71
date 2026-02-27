'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, Plus, Settings, History, Wrench, Camera, Search, X, Menu } from 'lucide-react'
import JarvisAvatar from '@/components/JarvisAvatar'
import SoundWave from '@/components/SoundWave'
import ToolCard from '@/components/ToolCard'
import TypewriterText from '@/components/TypewriterText'
import CommandPalette from '@/components/CommandPalette'
import SmartStorageAlert from '@/components/SmartStorageAlert'
import SmartSettings from '@/components/SmartSettings'
import { BadgeToast } from '@/components/SmartGamification'
import { TOOLS } from '@/lib/links'
import {
  lsSet, getActiveChat, newChat, saveChat,
  getRelationship, incrementInteraction, updateStreak, getLevelProgress,
  getPreferences, extractProfileInfo, exportAllData,
  getProfile, trackBehavior, checkAndAwardBadges,
  getChats, deleteChat,
  type Message, type Chat, type Relationship, type Badge,
} from '@/lib/memory'
import {
  detectMode, detectEmotionSmart,
  getGreeting, getProactiveSuggestion, keywordFallback,
  getTonyStarkResponse, PERSONALITY_PROMPTS, getAmbientConfig, getAutoTheme,
  speak as speakUtil, stopSpeaking,
} from '@/lib/intelligence'

// ━━━ MODEL LOGOS (Subtle Icons) ━━━
const ModelLogo = ({ model }: { model?: string }) => {
  const isGrok = model?.toLowerCase().includes('grok');
  const isGemini = model?.toLowerCase().includes('gemini');

  if (isGemini) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.7 }}>
        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="url(#gemini-grad)" />
        <defs>
          <linearGradient id="gemini-grad" x1="2" y1="12" x2="22" y2="12" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4E8AFF" /><stop offset="1" stopColor="#E065FF" />
          </linearGradient>
        </defs>
      </svg>
    );
  }
  if (isGrok) {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6, color: '#fff' }}>
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.494h2.039L6.486 3.24H4.298l13.311 17.407z" />
      </svg>
    );
  }
  return null;
};

// ━━━ CHAT BUBBLE ━━━
function ChatBubble({ msg, isNew, ttsEnabled }: { msg: Message; isNew: boolean; ttsEnabled: boolean }) {
  const isJarvis = msg.role === 'jarvis'
  useEffect(() => {
    if (isNew && isJarvis && ttsEnabled) speakUtil(msg.content)
  }, [isNew, isJarvis, ttsEnabled, msg.content])

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      style={{
        display: 'flex',
        justifyContent: isJarvis ? 'flex-start' : 'flex-end',
        marginBottom: 14,
        gap: 10,
        alignItems: 'flex-end',
      }}
    >
      {isJarvis && (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#ff1a88,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, boxShadow: '0 0 12px rgba(255,26,136,0.3)' }}>
          🤖
        </div>
      )}
      <div style={{ maxWidth: '75%', position: 'relative' }}>
        <div style={{
          padding: '10px 14px',
          borderRadius: isJarvis ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          background: isJarvis
            ? 'rgba(255,26,136,0.08)'
            : 'linear-gradient(135deg, #ff1a88, #7c3aed)',
          border: isJarvis ? '1px solid rgba(255,26,136,0.15)' : 'none',
          color: '#f0f0ff',
        }}>
          {msg.imageUrl && (
            <img src={msg.imageUrl} alt="uploaded" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8 }} />
          )}
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            {isNew && isJarvis ? <TypewriterText text={msg.content} /> : msg.content}
          </div>
          {msg.tools && msg.tools.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {msg.tools.map(t => (
                <motion.a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer"
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: 'rgba(255,26,136,0.15)', border: '1px solid rgba(255,26,136,0.3)',
                    color: '#ff1a88', textDecoration: 'none',
                  }}>
                  🔗 {t.name}
                </motion.a>
              ))}
            </div>
          )}
        </div>

        {/* लोगो और टाइम (बहुत हल्का और नीचे) */}
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, 
          justifyContent: isJarvis ? 'flex-start' : 'flex-end',
          padding: '0 2px'
        }}>
          {isJarvis && <ModelLogo model={msg.model} />}
          <div style={{ fontSize: 9, color: '#6b6b8a', letterSpacing: 0.5 }}>
            {isJarvis && msg.model ? `${msg.model.split('-')[0].toUpperCase()} • ` : ''}
            {new Date(msg.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
      {!isJarvis && (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
          👤
        </div>
      )}
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#ff1a88,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
      <div style={{ padding: '12px 16px', background: 'rgba(255,26,136,0.08)', borderRadius: '4px 16px 16px 16px', border: '1px solid rgba(255,26,136,0.15)', display: 'flex', gap: 4 }}>
        {[0,1,2].map(i => (
          <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff1a88' }}
            animate={{ y: [0, -5, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
        ))}
      </div>
    </div>
  )
}

// ━━━ SIDEBAR ━━━
function Sidebar({ activeChat, onNewChat, onSelectChat, onDeleteChat, isMobile, onClose }: {
  activeChat: Chat | null
  onNewChat: () => void
  onSelectChat: (c: Chat) => void
  onDeleteChat: (id: string) => void
  isMobile: boolean
  onClose: () => void
}) {
  const [chats] = useState(() => getChats().sort((a, b) => b.updatedAt - a.updatedAt))
  const [search, setSearch] = useState('')
  const relationship = getRelationship()
  const streak = updateStreak()

  const LEVEL_NAMES = ['', 'Stranger', 'Acquaintance', 'Friend', 'Best Friend', 'JARVIS MODE']
  const filtered = chats.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{
      width: 260, height: '100%',
      background: 'rgba(8,8,20,0.98)',
      borderRight: '1px solid rgba(255,26,136,0.12)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,26,136,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#ff1a88,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 0 16px rgba(255,26,136,0.4)' }}>🤖</div>
            <div>
              <div style={{ fontFamily: 'Courier New', fontSize: 16, color: '#ff1a88', fontWeight: 700, letterSpacing: 2 }}>JARVIS</div>
              <div style={{ fontSize: 10, color: '#6b6b8a' }}>v7.0 · ₹0 Forever</div>
            </div>
          </div>
          {isMobile && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b6b8a', cursor: 'pointer', padding: 4 }}>
              <X size={18} />
            </button>
          )}
        </div>
        <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(255,26,136,0.06)', borderRadius: 10, border: '1px solid rgba(255,26,136,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#ff1a88', fontWeight: 600 }}>Lv.{relationship.level} {LEVEL_NAMES[relationship.level]}</span>
            <span style={{ fontSize: 11, color: '#6b6b8a' }}>{streak.currentStreak > 0 ? `🔥 ${streak.currentStreak}d` : `⚡ ${relationship.xp} XP`}</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <motion.div animate={{ width: `${getLevelProgress(relationship)}%` }} transition={{ type: 'spring', stiffness: 60 }} style={{ height: '100%', background: 'linear-gradient(90deg,#ff1a88,#7c3aed)', borderRadius: 4 }} />
          </div>
        </div>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { onNewChat(); if (isMobile) onClose() }} style={{ width: '100%', padding: '10px 14px', background: 'linear-gradient(135deg, rgba(255,26,136,0.15), rgba(124,58,237,0.1))', border: '1px solid rgba(255,26,136,0.3)', borderRadius: 10, color: '#ff1a88', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
          <Plus size={16} /> New Chat
        </motion.button>
      </div>
      <div style={{ padding: '0 12px 8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b6b8a' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats..." style={{ width: '100%', padding: '7px 10px 7px 28px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f0f0ff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        <div style={{ fontSize: 10, color: '#6b6b8a', padding: '4px 8px 6px', letterSpacing: 1, fontWeight: 600 }}>RECENTS</div>
        {filtered.map(c => (
          <div key={c.id} onClick={() => { onSelectChat(c); if (isMobile) onClose() }} style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: activeChat?.id === c.id ? 'rgba(255,26,136,0.1)' : 'transparent', border: activeChat?.id === c.id ? '1px solid rgba(255,26,136,0.2)' : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, color: activeChat?.id === c.id ? '#ff1a88' : '#f0f0ff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || 'New Chat'}</div>
              <div style={{ fontSize: 10, color: '#6b6b8a', marginTop: 2 }}>{c.messages.length} messages</div>
            </div>
            <button onClick={e => { e.stopPropagation(); onDeleteChat(c.id) }} style={{ background: 'none', border: 'none', color: '#6b6b8a', cursor: 'pointer', padding: 2, opacity: 0.5, flexShrink: 0 }}><X size={12} /></button>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,26,136,0.08)' }}>
        <a href="/jarvis-knows" target="_blank" style={{ display: 'block', padding: '8px 10px', borderRadius: 8, color: '#6b6b8a', fontSize: 12, textDecoration: 'none' }}>👁️ What JARVIS Knows</a>
        <button onClick={exportAllData} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, background: 'none', border: 'none', color: '#6b6b8a', fontSize: 12, cursor: 'pointer' }}>💾 Export Backup</button>
      </div>
    </div>
  )
}

// ━━━ TOOLS PANEL ━━━
function ToolsPanel({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const cats = ['all', 'image', 'video', 'audio', 'code', 'writing', 'productivity']
  const filtered = TOOLS.filter(t => (category === 'all' || t.category === category) && (search === '' || t.name.toLowerCase().includes(search.toLowerCase())))

  return (
    <div style={{ width: 320, height: '100%', background: 'rgba(8,8,20,0.98)', borderLeft: '1px solid rgba(255,26,136,0.12)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,26,136,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'Courier New', fontSize: 15, color: '#ff1a88', fontWeight: 700 }}>🛠️ Tools</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b6b8a', cursor: 'pointer' }}><X size={18} /></button>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools..." style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {filtered.map(tool => <ToolCard key={tool.id} tool={tool} />)}
      </div>
    </div>
  )
}

// ━━━ MAIN INTERFACE ━━━
export default function ChatInterface() {
  const [chat, setChat] = useState<Chat>(() => getActiveChat() || newChat())
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [relationship, setRelationship] = useState<Relationship>(getRelationship())
  const [preferences] = useState(getPreferences())
  const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set())
  const [showSidebar, setShowSidebar] = useState(true)
  const [showTools, setShowTools] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCmdPalette, setShowCmdPalette] = useState(false)
  const [proactiveSuggestion, setProactiveSuggestion] = useState<string | null>(null)
  const [newBadges, setNewBadges] = useState<Badge[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const checkMobile = () => { setIsMobile(window.innerWidth < 768); if(window.innerWidth < 768) setShowSidebar(false) }
    checkMobile(); window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat.messages, isThinking])

  const haptic = (type: 'light' | 'medium' = 'light') => {
    if (preferences.hapticEnabled) try { navigator.vibrate?.(type === 'light' ? 10 : 30) } catch {}
  }

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText || input).trim()
    if (!text || isThinking) return
    stopSpeaking(); setInput(''); haptic(); setIsThinking(true)
    
    const userMsg: Message = { id: `msg_${Date.now()}`, role: 'user', content: text, timestamp: Date.now() }
    const updatedChat = { ...chat, messages: [...chat.messages, userMsg], updatedAt: Date.now() }
    setChat(updatedChat); saveChat(updatedChat)

    try {
      const res = await fetch('/api/intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, context: updatedChat.messages.slice(-5) }),
      })
      const data = await res.json()
      // यहाँ 'gemini' या 'grok' रिस्पॉन्स से आ सकता है
      const jarvisMsg: Message = { 
        id: `msg_${Date.now() + 1}`, role: 'jarvis', 
        content: data.response, timestamp: Date.now(), 
        model: data.model || 'gemini-flash' 
      }
      const finalChat = { ...updatedChat, messages: [...updatedChat.messages, jarvisMsg], updatedAt: Date.now() }
      setChat(finalChat); saveChat(finalChat); setNewMsgIds(new Set([jarvisMsg.id]))
      incrementInteraction()
    } catch {
      // Error handling
    } finally { setIsThinking(false) }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#05050f', color: '#fff', overflow: 'hidden' }}>
      <SmartStorageAlert />
      <BadgeToast newBadges={newBadges} onDismiss={() => setNewBadges([])} />

      {(!isMobile || mobileSidebarOpen) && (
        <Sidebar activeChat={chat} onNewChat={() => setChat(newChat())} onSelectChat={setChat} onDeleteChat={deleteChat} isMobile={isMobile} onClose={() => setMobileSidebarOpen(false)} />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,26,136,0.08)', display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(20px)' }}>
          {isMobile && <button onClick={() => setMobileSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#6b6b8a' }}><Menu size={20} /></button>}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{chat.title || 'New Chat'}</div>
            <div style={{ fontSize: 10, color: '#6b6b8a' }}>{isThinking ? '⚡ Thinking...' : 'Online'}</div>
          </div>
          <button onClick={() => setShowTools(!showTools)} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', color: '#6b6b8a', fontSize: 12 }}>🛠️ Tools</button>
          <button onClick={() => setShowSettings(true)} style={{ padding: '6px', color: '#6b6b8a' }}><Settings size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {chat.messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 100 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🤖</div>
              <h2 style={{ fontFamily: 'Courier New', color: '#ff1a88', letterSpacing: 2 }}>JARVIS</h2>
              <p style={{ color: '#6b6b8a', fontSize: 13 }}>{getGreeting(relationship.level, getProfile(), 0)}</p>
            </div>
          )}
          {chat.messages.map(msg => (
            <ChatBubble key={msg.id} msg={msg} isNew={newMsgIds.has(msg.id)} ttsEnabled={preferences.ttsEnabled} />
          ))}
          {isThinking && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,26,136,0.08)' }}>
          <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,26,136,0.2)', borderRadius: 14, padding: '8px 12px' }}>
            <button onClick={() => setIsListening(true)} style={{ color: isListening ? '#ff1a88' : '#6b6b8a' }}><Mic size={18} /></button>
            <textarea
              ref={textareaRef} value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
              onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Message JARVIS..." rows={1}
              style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none', resize: 'none', fontSize: 14 }}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim()} style={{ color: input.trim() ? '#ff1a88' : '#6b6b8a' }}><Send size={18} /></button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTools && (
          <motion.div initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }}>
            <ToolsPanel onClose={() => setShowTools(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <SmartSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
