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

function ChatBubble({ msg, isNew, ttsEnabled }: { msg: Message; isNew: boolean; ttsEnabled: boolean }) {
  const isJarvis = msg.role === 'jarvis' || msg.role === 'assistant'
  
  useEffect(() => {
    if (isNew && isJarvis && ttsEnabled) {
      speakUtil(msg.content)
    }
  }, [isNew, isJarvis, ttsEnabled, msg.content])

  return (
    <motion.div
      initial={isNew ? { opacity: 0, scale: 0.95 } : false}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        display: 'flex',
        justifyContent: isJarvis ? 'flex-start' : 'flex-end',
        marginBottom: 20,
        gap: 12,
        alignItems: 'flex-end',
      }}
    >
      {isJarvis && (
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,26,136,0.1)', border: '1px solid rgba(255,26,136,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
          🤖
        </div>
      )}
      
      <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column' }}>
        {msg.confidence !== undefined && isJarvis && (
          <div style={{ fontSize: 10, color: '#6b6b8a', marginBottom: 4 }}>
             {msg.model} · {Math.round((msg.confidence || 0) * 100)}%
          </div>
        )}

        <div style={{
          padding: '12px 16px',
          borderRadius: isJarvis ? '4px 20px 20px 20px' : '20px 4px 20px 20px',
          background: isJarvis 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'linear-gradient(135deg, #ff1a88, #7c3aed)',
          border: isJarvis ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          backdropFilter: isJarvis ? 'blur(10px)' : 'none',
          boxShadow: isJarvis ? '0 4px 15px rgba(0,0,0,0.1)' : '0 4px 15px rgba(255,26,136,0.2)',
          color: '#f0f0ff',
        }}>
          {msg.imageUrl && (
            <img src={msg.imageUrl} alt="uploaded" style={{ maxWidth: '100%', borderRadius: 12, marginBottom: 10 }} />
          )}
          
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            {isNew && isJarvis ? <TypewriterText text={msg.content} /> : msg.content}
          </div>

          <div style={{ fontSize: 9, color: isJarvis ? '#4a4a6a' : 'rgba(255,255,255,0.5)', marginTop: 8, textAlign: isJarvis ? 'left' : 'right' }}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 20 }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,26,136,0.1)', border: '1px solid rgba(255,26,136,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
      <div style={{ padding: '12px 16px', background: 'rgba(255,26,136,0.08)', borderRadius: '4px 16px 16px 16px', border: '1px solid rgba(255,26,136,0.15)', display: 'flex', gap: 4 }}>
        {[0,1,2].map(i => (
          <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff1a88' }}
            animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }} />
        ))}
      </div>
    </div>
  )
}

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
  const [isMobile, setIsMobile] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [allChats, setAllChats] = useState(() => getChats())
  
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setShowSidebar(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, isThinking])

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText || input).trim()
    if (!text || isThinking) return
    
    stopSpeaking()
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const mode = detectMode(text)
    const userMsg: Message = { id: `msg_${Date.now()}`, role: 'user', content: text, timestamp: Date.now(), mode }
    const updatedChat = { ...chat, messages: [...chat.messages, userMsg], updatedAt: Date.now() }
    
    setChat(updatedChat)
    saveChat(updatedChat)
    setIsThinking(true)

    try {
      const res = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text }),
      })

      if (res.ok) {
        const data = await res.json()
        const jarvisMsg: Message = { 
          id: `msg_${Date.now() + 1}`, 
          role: 'jarvis', 
          content: data.response, 
          timestamp: Date.now(),
          model: data.model || 'gemini'
        }
        const finalChat = { ...updatedChat, messages: [...updatedChat.messages, jarvisMsg] }
        setChat(finalChat)
        saveChat(finalChat)
        setNewMsgIds(new Set([jarvisMsg.id]))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsThinking(false)
    }
  }, [input, isThinking, chat])

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#05050f', color: 'white', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Header */}
        <div style={{ height: 60, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', px: 20, justifyContent: 'space-between', padding: '0 20px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
             <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff1a88', boxShadow: '0 0 10px #ff1a88' }} />
             <span style={{ fontWeight: 'bold', letterSpacing: 1 }}>JARVIS V2.0</span>
           </div>
        </div>

        {/* Chat Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {chat.messages.map(msg => (
            <ChatBubble key={msg.id} msg={msg} isNew={newMsgIds.has(msg.id)} ttsEnabled={preferences.ttsEnabled} />
          ))}
          {isThinking && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '20px', background: 'rgba(5,5,15,0.8)', backdropFilter: 'blur(10px)' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '8px 16px', alignItems: 'center' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Talk to JARVIS..."
              rows={1}
              style={{ flex: 1, background: 'none', border: 'none', color: 'white', outline: 'none', resize: 'none', padding: '8px 0' }}
            />
            <button onClick={() => sendMessage()} style={{ background: 'linear-gradient(135deg, #ff1a88, #7c3aed)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Send size={20} color="white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
