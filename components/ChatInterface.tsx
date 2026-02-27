'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwipeable } from 'react-swipeable'
import { Send, Mic, Camera, Cloud } from 'lucide-react'
import JarvisAvatar from '@/components/JarvisAvatar'
import RelationshipBar from '@/components/RelationshipBar'
import SoundWave from '@/components/SoundWave'
import ToolCard from '@/components/ToolCard'
import TypewriterText from '@/components/TypewriterText'
import LiveStats from '@/components/LiveStats'
import CommandPalette from '@/components/CommandPalette'
import SmartStorageAlert from '@/components/SmartStorageAlert'
import SmartSettings from '@/components/SmartSettings'
import SmartHistory from '@/components/SmartHistory'
import { BadgeToast } from '@/components/SmartGamification'
import { TOOLS } from '@/lib/links'
import {
  lsSet, getActiveChat, newChat, saveChat,
  getRelationship, incrementInteraction, updateStreak, getLevelProgress,
  getPreferences, extractProfileInfo,
  getProfile, trackBehavior, checkAndAwardBadges,
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
    if (isNew && isJarvis && ttsEnabled) {
      speakUtil(msg.content)
    }
  }, [isNew, isJarvis, ttsEnabled, msg.content])

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 16, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        display: 'flex', justifyContent: isJarvis ? 'flex-start' : 'flex-end',
        marginBottom: 8, padding: '0 12px',
      }}
    >
      <div style={{
        maxWidth: '85%', padding: '10px 14px',
        borderRadius: isJarvis ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
        background: isJarvis
          ? 'linear-gradient(135deg, rgba(255,26,136,0.12), rgba(124,58,237,0.08))'
          : 'linear-gradient(135deg, rgba(255,26,136,0.25), rgba(124,58,237,0.2))',
        border: `1px solid ${isJarvis ? 'rgba(255,26,136,0.2)' : 'rgba(255,26,136,0.35)'}`,
        backdropFilter: 'blur(20px)',
      }}>
        {msg.confidence !== undefined && isJarvis && (
          <div style={{ fontSize: 10, color: '#6b6b8a', marginBottom: 4 }}>
            {msg.model ? `via ${msg.model}` : ''} · {Math.round((msg.confidence || 0) * 100)}% sure
            {msg.emotion && ` · ${msg.emotion}`}
          </div>
        )}
        {msg.imageUrl && (
          <img src={msg.imageUrl} alt="uploaded" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8 }} />
        )}
        <div style={{ fontSize: 14, color: '#f0f0ff', lineHeight: 1.5 }}>
          {isNew && isJarvis ? <TypewriterText text={msg.content} /> : msg.content}
        </div>
        {msg.tools && msg.tools.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {msg.tools.map(t => (
              <motion.a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer"
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: 'linear-gradient(135deg, rgba(255,26,136,0.2), rgba(124,58,237,0.15))',
                  border: '1px solid rgba(255,26,136,0.3)', color: '#ff1a88',
                  textDecoration: 'none',
                }}>
                🔗 {t.name}
              </motion.a>
            ))}
          </div>
        )}
        <div style={{ fontSize: 10, color: '#6b6b8a', marginTop: 4, textAlign: isJarvis ? 'left' : 'right' }}>
          {new Date(msg.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ padding: '0 12px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: 'rgba(255,26,136,0.1)', borderRadius: '4px 18px 18px 18px', border: '1px solid rgba(255,26,136,0.2)' }}>
        {[0, 1, 2].map(i => (
          <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff1a88' }}
            animate={{ y: [0, -6, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
        ))}
      </div>
    </div>
  )
}

// ━━━ TOOLS PANEL ━━━
function ToolsPanel({ show, onClose, category, onCategoryChange }: {
  show: boolean; onClose: () => void; category: string; onCategoryChange: (c: string) => void
}) {
  const cats = ['all', 'image', 'image-edit', 'upscale', 'visual', 'video', 'audio', 'tts', 'code', 'design', 'writing', 'chat', 'productivity', 'learning']
  const filtered = category === 'all' ? TOOLS : TOOLS.filter(t => t.category === category)


  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 7000,
            background: 'rgba(5,5,15,0.97)', backdropFilter: 'blur(20px)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,26,136,0.1)' }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#6b6b8a', fontSize: 20, cursor: 'pointer', padding: 4 }}>←</motion.button>
            <h2 style={{ fontFamily: 'Courier New', color: '#ff1a88', fontSize: 16, letterSpacing: 1 }}>🛠️ {filtered.length} Tools</h2>
          </div>
          <div style={{ padding: '8px 12px', display: 'flex', gap: 8, overflowX: 'auto', borderBottom: '1px solid rgba(255,26,136,0.08)' }}>
            {cats.map(c => (
              <button key={c} onClick={() => onCategoryChange(c)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600,
                  background: category === c ? 'linear-gradient(135deg,#ff1a88,#7c3aed)' : 'rgba(255,255,255,0.06)',
                  color: category === c ? 'white' : '#6b6b8a',
                }}>
                {c === 'all' ? '🌟 All' : c}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {filtered.map(tool => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ━━━ MAIN COMPONENT ━━━
export default function ChatInterface() {
  const [chat, setChat] = useState<Chat>(() => getActiveChat() || newChat())
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [relationship, setRelationship] = useState<Relationship>(getRelationship())
  const [justLeveledUp, setJustLeveledUp] = useState(false)
  const [streak, setStreak] = useState(0)
  const [profile, setProfile] = useState(getProfile())
  const [preferences, setPreferencesState] = useState(getPreferences())
  const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set())
  const [showTools, setShowTools] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showCmdPalette, setShowCmdPalette] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'tools' | 'history' | 'settings'>('chat')
  const [toolCategory, setToolCategory] = useState('all')
  const [proactiveSuggestion, setProactiveSuggestion] = useState<string | null>(null)
  const [newBadges, setNewBadges] = useState<Badge[]>([])
  const [ambientPrimary, setAmbientPrimary] = useState('#ff1a88')
  const [batteryLevel, setBatteryLevel] = useState<number | undefined>(undefined)
  const [isSearching, setIsSearching] = useState(false)
  const [weatherData, setWeatherData] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  // ━━━ INIT ━━━
  useEffect(() => {
    const s = updateStreak()
    setStreak(s.currentStreak)

    // Battery API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bat: any) => {
        setBatteryLevel(bat.level)
        bat.addEventListener('levelchange', () => setBatteryLevel(bat.level))
      })
    }

    // Proactive suggestion
    const suggestion = getProactiveSuggestion(getProfile(), s)
    if (suggestion) setTimeout(() => setProactiveSuggestion(suggestion), 2000)

    // Auto-theme
    if (getPreferences().autoTheme) {
      const theme = getAutoTheme()
      document.documentElement.setAttribute('data-theme', theme)
    }

    // Notification permission
    if (getPreferences().notificationsEnabled && 'Notification' in window) {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, isThinking])

  // ━━━ SWIPE ━━━
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => { setShowTools(true); setActiveTab('tools') },
    onSwipedRight: () => { if (showTools) { setShowTools(false); setActiveTab('chat') } },
    trackMouse: false,
  })

  // ━━━ HAPTIC ━━━
  const haptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!preferences.hapticEnabled) return
    try {
      const patterns = { light: [10], medium: [30], heavy: [50, 30, 50] }
      navigator.vibrate?.(patterns[type])
    } catch { /* ignore */ }
  }, [preferences.hapticEnabled])

  // ━━━ VOICE ━━━
  const startVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setInput('Voice support nahi hai is browser mein'); return }
    if (recognitionRef.current) { recognitionRef.current.stop(); return }

    const recognition = new SR()
    recognition.lang = 'hi-IN'
    recognition.continuous = false
    recognition.interimResults = false
    recognitionRef.current = recognition
    setIsListening(true)
    trackBehavior('voice')
    haptic('medium')

    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript
      setInput(text)
      recognition.stop()
    }
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null }
    recognition.onerror = () => { setIsListening(false); recognitionRef.current = null }
    recognition.start()
  }, [haptic])

  // ━━━ VISION (Image Upload) ━━━
  const handleImageUpload = useCallback(async (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1]
      const mimeType = file.type
      const imageUrl = e.target?.result as string

      // Add user message with image
      const userMsg: Message = {
        id: `msg_${Date.now()}`, role: 'user',
        content: '📸 Photo bheja hai — yeh kya hai?',
        timestamp: Date.now(), imageUrl,
      }
      const updatedChat = { ...chat, messages: [...chat.messages, userMsg], updatedAt: Date.now() }
      setChat(updatedChat)
      saveChat(updatedChat)
      setIsThinking(true)
      haptic('medium')

      try {
        const res = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        })
        const data = await res.json()
        const jarvisMsg: Message = {
          id: `msg_${Date.now() + 1}`, role: 'jarvis',
          content: data.result || 'Sir, image analyze nahi ho paya.',
          timestamp: Date.now(), model: 'gemini-vision',
        }
        const final = { ...updatedChat, messages: [...updatedChat.messages, jarvisMsg], updatedAt: Date.now() }
        setChat(final)
        saveChat(final)
        setNewMsgIds(new Set([jarvisMsg.id]))
      } catch {
        const errMsg: Message = {
          id: `msg_${Date.now() + 1}`, role: 'jarvis',
          content: 'Sir, image nahi dekh paya. Internet check karo.',
          timestamp: Date.now(),
        }
        const final = { ...updatedChat, messages: [...updatedChat.messages, errMsg], updatedAt: Date.now() }
        setChat(final)
        saveChat(final)
      }
      setIsThinking(false)
    }
    reader.readAsDataURL(file)
  }, [chat, haptic])

  // ━━━ WEATHER ━━━
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
    } catch { /* ignore */ }
  }, [])

  // ━━━ WEB SEARCH ━━━
  const doWebSearch = useCallback(async (query: string): Promise<string> => {
    try {
      setIsSearching(true)
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (data.error) return 'Search fail hua Sir.'
      let result = ''
      if (data.answer) result += `⚡ ${data.answer}\n\n`
      if (data.abstract) result += `📖 ${data.abstract}\n\n`
      if (data.relatedTopics?.length) {
        result += '🔗 Related:\n' + data.relatedTopics.slice(0, 3).map((t: any) => `• ${t.text}`).join('\n')
      }
      return result || 'Sir, koi specific result nahi mila. Try karo aur specific query se.'
    } catch {
      return 'Search nahi ho paya Sir.'
    } finally {
      setIsSearching(false)
    }
  }, [])

  // ━━━ PDF EXPORT ━━━
  const exportChatPDF = useCallback(async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      doc.setFont('helvetica')
      doc.setFontSize(16)
      doc.text('JARVIS Chat Export', 20, 20)
      doc.setFontSize(10)
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30)
      doc.text(`Messages: ${chat.messages.length}`, 20, 38)

      let y = 50
      doc.setFontSize(11)
      for (const msg of chat.messages) {
        const prefix = msg.role === 'user' ? 'You: ' : 'JARVIS: '
        const lines = doc.splitTextToSize(prefix + msg.content, 170)
        if (y + lines.length * 7 > 280) { doc.addPage(); y = 20 }
        doc.setTextColor(msg.role === 'user' ? '#ff1a88' : '#7c3aed')
        doc.text(lines, 20, y)
        y += lines.length * 7 + 4
      }

      doc.save(`JARVIS-chat-${Date.now()}.pdf`)
    } catch {
      alert('PDF export fail hua. Try again!')
    }
  }, [chat.messages])

  // ━━━ SEND MESSAGE ━━━
  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText || input).trim()
    if (!text || isThinking) return

    stopSpeaking()
    setInput('')
    haptic('light')
    extractProfileInfo(text)

    // Detect mode early
    const mode = detectMode(text)

    // User message
    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      mode,
    }

    const updatedChat: Chat = {
      ...chat,
      messages: [...chat.messages, userMsg],
      title: chat.messages.length === 0 ? text.slice(0, 40) : chat.title,
      updatedAt: Date.now(),
    }
    setChat(updatedChat)
    saveChat(updatedChat)
    setProactiveSuggestion(null)
    setIsThinking(true)

    try {
      const emotion = await detectEmotionSmart(text)
      const ambient = getAmbientConfig(emotion, batteryLevel)
      setAmbientPrimary(ambient.colors.primary)

      // Handle special modes locally
      if (mode === 'weather') {
        await fetchWeather()
        const wd = weatherData
        const weatherReply = wd
          ? `🌤️ ${wd.city} mein aaj ${wd.temp}°C hai. ${wd.description}. Humidity: ${wd.humidity}%. Wind: ${wd.wind} km/h.`
          : 'Mausam info fetch kar raha hoon Sir... Weather widget mein dekhein!'
        const jarvisMsg: Message = {
          id: `msg_${Date.now() + 1}`, role: 'jarvis',
          content: weatherReply, timestamp: Date.now(), emotion,
        }
        const final = { ...updatedChat, messages: [...updatedChat.messages, jarvisMsg], updatedAt: Date.now() }
        setChat(final)
        saveChat(final)
        setNewMsgIds(new Set([jarvisMsg.id]))
        setIsThinking(false)
        return
      }

      if (mode === 'search') {
        const searchQuery = text.replace(/search|dhundho|find|kha|khabar|news/gi, '').trim()
        const searchResult = await doWebSearch(searchQuery || text)
        const jarvisMsg: Message = {
          id: `msg_${Date.now() + 1}`, role: 'jarvis',
          content: `🔍 Search Results:\n\n${searchResult}`, timestamp: Date.now(), emotion,
        }
        const final = { ...updatedChat, messages: [...updatedChat.messages, jarvisMsg], updatedAt: Date.now() }
        setChat(final)
        saveChat(final)
        setNewMsgIds(new Set([jarvisMsg.id]))
        setIsThinking(false)
        return
      }

      // AI API call
      const contextMsgs = updatedChat.messages.slice(-8).map(m => ({ role: m.role, content: m.content }))
      const personality = PERSONALITY_PROMPTS[preferences.personalityMode] || PERSONALITY_PROMPTS.default

      let jarvisContent = ''
      let toolsFound: Message['tools'] = []
      let confidence = 0.8
      let modelUsed = 'keyword'

      const res = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text,
          context: contextMsgs,
          level: relationship.level,
          personality: preferences.personalityMode,
        }),
      })

      if (res.ok) {
        const data = await res.json()

        if (data.useKeywordFallback) {
          const fallback = keywordFallback(text)
          if (fallback) {
            jarvisContent = `${fallback.response} ${getTonyStarkResponse(emotion, streak)}`
            toolsFound = TOOLS
              .filter(t => fallback.tools.some(n => t.name.toLowerCase().includes(n.toLowerCase())))
              .slice(0, 4)
              .map(t => ({ id: t.id, name: t.name, url: t.url }))
          } else {
            jarvisContent = getTonyStarkResponse(emotion, streak) + '\n\nSir, internet check karo aur dobara try karo.'
          }
        } else {
          jarvisContent = (data.response as string) || getTonyStarkResponse(emotion, streak)
          confidence = (data.confidence as number) || 0.8
          modelUsed = (data.model as string) || 'gemini'

          if (data.tonyStarkComment && Math.random() > 0.6) {
            jarvisContent += `\n\n*${data.tonyStarkComment}*`
          }

          if (data.tools && Array.isArray(data.tools)) {
            toolsFound = TOOLS
              .filter(t => (data.tools as string[]).some((n: string) =>
                t.name.toLowerCase().includes(n.toLowerCase())
              ))
              .slice(0, 4)
              .map(t => ({ id: t.id, name: t.name, url: t.url }))
          }

          if (data.emotion) {
            const ambient2 = getAmbientConfig(data.emotion as any, batteryLevel)
            setAmbientPrimary(ambient2.colors.primary)
          }
        }
      } else {
        const fallback = keywordFallback(text)
        jarvisContent = fallback
          ? fallback.response
          : getTonyStarkResponse(emotion, streak)
      }

      const jarvisMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'jarvis',
        content: jarvisContent,
        timestamp: Date.now(),
        confidence,
        emotion,
        model: modelUsed,
        tools: toolsFound.length > 0 ? toolsFound : undefined,
      }

      const finalChat: Chat = {
        ...updatedChat,
        messages: [...updatedChat.messages, jarvisMsg],
        updatedAt: Date.now(),
      }
      setChat(finalChat)
      saveChat(finalChat)
      setNewMsgIds(new Set([jarvisMsg.id]))

      // Increment interaction + check badges
      const { relationship: newRel, justLeveledUp: leveledUp } = incrementInteraction()
      setRelationship(newRel)
      if (leveledUp) {
        setJustLeveledUp(true)
        haptic('heavy')
        setTimeout(() => setJustLeveledUp(false), 3000)
      }

      const earned = checkAndAwardBadges(newRel)
      if (earned.length > 0) {
        setNewBadges(earned)
        haptic('heavy')
      }

      // Auto battery suggestion
      if (ambient.batterySuggestion && Math.random() > 0.7) {
        setTimeout(() => setProactiveSuggestion(ambient.batterySuggestion!), 2000)
      }

    } catch (err) {
      const errorMsg: Message = {
        id: `msg_${Date.now() + 1}`, role: 'jarvis',
        content: 'Sir, kuch gadbad ho gayi. Internet check karo aur dobara try karo. 🔄',
        timestamp: Date.now(),
      }
      const final: Chat = { ...updatedChat, messages: [...updatedChat.messages, errorMsg], updatedAt: Date.now() }
      setChat(final)
      saveChat(final)
    } finally {
      setIsThinking(false)
    }
  }, [input, isThinking, chat, relationship, preferences, streak, batteryLevel, haptic, fetchWeather, weatherData, doWebSearch])

  // ━━━ COMMANDS ━━━
  const handleCommand = useCallback((action: string) => {
    if (action.startsWith('filter:')) {
      setToolCategory(action.replace('filter:', ''))
      setShowTools(true)
      setActiveTab('tools')
    } else if (action === 'clear') {
      const c = newChat(); setChat(c)
    } else if (action === 'export') {
      exportAllData()
    } else if (action === 'export-pdf') {
      exportChatPDF()
    } else if (action === 'privacy') {
      window.open('/jarvis-knows', '_blank')
    } else if (action === 'weather') {
      fetchWeather().then(() => sendMessage('Aaj ka mausam kaisa hai?'))
    } else if (action === 'search') {
      setInput('/search ')
    } else if (action === 'vision') {
      fileInputRef.current?.click()
    } else if (action === 'badges') {
      setShowSettings(true)
    } else if (action === 'journal') {
      sendMessage('Aaj ka din kaisa raha? Journal likhna hai.')
    } else if (action === 'level') {
      const r = getRelationship()
      sendMessage(`Main Level ${r.level} pe hoon aur ${r.xp} XP hai mera. Kya khaas hai is level pe?`)
    } else if (action === 'streak') {
      sendMessage(`Meri ${streak} din ki streak hai. Kya feedback hai?`)
    }
  }, [exportChatPDF, fetchWeather, sendMessage, streak])

  const prefs = getPreferences()

  return (
    <div {...swipeHandlers} style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      position: 'relative', zIndex: 1,
      '--ambient': ambientPrimary,
    } as React.CSSProperties}>

      {/* Hidden file input for vision */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = '' }}
      />

      <SmartStorageAlert />
      <BadgeToast newBadges={newBadges} onDismiss={() => setNewBadges([])} />

      {/* Weather widget (if data loaded) */}
      {weatherData && (
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'fixed', top: 70, right: 12, zIndex: 8000,
            background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: 12, padding: '8px 12px', backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ fontSize: 11, color: '#6b6b8a' }}>{weatherData.city}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#00d4ff' }}>{weatherData.temp}°C</div>
          <div style={{ fontSize: 10, color: '#6b6b8a' }}>{weatherData.description}</div>
          <button onClick={() => setWeatherData(null)} style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 'none', color: '#6b6b8a', cursor: 'pointer', fontSize: 12 }}>✕</button>
        </motion.div>
      )}

      {/* Header */}
      <div style={{ padding: '12px 16px 8px', flexShrink: 0, borderBottom: '1px solid rgba(255,26,136,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {prefs.showAvatar && <JarvisAvatar isThinking={isThinking} isSpeaking={isSpeaking} level={relationship.level} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Courier New', fontSize: 16, color: '#ff1a88', letterSpacing: 2, fontWeight: 700 }}>
              JARVIS
            </div>
            <div style={{ fontSize: 11, color: '#6b6b8a' }}>
              {isThinking ? '⚡ Thinking...' : isListening ? '🎤 Listening...' : isSearching ? '🔍 Searching...' : `Level ${relationship.level} · ${streak > 0 ? `🔥 ${streak}d` : 'Free Forever'}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Weather button */}
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={() => { fetchWeather(); haptic('light') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b8a', padding: 4 }}>
              <Cloud size={16} />
            </motion.button>
            {/* Camera button */}
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={() => { fileInputRef.current?.click(); haptic('light') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b8a', padding: 4 }}>
              <Camera size={16} />
            </motion.button>
            {streak > 0 && (
              <span style={{ fontSize: 12, color: '#ff1a88', fontWeight: 600 }}>🔥{streak}</span>
            )}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { const c = newChat(); setChat(c) }}
              style={{ background: 'none', border: '1px solid rgba(255,26,136,0.3)', borderRadius: 8, padding: '4px 8px', color: '#6b6b8a', cursor: 'pointer', fontSize: 12 }}>
              + New
            </motion.button>
          </div>
        </div>
        <RelationshipBar relationship={relationship} justLeveledUp={justLeveledUp} />
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8, paddingBottom: 8 }}>
        <AnimatePresence>
          {proactiveSuggestion && (
            <motion.div
              key="proactive"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              onClick={() => sendMessage(proactiveSuggestion)}
              style={{
                margin: '8px 12px', padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                background: 'rgba(255,26,136,0.08)', border: '1px solid rgba(255,26,136,0.2)',
                fontSize: 13, color: '#6b6b8a',
              }}
            >
              💡 {proactiveSuggestion}
            </motion.div>
          )}
        </AnimatePresence>

        {chat.messages.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <LiveStats />
            <div style={{ textAlign: 'center', padding: '20px 24px', color: '#6b6b8a', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
              <div>{getGreeting(relationship.level, profile, streak)}</div>
              <div style={{ marginTop: 8, fontSize: 11 }}>
                Type, speak 🎤, camera 📸, or / for commands · Swipe left for tools
              </div>
            </div>
          </motion.div>
        )}

        {chat.messages.map(msg => (
          <ChatBubble key={msg.id} msg={msg} isNew={newMsgIds.has(msg.id)} ttsEnabled={preferences.ttsEnabled} />
        ))}
        {isThinking && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div style={{ padding: '8px 12px', flexShrink: 0, borderTop: '1px solid rgba(255,26,136,0.1)' }}>
        <div className="input-wrapper" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <motion.button onClick={startVoice} whileTap={{ scale: 0.9 }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: isListening ? '#ff1a88' : '#6b6b8a', flexShrink: 0 }}>
            {isListening
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mic size={18} color="#ff1a88" /><SoundWave isActive bars={12} height={20} /></div>
              : <Mic size={18} />
            }
          </motion.button>
          <textarea
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
              if (e.key === '/' && !input) setShowCmdPalette(true)
            }}
            placeholder="Message JARVIS... (/ for commands)"
            rows={1}
            style={{
              flex: 1, resize: 'none', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,26,136,0.2)', borderRadius: 12,
              padding: '10px 12px', color: '#f0f0ff', fontSize: 14,
              outline: 'none', lineHeight: 1.5,
            }}
          />
          <motion.button
            onClick={() => sendMessage()} whileTap={{ scale: 0.9 }}
            disabled={!input.trim() || isThinking}
            className="jarvis-btn"
            style={{ padding: '10px 14px', opacity: input.trim() && !isThinking ? 1 : 0.4, flexShrink: 0, borderRadius: 12 }}>
            <Send size={16} />
          </motion.button>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav" style={{
        display: 'flex', borderTop: '1px solid rgba(255,26,136,0.1)',
        background: 'rgba(5,5,15,0.9)', backdropFilter: 'blur(20px)', flexShrink: 0,
      }}>
        {([
          { tab: 'chat',     icon: '💬', label: 'Chat' },
          { tab: 'tools',    icon: '🛠️', label: 'Tools' },
          { tab: 'history',  icon: '📋', label: 'History' },
          { tab: 'settings', icon: '⚙️', label: 'Settings' },
        ] as const).map(({ tab, icon, label }) => (
          <button key={tab}
            style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              color: activeTab === tab ? '#ff1a88' : '#6b6b8a', fontSize: 10, fontWeight: 600,
              borderTop: activeTab === tab ? '2px solid #ff1a88' : '2px solid transparent',
            }}
            onClick={() => {
              setActiveTab(tab)
              haptic('light')
              if (tab === 'tools') setShowTools(true)
              if (tab === 'chat') setShowTools(false)
              if (tab === 'history') setShowHistory(true)
              if (tab === 'settings') setShowSettings(true)
            }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Panels */}
      <ToolsPanel show={showTools} onClose={() => { setShowTools(false); setActiveTab('chat') }} category={toolCategory} onCategoryChange={setToolCategory} />
      <CommandPalette isOpen={showCmdPalette} onClose={() => setShowCmdPalette(false)} onAction={handleCommand} />
      <SmartSettings isOpen={showSettings} onClose={() => { setShowSettings(false); setActiveTab('chat') }} />
      <SmartHistory
        isOpen={showHistory}
        onClose={() => { setShowHistory(false); setActiveTab('chat') }}
        onSelectChat={(selectedChat) => {
          setChat(selectedChat)
          lsSet('jarvis_active_chat', selectedChat.id)
        }}
      />
    </div>
  )
}
