'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import MatrixBoot from '@/components/MatrixBoot'

const ChatInterface = dynamic(() => import('@/components/ChatInterface'), { ssr: false })
const ParticlesBackground = dynamic(() => import('@/components/ParticlesBackground'), { ssr: false })
const SmartPIN = dynamic(() => import('@/components/SmartPIN'), { ssr: false })

export default function Home() {
  const [booted, setBooted] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [pinEnabled, setPinEnabled] = useState(false)

  useEffect(() => {
    // Check PIN after boot
    try {
      const pinData = localStorage.getItem('jarvis_pin')
      if (pinData) {
        const parsed = JSON.parse(pinData)
        if (parsed.enabled && parsed.hash) {
          setPinEnabled(true)
          return
        }
      }
    } catch { /* ignore */ }
    setUnlocked(true)
  }, [booted])

  return (
    <main style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <div className="jarvis-bg" />
      {!booted && <MatrixBoot onDone={() => setBooted(true)} />}
      {booted && pinEnabled && !unlocked && (
        <SmartPIN onUnlock={() => setUnlocked(true)} />
      )}
      {booted && (unlocked || !pinEnabled) && (
        <>
          <ParticlesBackground />
          <ChatInterface />
        </>
      )}
    </main>
  )
}
