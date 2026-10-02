import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ roles }) {
  const { session, profile, loading, hasSupabase } = useAuth()
  const location = useLocation()
  if (!hasSupabase) return <Navigate to="/admin/login" replace state={{ from: location, reason: 'config' }}/>
  if (loading) return <div className="screen-state">Authentifizierung wird geladen…</div>
  if (!session) return <Navigate to="/admin/login" replace state={{ from: location }}/>
  if (!profile) return <div className="screen-state">Benutzerprofil wird geladen…</div>
  if (roles && !roles.includes(profile.role)) return <Navigate to="/admin" replace/>
  return <Outlet/>
}

