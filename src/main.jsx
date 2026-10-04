import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { CartProvider } from './contexts/CartContext'
import { LanguageProvider } from './i18n'
import { AuthProvider } from './contexts/AuthContext'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><LanguageProvider><AuthProvider><CartProvider><App/></CartProvider></AuthProvider></LanguageProvider></React.StrictMode>)
