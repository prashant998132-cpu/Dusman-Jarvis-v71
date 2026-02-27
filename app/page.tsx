'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, Plus, Settings, Camera, ChevronLeft, Menu, Sparkles, Image as ImageIcon, Search, X } from 'lucide-react'

// COMPONENTS (Your existing ones)
import JarvisAvatar from '@/components/JarvisAvatar'
import TypewriterText from '@/components/TypewriterText'
import SmartSettings from '@/components/SmartSettings'
import CommandPalette from '@/components/CommandPalette'

// LIB (Your original Logic)
import { 
  lsSet, getActiveChat, newChat, saveChat, getChats, deleteChat,
  getRelationship, incrementInteraction, updateStreak, getPreferences,
  getProfile, isPINEnabled, verifyPIN, type Message, type Chat 
} from '@/lib/memory'
import { 
  detectMode, detectEmotionSmart, getGreeting, getProactiveSuggestion,
  speak as speakUtil, stopSpeaking 
} from '@/lib/intelligence'

export default function JARVIS_Full_Gemini() {
  // Logic States
  const [chat, setChat] = useState<Chat>(() => getActiveChat() || newChat())
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  
  // Your advanced features
  const profile = getProfile()
  const relationship = getRelationship()
  const preferences = getPreferences()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, isThinking])

  // --- FULL MESSAGE LOGIC (Keeping your Intent/Emotion Detection) ---
  const handleSendMessage = async () => {
    if (!input.trim() || isThinking) return
    const text = input.trim()
    setInput(''); setIsThinking(true); stopSpeaking()

    // 1. Detect Mode & Emotion (Using your intelligence.ts)
    const mode = detectMode(text)
    const emotion = await detectEmotionSmart(text)

    const userMsg: Message = { 
      id: `u_${Date.now()}`, role: 'user', content: text, 
      timestamp: Date.now(), emotion: emotion, mode: mode 
    }
    
    const updatedChat = { ...chat, messages: [...chat.messages, userMsg], updatedAt: Date.now() }
    setChat(updatedChat); saveChat(updatedChat)

    // 2. Call AI API (Keeping your logic)
    try {
      const res = await fetch('/api/intent', {
        method: 'POST',
        body: JSON.stringify({ input: text, profile, context: updatedChat.messages.slice(-5) })
      })
      const data = await res.json()
      
      const jarvisMsg: Message = { 
        id: `j_${Date.now()}`, role: 'jarvis', content: data.response, 
        timestamp: Date.now(), model: data.model || 'GEMINI' 
      }
      
      const finalChat = { ...updatedChat, messages: [...updatedChat.messages, jarvisMsg] }
      setChat(finalChat); saveChat(finalChat)
      incrementInteraction() // Your Level-up logic
      updateStreak()        // Your Streak logic
    } catch (e) {
      console.error("JARVIS Logic Error", e)
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#08080b', color: '#fff', overflow: 'hidden' }}>
      
      {/* ━━━ SIDEBAR (Preserved) ━━━ */}
      {showSidebar && (
        <motion.div initial={{ x: -260 }} animate={{ x: 0 }} style={{ width: 260, borderRight: '1px solid rgba(255,255,255,0.05)', background: '#0a0a0f', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <JarvisAvatar size={30} level={relationship.level} />
            <span style={{ fontWeight: 700, letterSpacing: 1.5, color: '#ff1a88' }}>JARVIS</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            <button onClick={() => setChat(newChat())} style={{ width: '100%', padding: '10px', background: 'rgba(255,26,136,0.1)', border: '1px solid rgba(255,26,136,0.3)', borderRadius: 10, color: '#ff1a88', marginBottom: 20 }}>+ New Chat</button>
            {getChats().map(c => (
              <div key={c.id} onClick={() => setChat(c)} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', background: chat.id === c.id ? 'rgba(255,255,255,0.05)' : 'transparent', fontSize: 13, marginBottom: 4 }}>{c.title}</div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ━━━ MAIN CHAT AREA (Gemini Transformation) ━━━ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Top Navigation */}
        <header style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 15, background: 'rgba(8,8,11,0.5)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          <button onClick={() => setShowSidebar(!showSidebar)} style={{ background: 'none', border: 'none', color: '#6b6b8a' }}><Menu size={20} /></button>
          <div style={{ flex: 1, fontSize: 14, opacity: 0.6 }}>{chat.title}</div>
          <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', color: '#6b6b8a' }}><Settings size={20} /></button>
        </header>

        {/* Message List (Compact No-Bubble) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 15%' }}>
          {chat.messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '10vh' }}>
              <JarvisAvatar size={80} level={relationship.level} isThinking={isThinking} />
              <h1 style={{ fontWeight: 400, marginTop: 24, fontSize: 32 }}>{getGreeting(relationship.level, profile)}</h1>
              {getProactiveSuggestion(profile) && (
                <div style={{ marginTop: 20, padding: '10px 20px', background: 'rgba(255,26,136,0.05)', borderRadius: 20, display: 'inline-block', fontSize: 13, color: '#ff1a88', border: '1px solid rgba(255,26,136,0.1)' }}>
                  {getProactiveSuggestion(profile)}
                </div>
              )}
            </div>
          )}

          {chat.messages.map((m: Message) => (
            <div key={m.id} style={{ display: 'flex', gap: 20, marginBottom: 40, flexDirection: m.role === 'jarvis' ? 'row' : 'row-reverse' }}>
              {m.role === 'jarvis' && <div style={{ marginTop: 4 }}><JarvisAvatar size={28} level={relationship.level} /></div>}
              <div style={{ maxWidth: '85%' }}>
                {/* Clean Text (No Bubbles for AI) */}
                <div style={{ 
                  fontSize: 16, lineHeight: 1.8, color: '#e5e7eb',
                  background: m.role === 'user' ? 'rgba(255,255,255,0.03)' : 'transparent',
                  padding: m.role === 'user' ? '12px 20px' : '0',
                  borderRadius: '20px'
                }}>
                  {m.imageUrl && <img src={m.imageUrl} style={{ borderRadius: 12, marginBottom: 15, maxWidth: '100%' }} />}
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {m.role === 'jarvis' ? <TypewriterText text={m.content} /> : m.content}
                  </div>
                </div>
                {/* Meta info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, opacity: 0.3, fontSize: 11, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.role === 'jarvis' && <Sparkles size={12} />}
                  <span>{m.model || 'JARVIS-7'} • {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            </div>
          ))}
          {isThinking && <div style={{ paddingLeft: 48 }}><JarvisAvatar size={20} isThinking level={relationship.level} /></div>}
          <div ref={bottomRef} style={{ height: 150 }} />
        </div>

        {/* Floating Input (Gemini Style) */}
        <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 800 }}>
          <div style={{ 
            background: 'rgba(22,22,27,0.8)', border: '1px solid rgba(255,255,255,0.08)', 
            borderRadius: 32, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 15,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)', backdropFilter: 'blur(15px)'
          }}>
            <Plus size={22} style={{ color: '#6b6b8a', cursor: 'pointer' }} />
            <input 
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask JARVIS anything..." 
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 16, height: 48 }}
            />
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', color: '#6b6b8a' }}>
              <Camera size={22} style={{ cursor: 'pointer' }} />
              <Mic size={22} style={{ cursor: 'pointer' }} />
              {input.trim() && (
                <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={handleSendMessage} style={{ background: '#ff1a88', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={18} />
                </motion.button>
              )}
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: 10, opacity: 0.2, marginTop: 10, letterSpacing: 0.5 }}>
            JARVIS Autonomous AI v7.0 • Patel Community Specialized Logic
          </p>
        </div>
      </div>

      <SmartSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
