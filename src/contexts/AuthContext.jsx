import React from 'react';
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, hasSupabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(hasSupabase)

  useEffect(() => {
    if (!supabase) { setLoading(false); return undefined }
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) await loadProfile(data.session.user.id)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) await loadProfile(nextSession.user.id)
      else setProfile(null)
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  async function loadProfile(userId) {
    if (!supabase) return
    const { data } = await supabase.from('profiles').select('id,email,full_name,role').eq('id', userId).single()
    setProfile(data || null)
  }

  async function signIn(email, password) {
    if (!supabase) throw new Error('Supabase ist noch nicht konfiguriert.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
  }

  return <AuthContext.Provider value={{ session, profile, loading, signIn, signOut, hasSupabase }}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }

