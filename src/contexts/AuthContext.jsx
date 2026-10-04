import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, hasSupabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(hasSupabase)

  async function loadProfile(userId) {
    if (!supabase || !userId) return null
    const { data, error } = await supabase.from('profiles').select('id,email,full_name,role').eq('id', userId).maybeSingle()
    if (error) { console.error('Profile load failed:', error); setProfile(null); return null }
    setProfile(data || null)
    return data || null
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return undefined }
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session || null)
      if (data.session?.user) await loadProfile(data.session.user.id)
      if (mounted) setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession || null)
      if (nextSession?.user) {
        window.setTimeout(() => { if (mounted) loadProfile(nextSession.user.id) }, 0)
      } else setProfile(null)
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  async function signIn(email, password) {
    if (!supabase) throw new Error('Supabase ist noch nicht konfiguriert.')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw error
  }

  async function signOut() { if (supabase) await supabase.auth.signOut() }

  return <AuthContext.Provider value={{ session, profile, loading, signIn, signOut, refreshProfile: () => session?.user ? loadProfile(session.user.id) : null, hasSupabase }}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
