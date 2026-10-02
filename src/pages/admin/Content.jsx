import React from 'react';
export default function Content(){return <div><div className="admin-page-head"><div><p className="eyebrow">CMS</p><h1>Inhalte</h1></div></div><div className="admin-panel content-list">{['Homepage Hero','Homepage Intro','Odenwald Abschnitt','Imkerei','Über uns'].map(x=><div key={x}><span>{x}</span><button className="text-link">Bearbeiten →</button></div>)}</div></div>}

