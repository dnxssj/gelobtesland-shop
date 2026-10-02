import React from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../i18n'
export function Success(){const [params]=useSearchParams(); const { t } = useLanguage(); return <div className="screen-state"><CheckCircle2 size={52}/><p className="eyebrow">{t('result.successEyebrow')}</p><h1>{t('result.successTitle')}</h1><p>{t('result.successText', { extra: params.get('session_id') ? t('result.processing') : '' })}</p><Link className="button button--dark" to="/shop">{t('result.continue')}</Link></div>}
export function Cancel(){const { t } = useLanguage(); return <div className="screen-state"><XCircle size={52}/><p className="eyebrow">{t('result.cancelEyebrow')}</p><h1>{t('result.cancelTitle')}</h1><p>{t('result.cancelText')}</p><Link className="button button--dark" to="/checkout">{t('result.back')}</Link></div>}
