'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getBadges, getRelationship, type Badge } from '@/lib/memory'

interface Props {
  newBadges?: Badge[]
  onDismiss?: () => void
}

export function BadgeToast({ newBadges = [], onDismiss }: Props) {
  const [visible, setVisible] = useState(newBadges.length > 0)
  const badge = newBadges[0]

  useEffect(() => {
    if (newBadges.length > 0) {
      setVisible(true)
      const t = setTimeout(() => { setVisible(false); onDismiss?.() }, 4000)
      return () => clearTimeout(t)
    }
  }, [newBadges, onDismiss])

  if (!badge) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -60, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9998, minWidth: 240,
            background: 'linear-gradient(135deg, rgba(255,26,136,0.9), rgba(124,58,237,0.9))',
            borderRadius: 20, padding: '12px 20px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(255,26,136,0.5)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <span style={{ fontSize: 28 }}>{badge.icon}</span>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: 1 }}>BADGE EARNED!</div>
            <div style={{ fontSize: 15, color: 'white', fontWeight: 700 }}>{badge.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{badge.description}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function BadgesPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [relationship, setRelationship] = useState(getRelationship())

  useEffect(() => {
    if (isOpen) {
      setBadges(getBadges())
      setRelationship(getRelationship())
    }
  }, [isOpen])

  const ALL_BADGES = [
    { id: 'first_chat',  name: 'First Words',   icon: '💬', description: 'Pehli chat!' },
    { id: 'streak_3',    name: '3 Din Streak',   icon: '🔥', description: '3 din se aa rahe ho!' },
    { id: 'streak_7',    name: 'Week Warrior',   icon: '⚡', description: '7 din ki streak!' },
    { id: 'level_2',     name: 'Acquaintance',   icon: '🤝', description: 'Level 2 unlock!' },
    { id: 'level_3',     name: 'Real Friend',    icon: '😊', description: 'Level 3 unlock!' },
    { id: 'level_5',     name: 'JARVIS MODE',    icon: '🤖', description: 'Max level!' },
    { id: 'xp_100',      name: 'Century',        icon: '💯', description: '100 XP earn kiya!' },
    { id: 'xp_500',      name: 'Power User',     icon: '🚀', description: '500 XP earn kiya!' },
  ]

  const earnedIds = new Set(badges.map(b => b.id))

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 8500, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              maxHeight: '80vh', overflowY: 'auto',
              background: 'rgba(13,13,31,0.98)',
              border: '1px solid rgba(255,26,136,0.2)',
              borderRadius: '24px 24px 0 0', padding: '20px 16px 80px',
            }}
          >
            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 4, margin: '0 auto 20px' }} />
            <h2 style={{ fontFamily: 'Courier New', fontSize: 18, color: '#ff1a88', letterSpacing: 2, marginBottom: 8 }}>
              🏆 BADGES
            </h2>
            <div style={{ fontSize: 12, color: '#6b6b8a', marginBottom: 20 }}>
              {badges.length}/{ALL_BADGES.length} earned · {relationship.xp} XP total
            </div>

            {/* XP Bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${Math.min((relationship.xp % 100), 100)}%` }}
                  transition={{ type: 'spring', stiffness: 80 }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #ff1a88, #7c3aed)', borderRadius: 8 }}
                />
              </div>
              <div style={{ fontSize: 11, color: '#6b6b8a', marginTop: 4 }}>XP: {relationship.xp} · Next milestone: {Math.ceil(relationship.xp / 100) * 100}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ALL_BADGES.map(def => {
                const earned = earnedIds.has(def.id)
                return (
                  <motion.div
                    key={def.id}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '14px 12px', borderRadius: 14,
                      background: earned ? 'linear-gradient(135deg, rgba(255,26,136,0.15), rgba(124,58,237,0.1))' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${earned ? 'rgba(255,26,136,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      opacity: earned ? 1 : 0.45,
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{def.icon}</div>
                    <div style={{ fontSize: 13, color: earned ? 'var(--text)' : '#6b6b8a', fontWeight: 600 }}>{def.name}</div>
                    <div style={{ fontSize: 11, color: '#6b6b8a', marginTop: 2 }}>{def.description}</div>
                    {earned && <div style={{ fontSize: 10, color: '#ff1a88', marginTop: 4 }}>✓ Earned</div>}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
