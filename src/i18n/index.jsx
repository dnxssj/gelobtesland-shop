import React, { createContext, useContext, useMemo, useState } from 'react'
import { translations } from './translations'
import { adminTranslations } from './adminTranslations'

const LanguageContext = createContext(null)
const STORAGE_KEY = 'gelobtes-land-language'
const SUPPORTED = ['de', 'en', 'es']

function getInitialLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (SUPPORTED.includes(saved)) return saved
  const browser = (navigator.language || 'de').slice(0, 2).toLowerCase()
  return SUPPORTED.includes(browser) ? browser : 'de'
}

function getValue(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object)
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)
  const setLanguage = (next) => { if (!SUPPORTED.includes(next)) return; localStorage.setItem(STORAGE_KEY, next); setLanguageState(next) }
  const value = useMemo(() => ({ language, setLanguage, languages: SUPPORTED, t: (key, vars = {}) => { const currentTranslations = {
  ...translations[language],
  admin: adminTranslations[language]
}

const fallbackTranslations = {
  ...translations.de,
  admin: adminTranslations.de
}

let value =
  getValue(currentTranslations, key) ??
  getValue(fallbackTranslations, key) ??
  key; if (typeof value !== 'string') return value; Object.entries(vars).forEach(([name, replacement]) => { value = value.replace(`{${name}}`, replacement) }); return value } }), [language])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
