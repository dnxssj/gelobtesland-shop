import React from 'react';
const rows=[['OH-000142','Max Mustermann','Bezahlt','31,20 €'],['OH-000141','Anna Keller','Zu versenden','18,90 €'],['OH-000140','Jonas Weber','Versendet','42,50 €']]
export default function Orders(){return <div><div className="admin-page-head"><div><p className="eyebrow">STORE</p><h1>Bestellungen</h1></div></div><div className="admin-panel"><div className="admin-table"><div className="admin-row admin-row--head"><span>Bestellung</span><span>Kunde</span><span>Status</span><span>Total</span></div>{rows.map(r=><div className="admin-row" key={r[0]}>{r.map((x,j)=><span key={j}>{j===2?<b className="status">{x}</b>:x}</span>)}</div>)}</div></div></div>}

