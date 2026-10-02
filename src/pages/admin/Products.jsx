import React from 'react';
import { demoProducts } from '../../data/products'
export default function Products(){return <div><div className="admin-page-head"><div><p className="eyebrow">KATALOG</p><h1>Produkte</h1></div><button className="button button--dark">Produkt hinzufügen</button></div><div className="admin-panel"><div className="admin-table"><div className="admin-row admin-row--head"><span>Produkt</span><span>Preis</span><span>Status</span><span>Slug</span></div>{demoProducts.map(p=><div className="admin-row" key={p.id}><span>{p.name}</span><span>{p.price.toFixed(2).replace('.',',')} €</span><span><b className="status">{p.available?'Aktiv':'Archiviert'}</b></span><span>{p.slug}</span></div>)}</div></div></div>}

