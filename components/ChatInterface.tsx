'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, Plus, Settings, Camera, Search, X, Menu } from 'lucide-react'
import TypewriterText from '@/components/TypewriterText'
import { getActiveChat, newChat, saveChat, getRelationship, getPreferences, getChats, type Message, type Chat } from '@/lib/memory'
import { detectMode, detectEmotionSmart, speak as speakUtil, stopSpeaking } from '@/lib/intelligence'

function ChatBubble({ msg, isNew, ttsEnabled }: { msg: Message; isNew: boolean; ttsEnabled: boolean }) {
  const isJarvis = msg.role === 'jarvis' || msg.role === 'assistant'
  const statusColor = msg.model === 'groq' ? '#f97316' : '#00d4ff';

  return (
    <div style={{ display: 'flex', justifyContent: isJarvis ? 'flex-start' : 'flex-end', marginBottom: 16, width: '100%', gap: 8 }}>
      {isJarvis && <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#ff1a88,#7c3aed)', flexShrink: 0 }} />}
      <div style={{ maxWidth: '80%' }}>
        {isJarvis && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, marginLeft: 4 }}>
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusColor }} />
            <span style={{ fontSize: '9px', color: '#6b6b8a', textTransform: 'uppercase', fontWeight: 'bold' }}>Neural Link</span>
          </div>
        )}
        <div style={{
          padding: '10px 14px',
          borderRadius: isJarvis ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          background: isJarvis ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #ff1a88, #7c3aed)',
          border: isJarvis ? '1px solid rgba(255,255,255,0.1)' : 'none',
          color: '#fff'
        }}>
          <div style={{ fontSize: 14 }}>{isNew && isJarvis ? <TypewriterText text={msg.content} /> : msg.content}</div>
          <div style={{ fontSize: 9, opacity: 0.5, marginTop: 4, textAlign: isJarvis ? 'left' : 'right' }}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
      {!isJarvis && <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#00d4ff)', flexShrink: 0 }} />}
    </div>
  )
}

export default function ChatInterface() {
  const [chat, setChat] = useState<Chat>(() => getActiveChat() || newChat())
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat.messages, isThinking])

  const sendMessage = async () => {
    if (!input.trim() || isThinking) return
    const text = input.trim(); setInput('');
    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: text, timestamp: Date.now() }
    const updatedChat = { ...chat, messages: [...chat.messages, userMsg] }
    setChat(updatedChat); setIsThinking(true)

    try {
      const res = await fetch('/api/intent', { method: 'POST', body: JSON.stringify({ input: text }) })
      const data = await res.json()
      const jarvisMsg: Message = { id: `j_${Date.now()}`, role: 'jarvis', content: data.response, timestamp: Date.now(), model: data.model }
      setChat(prev => ({ ...prev, messages: [...prev.messages, jarvisMsg] }))
    } catch (e) { console.error(e) } finally { setIsThinking(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', background: '#05050f', color: 'white', position: 'fixed', top: 0, left: 0 }}>
      {/* Top Bar */}
      <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', fontWeight: 'bold', fontSize: 14 }}>
        JARVIS v2.0
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' }}>
        {chat.messages.map(msg => <ChatBubble key={msg.id} msg={msg} isNew={false} ttsEnabled={false} />)}
        {isThinking && <div style={{ fontSize: 12, opacity: 0.5 }}>JARVIS is thinking...</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: '24px', padding: '8px 16px', alignItems: 'center' }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask JARVIS..." style={{ flex: 1, background: 'none', border: 'none', color: 'white', outline: 'none' }} />
          <button onClick={sendMessage} style={{ background: '#ff1a88', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer' }}><Send size={16} color="white" /></button>
        </div>
      </div>
    </div>
  )
}
