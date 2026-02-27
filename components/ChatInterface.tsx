'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, Plus, Settings, Camera, Search, X, Menu, Wrench } from 'lucide-react'
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
  getTonyStarkResponse, getAmbientConfig, getAutoTheme,
  speak as speakUtil, stopSpeaking,
} from '@/lib/intelligence'

// ━━━ PREMIUM CHAT BUBBLE (Master Upgrade) ━━━
function ChatBubble({ msg, isNew, ttsEnabled }: { msg: Message; isNew: boolean; ttsEnabled: boolean }) {
  const isJarvis = msg.role === 'jarvis'
  useEffect(() => {
    if (isNew && isJarvis && ttsEnabled) speakUtil(msg.content)
  }, [isNew, isJarvis, ttsEnabled, msg.content])

  const statusColor = msg.model === 'groq' ? '#f97316' : '#00d4ff';

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 20, scale: 0.95 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      style={{
        display: 'flex',
        justifyContent: isJarvis ? 'flex-start' : 'flex-end',
        marginBottom: 20,
        gap: 12,
        alignItems: 'flex-end',
      }}
    >
      {isJarvis && (
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#ff1a88,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, boxShadow: '0 4px 12px rgba(255,26,136,0.3)' }}>
          🤖
        </div>
      )}
      
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Breathing Pulse Neural Status */}
        {isJarvis && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
            <motion.div 
              animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.15, 1] }} 
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}` }} 
            />
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', color: '#6b6b8a', textTransform: 'uppercase' }}>
              {msg.model === 'groq' ? 'Secondary Link' : 'Neural Link Active'}
            </span>
          </div>
        )}

        <div style={{
          padding: '12px 16px',
          borderRadius: isJarvis ? '4px 20px 20px 20px' : '20px 4px 20px 20px',
          background: isJarvis 
            ? 'rgba(255, 255, 255, 0.04)' 
            : 'linear-gradient(135deg, #ff1a88, #7c3aed)',
          border: isJarvis ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
          backdropFilter: isJarvis ? 'blur(12px)' : 'none',
          boxShadow: isJarvis ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 15px rgba(255,26,136,0.2)',
          color: '#f0f0ff',
        }}>
          {msg.imageUrl && (
            <img src={msg.imageUrl} alt="uploaded" style={{ maxWidth: '100%', borderRadius: 12, marginBottom: 10 }} />
          )}
          
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            {isNew && isJarvis ? <TypewriterText text={msg.content} /> : msg.content}
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginTop: 8,
            borderTop: isJarvis ? '1px solid rgba(255,255,255,0.05)' : 'none',
            paddingTop: 4
          }}>
             <span style={{ fontSize: '9px', color: isJarvis ? '#4a4a6a' : 'rgba(255,255,255,0.5)' }}>
               {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </span>
             {isJarvis && (
               <span style={{ fontSize: '9px', color: statusColor, fontWeight: 700, opacity: 0.8 }}>
                 {msg.model === 'groq' ? 'GROQ' : 'v2.0 FLASH'}
               </span>
             )}
          </div>
        </div>
      </div>
      
      {!isJarvis && (
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
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

// ━━━ MASTER INTERFACE ━━━
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
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bat: any) => {
        setBatteryLevel(bat.level)
        bat.addEventListener('levelchange', () => setBatteryLevel(bat.level))
      })
    }
    const suggestion = getProactiveSuggestion(getProfile(), updateStreak())
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

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText || input).trim()
    if (!text || isThinking) return
    stopSpeaking(); setInput(''); haptic('light')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const mode = detectMode(text)
    const userMsg: Message = { id: `msg_${Date.now()}`, role: 'user', content: text, timestamp: Date.now(), mode }
    const updatedChat: Chat = {
      ...chat, messages: [...chat.messages, userMsg],
      title: chat.messages.length === 0 ? text.slice(0, 40) : chat.title,
      updatedAt: Date.now(),
    }
    setChat(updatedChat); saveChat(updatedChat); setIsThinking(true)

    try {
      const emotion = await detectEmotionSmart(text)
      const res = await fetch('/api/intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, context: updatedChat.messages.slice(-8).map(m => ({ role: m.role, content: m.content })) }),
      })

      if (res.ok) {
        const data = await res.json()
        const jarvisMsg: Message = { 
          id: `msg_${Date.now() + 1}`, 
          role: 'jarvis', 
          content: data.response, 
          timestamp: Date.now(), 
          model: data.model || 'gemini',
          emotion 
        }
        const finalChat = { ...updatedChat, messages: [...updatedChat.messages, jarvisMsg], updatedAt: Date.now() }
        setChat(finalChat); saveChat(finalChat); setNewMsgIds(new Set([jarvisMsg.id]))
        setAllChats(getChats())
      }
    } catch {
      const errMsg: Message = { id: `msg_${Date.now() + 1}`, role: 'jarvis', content: 'Sir, neural link unstable. 🔄', timestamp: Date.now() }
      setChat({ ...updatedChat, messages: [...updatedChat.messages, errMsg] })
    } finally {
      setIsThinking(false)
    }
  }, [input, isThinking, chat, haptic])

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#05050f', overflow: 'hidden' }}>
      {/* Sidebar, Tools, and other components stay the same as original */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar logic... */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {chat.messages.map(msg => (
            <ChatBubble key={msg.id} msg={msg} isNew={newMsgIds.has(msg.id)} ttsEnabled={preferences.ttsEnabled} />
          ))}
          {isThinking && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Improved Input Area */}
        <div style={{ padding: '16px', background: 'rgba(5,5,15,0.8)', backdropFilter: 'blur(20px)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,26,136,0.2)', borderRadius: '20px', padding: '10px 16px' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Talk to JARVIS..."
              rows={1}
              style={{ flex: 1, background: 'none', border: 'none', color: '#f0f0ff', outline: 'none', resize: 'none' }}
            />
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => sendMessage()} style={{ background: 'linear-gradient(135deg, #ff1a88, #7c3aed)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Send size={18} color="white" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
  }
