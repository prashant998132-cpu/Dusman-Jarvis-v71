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
        marginBottom: 12,
        gap: 10,
        alignItems: 'flex-end',
      }}
    >
      {isJarvis && (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#ff1a88,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
          🤖
        </div>
      )}
      <div style={{
        maxWidth: '75%',
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
        {msg.confidence !== undefined && isJarvis && (
          <div style={{ fontSize: 10, color: '#6b6b8a', marginBottom: 4 }}>
            {msg.model} · {Math.round((msg.confidence || 0) * 100)}%
          </div>
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
        <div style={{ fontSize: 10, color: isJarvis ? '#6b6b8a' : 'rgba(255,255,255,0.6)', marginTop: 4, textAlign: isJarvis ? 'left' : 'right' }}>
          {new Date(msg.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}
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
      {/* Logo */}
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

        {/* Level + XP */}
        <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(255,26,136,0.06)', borderRadius: 10, border: '1px solid rgba(255,26,136,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#ff1a88', fontWeight: 600 }}>
              Lv.{relationship.level} {LEVEL_NAMES[relationship.level]}
            </span>
            <span style={{ fontSize: 11, color: '#6b6b8a' }}>
              {streak.currentStreak > 0 ? `🔥 ${streak.currentStreak}d` : `⚡ ${relationship.xp} XP`}
            </span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${getLevelProgress(relationship)}%` }}
              transition={{ type: 'spring', stiffness: 60 }}
              style={{ height: '100%', background: 'linear-gradient(90deg,#ff1a88,#7c3aed)', borderRadius: 4 }}
            />
          </div>
        </div>
      </div>

      {/* New Chat button */}
      <div style={{ padding: '10px 12px' }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { onNewChat(); if (isMobile) onClose() }}
          style={{
            width: '100%', padding: '10px 14px',
            background: 'linear-gradient(135deg, rgba(255,26,136,0.15), rgba(124,58,237,0.1))',
            border: '1px solid rgba(255,26,136,0.3)',
            borderRadius: 10, color: '#ff1a88', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
          }}
        >
          <Plus size={16} /> New Chat
        </motion.button>
      </div>

      {/* Search */}
      <div style={{ padding: '0 12px 8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b6b8a' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chats..."
            style={{
              width: '100%', padding: '7px 10px 7px 28px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, color: '#f0f0ff', fontSize: 12, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Chat list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        <div style={{ fontSize: 10, color: '#6b6b8a', padding: '4px 8px 6px', letterSpacing: 1, fontWeight: 600 }}>RECENTS</div>
        {filtered.length === 0 && (
          <div style={{ fontSize: 12, color: '#6b6b8a', padding: '12px 8px', textAlign: 'center' }}>Koi chat nahi</div>
        )}
        {filtered.map(c => (
          <div
            key={c.id}
            onClick={() => { onSelectChat(c); if (isMobile) onClose() }}
            style={{
              padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
              background: activeChat?.id === c.id ? 'rgba(255,26,136,0.1)' : 'transparent',
              border: activeChat?.id === c.id ? '1px solid rgba(255,26,136,0.2)' : '1px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
            }}
            onMouseEnter={e => { if (activeChat?.id !== c.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={e => { if (activeChat?.id !== c.id) e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, color: activeChat?.id === c.id ? '#ff1a88' : '#f0f0ff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.title || 'New Chat'}
              </div>
              <div style={{ fontSize: 10, color: '#6b6b8a', marginTop: 2 }}>
                {c.messages.length} messages
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onDeleteChat(c.id) }}
              style={{ background: 'none', border: 'none', color: '#6b6b8a', cursor: 'pointer', padding: 2, opacity: 0.5, flexShrink: 0 }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Bottom links */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,26,136,0.08)' }}>
        <a href="/jarvis-knows" target="_blank" style={{ display: 'block', padding: '8px 10px', borderRadius: 8, color: '#6b6b8a', fontSize: 12, textDecoration: 'none', marginBottom: 2 }}
          onMouseEnter={e => e.currentTarget.style.color = '#ff1a88'}
          onMouseLeave={e => e.currentTarget.style.color = '#6b6b8a'}>
          👁️ What JARVIS Knows
        </a>
        <button onClick={exportAllData}
          style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, background: 'none', border: 'none', color: '#6b6b8a', fontSize: 12, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ff1a88'}
          onMouseLeave={e => e.currentTarget.style.color = '#6b6b8a'}>
          💾 Export Backup
        </button>
      </div>
    </div>
  )
}

// ━━━ TOOLS PANEL ━━━
function ToolsPanel({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const cats = ['all', 'image', 'video', 'audio', 'image-edit', 'upscale', 'visual', 'code', 'design', 'writing', 'tts', 'chat', 'productivity', 'learning']
  const filtered = TOOLS.filter(t =>
    (category === 'all' || t.category === category) &&
    (search === '' || t.name.toLowerCase().includes(search.toLowerCase()) || t.tag.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{
      width: 320, height: '100%',
      background: 'rgba(8,8,20,0.98)',
      borderLeft: '1px solid rgba(255,26,136,0.12)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid rgba(255,26,136,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'Courier New', fontSize: 15, color: '#ff1a88', fontWeight: 700 }}>🛠️ {filtered.length} Tools</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b6b8a', cursor: 'pointer' }}><X size={18} /></button>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 12px 6px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b6b8a' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools..."
            style={{ width: '100%', padding: '7px 10px 7px 28px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f0f0ff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ padding: '0 12px 8px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            style={{
              padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600,
              background: category === c ? 'linear-gradient(135deg,#ff1a88,#7c3aed)' : 'rgba(255,255,255,0.06)',
              color: category === c ? 'white' : '#6b6b8a',
            }}>
            {c === 'all' ? '⭐ All' : c}
          </button>
        ))}
      </div>

      {/* Tools grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {filtered.map(tool => <ToolCard key={tool.id} tool={tool} />)}
      </div>
    </div>
  )
}

// ━━━ MAIN ━━━
export default function ChatInterface() {
  const [chat, setChat] = useState<Chat>(() => getActiveChat() || newChat())
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [relationship, setRelationship] = useState<Relationship>(getRelationship())
  const [justLeveledUp, setJustLeveledUp] = useState(false)
  const [preferences] = useState(getPreferences())
  const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set())
  const [showSidebar, setShowSidebar] = useState(true)
  const [showTools, setShowTools] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCmdPalette, setShowCmdPalette] = useState(false)
  const [proactiveSuggestion, setProactiveSuggestion] = useState<string | null>(null)
  const [newBadges, setNewBadges] = useState<Badge[]>([])
  const [ambientPrimary, setAmbientPrimary] = useState('#ff1a88')
  const [batteryLevel, setBatteryLevel] = useState<number | undefined>()
  const [weatherData, setWeatherData] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [allChats, setAllChats] = useState(() => getChats())
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setShowSidebar(false)
      else setShowSidebar(true)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    const s = updateStreak()
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bat: any) => {
        setBatteryLevel(bat.level)
        bat.addEventListener('levelchange', () => setBatteryLevel(bat.level))
      })
    }
    const suggestion = getProactiveSuggestion(getProfile(), s)
    if (suggestion) setTimeout(() => setProactiveSuggestion(suggestion), 2000)
    if (getPreferences().autoTheme) {
      document.documentElement.setAttribute('data-theme', getAutoTheme())
    }

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, isThinking])

  const haptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!preferences.hapticEnabled) return
    try { navigator.vibrate?.({ light: [10], medium: [30], heavy: [50, 30, 50] }[type]) } catch { }
  }, [preferences.hapticEnabled])

  const startVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setInput('Voice support nahi hai'); return }
    if (recognitionRef.current) { recognitionRef.current.stop(); return }
    const recognition = new SR()
    recognition.lang = 'hi-IN'; recognition.continuous = false; recognition.interimResults = false
    recognitionRef.current = recognition
    setIsListening(true)
    trackBehavior('voice')
    haptic('medium')
    recognition.onresult = (e: any) => { setInput(e.results[0][0].transcript); recognition.stop() }
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null }
    recognition.onerror = () => { setIsListening(false); recognitionRef.current = null }
    recognition.start()
  }, [haptic])

  const handleImageUpload = useCallback(async (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1]
      const imageUrl = e.target?.result as string
      const userMsg: Message = { id: `msg_${Date.now()}`, role: 'user', content: '📸 Photo bheja — yeh kya hai?', timestamp: Date.now(), imageUrl }
      const updated = { ...chat, messages: [...chat.messages, userMsg], updatedAt: Date.now() }
      setChat(updated); saveChat(updated); setIsThinking(true)
      try {
        const res = await fetch('/api/vision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64, mimeType: file.type }) })
        const data = await res.json()
        const jarvisMsg: Message = { id: `msg_${Date.now() + 1}`, role: 'jarvis', content: data.result || 'Image analyze nahi hua Sir.', timestamp: Date.now(), model: 'gemini-vision' }
        const final = { ...updated, messages: [...updated.messages, jarvisMsg], updatedAt: Date.now() }
        setChat(final); saveChat(final); setNewMsgIds(new Set([jarvisMsg.id]))
      } catch { }
      setIsThinking(false)
    }
    reader.readAsDataURL(file)
  }, [chat])

  const fetchWeather = useCallback(async () => {
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const res = await fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
          const data = await res.json()
          if (!data.error) setWeatherData(data)
        }, async () => {
          const res = await fetch('/api/weather?city=Delhi')
          const data = await res.json()
          if (!data.error) setWeatherData(data)
        })
      }
    } catch { }
  }, [])

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText || input).trim()
    if (!text || isThinking) return
    stopSpeaking(); setInput(''); haptic('light')
    extractProfileInfo(text)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const mode = detectMode(text)
    const userMsg: Message = { id: `msg_${Date.now()}`, role: 'user', content: text, timestamp: Date.now(), mode }
    const updatedChat: Chat = {
      ...chat, messages: [...chat.messages, userMsg],
      title: chat.messages.length === 0 ? text.slice(0, 40) : chat.title,
      updatedAt: Date.now(),
    }
    setChat(updatedChat); saveChat(updatedChat); setProactiveSuggestion(null); setIsThinking(true)

    try {
      const emotion = await detectEmotionSmart(text)
      const ambient = getAmbientConfig(emotion, batteryLevel)
      setAmbientPrimary(ambient.colors.primary)

      if (mode === 'weather') {
        await fetchWeather()
        const jarvisMsg: Message = { id: `msg_${Date.now() + 1}`, role: 'jarvis', content: weatherData ? `🌤️ ${weatherData.city}: ${weatherData.temp}°C, ${weatherData.description}` : 'Weather data aa raha hai...', timestamp: Date.now(), emotion }
        const final = { ...updatedChat, messages: [...updatedChat.messages, jarvisMsg], updatedAt: Date.now() }
        setChat(final); saveChat(final); setNewMsgIds(new Set([jarvisMsg.id])); setIsThinking(false); return
      }

      if (mode === 'search') {
        const q = text.replace(/search|dhundho|find/gi, '').trim()
        const res = await fetch(`/api/search?q=${encodeURIComponent(q || text)}`)
        const data = await res.json()
        let result = ''
        if (data.answer) result += `⚡ ${data.answer}\n\n`
        if (data.abstract) result += `📖 ${data.abstract}\n\n`
        if (data.relatedTopics?.length) result += '🔗 Related:\n' + data.relatedTopics.slice(0, 3).map((t: any) => `• ${t.text}`).join('\n')
        const jarvisMsg: Message = { id: `msg_${Date.now() + 1}`, role: 'jarvis', content: `🔍 Search Results:\n\n${result || 'Koi result nahi mila.'}`, timestamp: Date.now(), emotion }
        const final = { ...updatedChat, messages: [...updatedChat.messages, jarvisMsg], updatedAt: Date.now() }
        setChat(final); saveChat(final); setNewMsgIds(new Set([jarvisMsg.id])); setIsThinking(false); return
      }

      const res = await fetch('/api/intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, context: updatedChat.messages.slice(-8).map(m => ({ role: m.role, content: m.content })), level: relationship.level, personality: preferences.personalityMode }),
      })

      let jarvisContent = '', toolsFound: Message['tools'] = [], confidence = 0.8, modelUsed = 'keyword'

      if (res.ok) {
        const data = await res.json()
        if (data.useKeywordFallback) {
          const fb = keywordFallback(text)
          jarvisContent = fb ? fb.response + ' ' + getTonyStarkResponse(emotion, updateStreak().currentStreak) : getTonyStarkResponse(emotion, updateStreak().currentStreak) + '\n\nSir, AI models se connect nahi ho paya. Internet check karo.'
          if (fb) toolsFound = TOOLS.filter(t => fb.tools.some(n => t.name.toLowerCase().includes(n.toLowerCase()))).slice(0, 4).map(t => ({ id: t.id, name: t.name, url: t.url }))
        } else {
          jarvisContent = (data.response as string) || getTonyStarkResponse(emotion, 0)
          confidence = (data.confidence as number) || 0.8
          modelUsed = (data.model as string) || 'gemini'
          if (data.tonyStarkComment && Math.random() > 0.6) jarvisContent += `\n\n*${data.tonyStarkComment}*`
          if (data.tools && Array.isArray(data.tools)) {
            toolsFound = TOOLS.filter(t => (data.tools as string[]).some((n: string) => t.name.toLowerCase().includes(n.toLowerCase()))).slice(0, 4).map(t => ({ id: t.id, name: t.name, url: t.url }))
          }
        }
      } else {
        const fb = keywordFallback(text)
        jarvisContent = fb ? fb.response : getTonyStarkResponse(emotion, 0)
      }

      const jarvisMsg: Message = { id: `msg_${Date.now() + 1}`, role: 'jarvis', content: jarvisContent, timestamp: Date.now(), confidence, emotion, model: modelUsed, tools: toolsFound.length > 0 ? toolsFound : undefined }
      const finalChat: Chat = { ...updatedChat, messages: [...updatedChat.messages, jarvisMsg], updatedAt: Date.now() }
      setChat(finalChat); saveChat(finalChat); setNewMsgIds(new Set([jarvisMsg.id]))
      setAllChats(getChats())

      const { relationship: newRel, justLeveledUp: leveled } = incrementInteraction()
      setRelationship(newRel)
      if (leveled) { setJustLeveledUp(true); haptic('heavy'); setTimeout(() => setJustLeveledUp(false), 3000) }
      const earned = checkAndAwardBadges(newRel)
      if (earned.length > 0) { setNewBadges(earned); haptic('heavy') }
    } catch {
      const errMsg: Message = { id: `msg_${Date.now() + 1}`, role: 'jarvis', content: 'Sir, kuch gadbad ho gayi. Internet check karo. 🔄', timestamp: Date.now() }
      const final: Chat = { ...updatedChat, messages: [...updatedChat.messages, errMsg], updatedAt: Date.now() }
      setChat(final); saveChat(final)
    } finally {
      setIsThinking(false)
    }
  }, [input, isThinking, chat, relationship, preferences, batteryLevel, haptic, fetchWeather, weatherData])

  const handleCommand = useCallback((action: string) => {
    if (action.startsWith('filter:')) { setShowTools(true) }
    else if (action === 'clear') { const c = newChat(); setChat(c); setAllChats(getChats()) }
    else if (action === 'export') exportAllData()
    else if (action === 'export-pdf') { /* pdf export */ }
    else if (action === 'privacy') window.open('/jarvis-knows', '_blank')
    else if (action === 'weather') fetchWeather()
    else if (action === 'vision') fileInputRef.current?.click()
    else if (action === 'settings') setShowSettings(true)
    else if (action === 'level') sendMessage(`Main Level ${relationship.level} pe hoon. Kya khaas hai?`)
    else if (action === 'streak') sendMessage(`Meri ${updateStreak().currentStreak} din ki streak hai.`)
  }, [fetchWeather, sendMessage, relationship])

  const handleDeleteChat = (id: string) => {
    deleteChat(id)
    setAllChats(getChats())
    if (chat.id === id) { const c = newChat(); setChat(c) }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#05050f', overflow: 'hidden', position: 'relative' }}>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = '' }} />
      <SmartStorageAlert />
      <BadgeToast newBadges={newBadges} onDismiss={() => setNewBadges([])} />

      {/* SIDEBAR — Desktop always visible, Mobile as overlay */}
      {(!isMobile || mobileSidebarOpen) && (
        <>
          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }}
            />
          )}
          <div style={{ position: isMobile ? 'fixed' : 'relative', left: 0, top: 0, bottom: 0, zIndex: isMobile ? 201 : 1 }}>
            <Sidebar
              activeChat={chat}
              onNewChat={() => { const c = newChat(); setChat(c); setAllChats(getChats()) }}
              onSelectChat={(c) => { setChat(c); lsSet('jarvis_active_chat', c.id) }}
              onDeleteChat={handleDeleteChat}
              isMobile={isMobile}
              onClose={() => setMobileSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {/* MAIN CHAT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top Bar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,26,136,0.08)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: 'rgba(5,5,15,0.8)', backdropFilter: 'blur(20px)' }}>
          {isMobile && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMobileSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: '#6b6b8a', cursor: 'pointer', padding: 4 }}>
              <Menu size={20} />
            </motion.button>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Courier New', fontSize: 13, color: '#f0f0ff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {chat.title || 'New Chat'}
            </div>
            <div style={{ fontSize: 10, color: '#6b6b8a' }}>
              {isThinking ? '⚡ Thinking...' : isListening ? '🎤 Listening...' : `${chat.messages.length} messages`}
            </div>
          </div>

          {/* Top action buttons */}
          <div style={{ display: 'flex', gap: 4 }}>
            {weatherData && (
              <div style={{ padding: '4px 10px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12, color: '#00d4ff', display: 'flex', alignItems: 'center', gap: 4 }}>
                🌤️ {weatherData.temp}°C
                <button onClick={() => setWeatherData(null)} style={{ background: 'none', border: 'none', color: '#6b6b8a', cursor: 'pointer', padding: 0, marginLeft: 4, fontSize: 10 }}>✕</button>
              </div>
            )}
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => fetchWeather()}
              style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#6b6b8a', cursor: 'pointer', fontSize: 12 }}>
              🌤️
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => fileInputRef.current?.click()}
              style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#6b6b8a', cursor: 'pointer', fontSize: 12 }}>
              <Camera size={14} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowTools(!showTools)}
              style={{ padding: '6px 10px', background: showTools ? 'rgba(255,26,136,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showTools ? 'rgba(255,26,136,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, color: showTools ? '#ff1a88' : '#6b6b8a', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Wrench size={13} /> {!isMobile && 'Tools'}
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowSettings(true)}
              style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#6b6b8a', cursor: 'pointer' }}>
              <Settings size={14} />
            </motion.button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* Proactive suggestion */}
          <AnimatePresence>
            {proactiveSuggestion && (
              <motion.div key="proactive" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                onClick={() => sendMessage(proactiveSuggestion)}
                style={{ margin: '0 0 16px', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,26,136,0.06)', border: '1px solid rgba(255,26,136,0.15)', fontSize: 13, color: '#6b6b8a' }}>
                💡 {proactiveSuggestion}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {chat.messages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🤖</div>
              <h2 style={{ fontFamily: 'Courier New', fontSize: 22, color: '#ff1a88', letterSpacing: 2, marginBottom: 8 }}>JARVIS</h2>
              <p style={{ color: '#6b6b8a', fontSize: 14, marginBottom: 24 }}>
                {getGreeting(relationship.level, getProfile(), updateStreak().currentStreak)}
              </p>
              {/* Quick action chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {[
                  { label: '🎨 Image banana hai', msg: 'ek free AI image generator suggest karo' },
                  { label: '🎵 Music chahiye', msg: 'free music generator suggest karo' },
                  { label: '💻 Code help', msg: 'online free coding tool suggest karo' },
                  { label: '🌤️ Mausam', msg: 'aaj ka mausam kaisa hai?' },
                ].map(chip => (
                  <motion.button key={chip.label} whileTap={{ scale: 0.95 }} onClick={() => sendMessage(chip.msg)}
                    style={{ padding: '8px 14px', borderRadius: 20, background: 'rgba(255,26,136,0.08)', border: '1px solid rgba(255,26,136,0.2)', color: '#f0f0ff', cursor: 'pointer', fontSize: 13 }}>
                    {chip.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {chat.messages.map(msg => (
            <ChatBubble key={msg.id} msg={msg} isNew={newMsgIds.has(msg.id)} ttsEnabled={preferences.ttsEnabled} />
          ))}
          {isThinking && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '12px 16px', flexShrink: 0, borderTop: '1px solid rgba(255,26,136,0.08)', background: 'rgba(5,5,15,0.8)', backdropFilter: 'blur(20px)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,26,136,0.2)', borderRadius: 14, padding: '8px 12px' }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={startVoice}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: isListening ? '#ff1a88' : '#6b6b8a', padding: '4px', flexShrink: 0 }}>
              {isListening ? <SoundWave isActive bars={12} height={20} /> : <Mic size={18} />}
            </motion.button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                if (e.key === '/' && !input) setShowCmdPalette(true)
              }}
              placeholder="Message JARVIS... (/ for commands)"
              rows={1}
              style={{
                flex: 1, resize: 'none', background: 'none', border: 'none',
                color: '#f0f0ff', fontSize: 14, outline: 'none', lineHeight: 1.5,
                maxHeight: 120, overflowY: 'auto',
              }}
            />
            <motion.button
              whileTap={{ scale: 0.9 }} onClick={() => sendMessage()}
              disabled={!input.trim() || isThinking}
              style={{
                padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: input.trim() && !isThinking ? 'linear-gradient(135deg, #ff1a88, #7c3aed)' : 'rgba(255,255,255,0.06)',
                color: 'white', opacity: input.trim() && !isThinking ? 1 : 0.4,
                display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontSize: 13, fontWeight: 600,
              }}>
              <Send size={15} />
            </motion.button>
          </div>
          <div style={{ textAlign: 'center', fontSize: 10, color: '#6b6b8a', marginTop: 6 }}>
            / for commands · Shift+Enter for new line · 145+ free tools
          </div>
        </div>
      </div>

      {/* TOOLS PANEL — right side */}
      <AnimatePresence>
        {showTools && (
          <motion.div
            initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            style={{ position: isMobile ? 'fixed' : 'relative', right: 0, top: 0, bottom: 0, zIndex: isMobile ? 200 : 1 }}
          >
            <ToolsPanel onClose={() => setShowTools(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <CommandPalette isOpen={showCmdPalette} onClose={() => setShowCmdPalette(false)} onAction={handleCommand} />
      <SmartSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
