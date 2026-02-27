// lib/intelligence.ts — JARVIS v7.0 (Verified for Gemini UI)
import type { Message, UserProfile } from './memory'

export type Emotion = 'happy' | 'sad' | 'urgent' | 'frustrated' | 'excited' | 'neutral'

export async function detectEmotionSmart(input: string): Promise<Emotion> {
  const lower = input.toLowerCase();
  if (/😄|😊|happy|mast|badiya|great|awesome/.test(lower)) return 'happy';
  if (/😢|sad|dukhi|bura/.test(lower)) return 'sad';
  if (/jaldi|urgent|turant/.test(lower)) return 'urgent';
  return 'neutral';
}

export function detectMode(input: string) { 
  const lower = input.toLowerCase();
  if (lower.includes('code') || lower.includes('program')) return 'code';
  if (lower.includes('search') || lower.includes('find')) return 'search';
  return 'chat'; 
}

export function getGreeting(level: number, profile?: UserProfile): string {
  const name = profile?.name || 'Sir';
  const hour = new Date().getHours();
  let timeGreet = "Subh sandhya"; // Default
  if (hour >= 4 && hour < 12) timeGreet = "Subh prabhat";
  if (hour >= 12 && hour < 17) timeGreet = "Namaste";

  return `${timeGreet}, ${name}. Main aaj aapki kaise madad kar sakta hoon?`;
}

export function getProactiveSuggestion(profile?: UserProfile): string | null {
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 4) return '🌙 Sir, kafi raat ho gayi hai, aapko rest karna chahiye.';
  return "💡 Sir, aaj ke earning opportunities check karein?";
}

export function speak(text: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    window.speechSynthesis.speak(utterance);
  } catch (e) { console.error("Speech Error", e); }
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
}
