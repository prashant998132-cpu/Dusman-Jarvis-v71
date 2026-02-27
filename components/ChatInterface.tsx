'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, Plus, Settings, History, Wrench, Camera, Search, X, Menu } from 'lucide-react'
import TypewriterText from '@/components/TypewriterText'
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
  // FIXED: Removed 'assistant' check to satisfy TypeScript
  const isJarvis = msg.role === 'jarvis'
  
  useEffect(() => {
    if (isNew && isJarvis && ttsEnabled) {
      speakUtil(msg.content)
    }
  }, [isNew, isJarvis, ttsEnabled, msg.content])

  const statusColor = msg.model === 'groq' ? '#f97316' : '#00d4ff';

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
        {isJarvis && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 4 }}>
            <motion.div 
              animate={{ opacity: [0.4, 1, 0.4] }} 
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusColor, boxShadow: `0 0 6px ${statusColor}` }} 
            />
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#6b6b8a', textTransform: 'uppercase' }}>
              {msg.model === 'groq' ? 'Secondary Node' : 'Neural Link'}
            </span>
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
          color: '#f0f0ff',
        }}>
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

export default function ChatInterface() {
  const [chat, setChat] = useState<Chat>(() => getActiveChat() || newChat())
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, isThinking])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isThinking) return
    const text = input.trim(); setInput('')
    const userMsg: Message = { id: `msg_${Date.now()}`, role: 'user', content: text, timestamp: Date.now() }
    const updatedChat = { ...chat, messages: [...chat.messages, userMsg], updatedAt: Date.now() }
    setChat(updatedChat); saveChat(updatedChat); setIsThinking(true)

    try {
      const res = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text }),
      })
      if (res.ok) {
        const data = await res.json()
        const jarvisMsg: Message = { id: `msg_${Date.now() + 1}`, role: 'jarvis', content: data.response, timestamp: Date.now(), model: data.model }
        setChat(prev => ({ ...prev, messages: [...prev.messages, jarvisMsg] }))
      }
    } catch (e) { console.error(e) } finally { setIsThinking(false) }
  }, [input, isThinking, chat])

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#05050f', color: 'white', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {chat.messages.map(msg => <ChatBubble key={msg.id} msg={msg} isNew={false} ttsEnabled={false} />)}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '8px 16px', alignItems: 'center' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Talk to JARVIS..." style={{ flex: 1, background: 'none', border: 'none', color: 'white', outline: 'none' }} />
            <button onClick={sendMessage} style={{ background: '#ff1a88', border: 'none', borderRadius: '50%', width: 36, height: 36 }}><Send size={18} color="white" /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
