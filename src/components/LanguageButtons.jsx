import React from 'react'
import { useLanguage } from '../i18n'

export default function LanguageButtons() {
  const { language, setLanguage } = useLanguage()
  return <div className="language-buttons" aria-label="Language">
    {['de', 'en', 'es'].map(code => <button key={code} className={language === code ? 'is-active' : ''} onClick={() => setLanguage(code)} aria-pressed={language === code}>{code.toUpperCase()}</button>)}
  </div>
}
