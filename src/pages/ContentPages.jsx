import React from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n'
export function About(){return <SimplePage contentKey="about"><Link className="button button--dark" to="/beekeeping">{useLanguage().t('home.beekeeping')}</Link></SimplePage>}
export function Beekeeping(){return <SimplePage contentKey="beekeeping"/>}
export function Contact(){return <SimplePage contentKey="contact"/>}
export function Shipping(){return <SimplePage contentKey="shipping"/>}
export function Impressum(){return <SimplePage contentKey="imprint"/>}
export function Datenschutz(){return <SimplePage contentKey="privacy"/>}
export function Widerruf(){return <SimplePage contentKey="withdrawal"/>}
function SimplePage({eyebrow,title,children,contentKey}){const { t } = useLanguage(); const data = t(`content.${contentKey}`); const values = Array.isArray(data) ? data : [eyebrow,title,children]; return <div className="page"><section className="page-hero"><p className="eyebrow">{values[0]}</p><h1>{values[1]}</h1></section><section className="section section__narrow prose"><p>{values[2]}</p><p>{values[3]}</p>{children}</section></div>}
