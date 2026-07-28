import React, { useState, useEffect, useMemo, useRef } from 'react';
import { store } from './firebase.js';

const C = {
  bg: '#EDECE5', surface: '#FFFFFF', ink: '#20242B', inkSoft: '#6B7280',
  yellow: '#F4B400', yellowDark: '#B9860A', red: '#C6403A', redSoft: '#F8DFDD',
  green: '#2F7D4F', greenSoft: '#DEEEE2', line: '#DAD8CE',
};

const CHECK_ITEMS = [
  'Corredor organizado','Caixas para fora','Corredor limpo','Vidros tombados',
  'Vidros sem fitas','Vidros em excesso','Caixas avariadas','Teia de aranha',
  'Escadas conformes','Vidros sem separador','Caixas tombadas','Peças caídas','Endereços corretos',
];

function initItems() {
  return CHECK_ITEMS.map((name) => ({ name, status: null, photo: null }));
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function compressImage(file, maxW = 560, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Firebase usa chaves sem '.', ':' etc. Trocamos por um separador seguro.
function safeKey(id) { return `photos_${id}`; }

function StatusPill({ status }) {
  if (status === 'Conforme') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold" style={{background:C.greenSoft,color:C.green}}>✔ Conforme</span>;
  if (status === 'Não conforme') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold" style={{background:C.redSoft,color:C.red}}>⚠ Não conforme</span>;
  return <span className="text-xs" style={{color:C.inkSoft}}>—</span>;
}

export default function App() {
  const [view, setView] = useState('audit');
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [unit, setUnit] = useState('MG25');
  const [corridor, setCorridor] = useState('');
  const [auditor, setAuditor] = useState('');
  const [items, setItems] = useState(initItems());

  useEffect(() => {
    (async () => {
      try {
        const data = await store.get('audits');
        setAudits(data ? Object.values(data) : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const showToast = (msg, kind = 'ok') => { setToast({msg,kind}); setTimeout(()=>setToast(null),2800); };
  const setItemStatus = (name, status) => setItems(p => p.map(it => it.name===name ? {...it,status} : it));
  const setItemPhoto = async (name, file) => {
    if (!file) return;
    try { const dataUrl = await compressImage(file); setItems(p => p.map(it => it.name===name ? {...it,photo:dataUrl} : it)); }
    catch (e) { showToast('Não foi possível processar a foto.', 'err'); }
  };
  const removePhoto = (name) => setItems(p => p.map(it => it.name===name ? {...it,photo:null} : it));
  const answeredCount = items.filter(i => i.status).length;
  const resetForm = () => { setCorridor(''); setItems(initItems()); };

  const saveAudit = async () => {
    if (!unit.trim() || !corridor.trim()) { showToast('Informe a unidade e o corredor.', 'err'); return; }
    if (answeredCount < CHECK_ITEMS.length) { showToast(`Faltam ${CHECK_ITEMS.length - answeredCount} itens para responder.`, 'err'); return; }
    setSaving(true);
    try {
      const id = uid();
      const nonConformCount = items.filter(i => i.status === 'Não conforme').length;
      const photoMap = {};
      items.forEach(i => { if (i.photo) photoMap[i.name] = i.photo; });
      const leanAudit = {
        id, unit: unit.trim(), corridor: corridor.trim(), auditor: auditor.trim() || null,
        date: new Date().toISOString(),
        items: items.map(i => ({ name: i.name, status: i.status, hasPhoto: !!i.photo })),
        nonConformCount, total: CHECK_ITEMS.length,
      };
      const nextMap = { ...(await store.get('audits') || {}), [id]: leanAudit };
      await store.set('audits', nextMap);
      if (Object.keys(photoMap).length > 0) await store.set(safeKey(id), photoMap);
      setAudits(Object.values(nextMap));
      resetForm();
      showToast('Auditoria registrada com sucesso.', 'ok');
    } catch (e) {
      console.error(e);
      showToast('Erro ao salvar. Confira a configuração do Firebase.', 'err');
    } finally { setSaving(false); }
  };

  const deleteAudit = async (id) => {
    try {
      const current = await store.get('audits') || {};
      delete current[id];
      await store.set('audits', current);
      await store.remove(safeKey(id));
      setAudits(Object.values(current));
      showToast('Auditoria removida.', 'ok');
    } catch (e) {
      showToast('Erro ao remover.', 'err');
    }
  };

  const knownUnits = useMemo(() => { const s = new Set(audits.map(a=>a.unit)); s.add('MG25'); return Array.from(s).sort(); }, [audits]);
  const knownCorridors = useMemo(() => Array.from(new Set(audits.filter(a=>a.unit===unit).map(a=>a.corridor))).sort(), [audits, unit]);

  if (loading) {
    return <div className="w-full flex items-center justify-center p-10" style={{background:C.bg,minHeight:'100vh',color:C.inkSoft}}>Carregando auditorias...</div>;
  }

  return (
    <div style={{background:C.bg,minHeight:'100vh',color:C.ink}}>
      <div style={{background:C.ink}} className="px-5 pt-5 pb-0">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <div className="disp text-white" style={{fontSize:34,lineHeight:1}}>AUDITORIA 5S</div>
            <div className="mono text-xs mt-1" style={{color:C.yellow}}>CONTROLE DE CORREDORES · REDE DE UNIDADES</div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto flex gap-1 pt-4">
          {[['audit','Nova auditoria'],['dashboard','Painel'],['history','Histórico']].map(([k,label]) => (
            <button key={k} onClick={()=>setView(k)} className="px-4 py-2.5 text-sm font-semibold rounded-t"
              style={{background: view===k ? C.bg : 'transparent', color: view===k ? C.ink : '#ffffffaa'}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-6">
        {view === 'audit' && (
          <AuditForm unit={unit} setUnit={setUnit} corridor={corridor} setCorridor={setCorridor}
            auditor={auditor} setAuditor={setAuditor} items={items} setItemStatus={setItemStatus}
            setItemPhoto={setItemPhoto} removePhoto={removePhoto} answeredCount={answeredCount}
            saving={saving} onSave={saveAudit} knownUnits={knownUnits} knownCorridors={knownCorridors} />
        )}
        {view === 'dashboard' && <Dashboard audits={audits} />}
        {view === 'history' && <HistoryView audits={audits} onDelete={deleteAudit} />}
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-3 rounded shadow-lg text-sm font-medium"
          style={{background: toast.kind==='err' ? C.red : C.ink, color:'#fff'}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function AuditForm({unit,setUnit,corridor,setCorridor,auditor,setAuditor,items,setItemStatus,setItemPhoto,removePhoto,answeredCount,saving,onSave,knownUnits,knownCorridors}) {
  return (
    <div>
      <div className="rounded-lg p-5 mb-5" style={{background:C.surface,border:`1px solid ${C.line}`}}>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 mono" style={{color:C.inkSoft}}>UNIDADE</label>
            <input list="units-list" value={unit} onChange={e=>setUnit(e.target.value)} placeholder="Ex.: MG25"
              className="w-full px-3 py-2 rounded border text-sm font-semibold" style={{borderColor:C.line}} />
            <datalist id="units-list">{knownUnits.map(u=><option key={u} value={u}/>)}</datalist>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 mono" style={{color:C.inkSoft}}>CORREDOR / LOCAL</label>
            <input list="corridors-list" value={corridor} onChange={e=>setCorridor(e.target.value)} placeholder="Ex.: Corredor A1"
              className="w-full px-3 py-2 rounded border text-sm" style={{borderColor:C.line}} />
            <datalist id="corridors-list">{knownCorridors.map(c=><option key={c} value={c}/>)}</datalist>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 mono" style={{color:C.inkSoft}}>AUDITOR (OPCIONAL)</label>
            <input value={auditor} onChange={e=>setAuditor(e.target.value)} placeholder="Seu nome"
              className="w-full px-3 py-2 rounded border text-sm" style={{borderColor:C.line}} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="disp" style={{fontSize:22}}>CHECKLIST</div>
        <div className="text-sm font-semibold mono" style={{color: answeredCount===CHECK_ITEMS.length ? C.green : C.inkSoft}}>
          {answeredCount}/{CHECK_ITEMS.length} respondidos
        </div>
      </div>

      <div className="space-y-2 mb-6">
        {items.map(it => <ChecklistRow key={it.name} item={it} onStatus={setItemStatus} onPhoto={setItemPhoto} onRemovePhoto={removePhoto} />)}
      </div>

      <button onClick={onSave} disabled={saving}
        className="w-full sm:w-auto px-6 py-3 rounded font-bold text-sm"
        style={{background:C.yellow,color:C.ink}}>
        {saving ? 'Salvando...' : '✔ Salvar auditoria'}
      </button>
    </div>
  );
}

function ChecklistRow({item,onStatus,onPhoto,onRemovePhoto}) {
  const fileInputRef = useRef(null);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded" style={{background:C.surface,border:`1px solid ${C.line}`}}>
      <div className="flex-1 text-sm font-semibold">{item.name}</div>
      <div className="flex items-center gap-2">
        <button onClick={()=>onStatus(item.name,'Conforme')} className="px-3 py-1.5 rounded text-xs font-bold"
          style={{background: item.status==='Conforme'?C.green:C.greenSoft, color: item.status==='Conforme'?'#fff':C.green}}>
          ✔ Conforme
        </button>
        <button onClick={()=>onStatus(item.name,'Não conforme')} className="px-3 py-1.5 rounded text-xs font-bold"
          style={{background: item.status==='Não conforme'?C.red:C.redSoft, color: item.status==='Não conforme'?'#fff':C.red}}>
          ⚠ Não conforme
        </button>
        {item.photo ? (
          <div className="relative">
            <img src={item.photo} className="w-10 h-10 object-cover rounded" style={{border:`1px solid ${C.line}`}} />
            <button onClick={()=>onRemovePhoto(item.name)} className="absolute -top-1.5 -right-1.5 rounded-full flex items-center justify-center"
              style={{background:C.ink,width:16,height:16,color:'#fff',fontSize:10,lineHeight:1}}>✕</button>
          </div>
        ) : (
          <>
            <button type="button" onClick={()=>fileInputRef.current && fileInputRef.current.click()}
              className="px-2.5 py-1.5 rounded text-xs font-semibold" style={{background:C.bg,color:C.inkSoft,border:`1px solid ${C.line}`}}>
              📷 Foto
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}}
              onChange={e => { const f = e.target.files && e.target.files[0]; onPhoto(item.name, f); e.target.value=''; }} />
          </>
        )}
      </div>
    </div>
  );
}

function periodFilter(dateIso, period) {
  const days = (new Date() - new Date(dateIso)) / 86400000;
  if (period==='week') return days<=7;
  if (period==='month') return days<=30;
  return true;
}

function Bar({label,rate,extra}) {
  const color = rate>=30 ? C.red : rate>0 ? C.yellow : C.line;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs font-semibold mb-1"><span>{label}</span><span>{rate}% {extra||''}</span></div>
      <div style={{background:C.bg,borderRadius:4,height:10,overflow:'hidden'}}>
        <div style={{width:`${rate}%`,background:color,height:'100%'}}/>
      </div>
    </div>
  );
}

function Dashboard({audits}) {
  const [period, setPeriod] = useState('month');
  const [unitFilter, setUnitFilter] = useState('Todas');
  const units = useMemo(()=>['Todas',...Array.from(new Set(audits.map(a=>a.unit))).sort()],[audits]);
  const filtered = useMemo(()=>audits.filter(a=>periodFilter(a.date,period) && (unitFilter==='Todas'||a.unit===unitFilter)),[audits,period,unitFilter]);
  const totalAnswered = filtered.reduce((s,a)=>s+a.total,0);
  const totalNonConform = filtered.reduce((s,a)=>s+a.nonConformCount,0);
  const conformityRate = totalAnswered ? Math.round(((totalAnswered-totalNonConform)/totalAnswered)*100) : null;

  const byItem = useMemo(()=>{
    const map = {};
    CHECK_ITEMS.forEach(name => map[name] = {name,nc:0,total:0});
    filtered.forEach(a => a.items.forEach(it => {
      if (!map[it.name]) map[it.name] = {name:it.name,nc:0,total:0};
      map[it.name].total++; if (it.status==='Não conforme') map[it.name].nc++;
    }));
    return Object.values(map).map(r=>({...r,rate: r.total ? Math.round((r.nc/r.total)*100):0})).sort((a,b)=>b.rate-a.rate);
  },[filtered]);

  const byCorridor = useMemo(()=>{
    const map = {};
    filtered.forEach(a => {
      const key = `${a.unit} · ${a.corridor}`;
      if (!map[key]) map[key] = {key,nc:0,total:0,audits:0};
      map[key].nc += a.nonConformCount; map[key].total += a.total; map[key].audits++;
    });
    return Object.values(map).map(r=>({...r,rate: r.total ? Math.round((r.nc/r.total)*100):0})).sort((a,b)=>b.rate-a.rate);
  },[filtered]);

  const critical = byCorridor.filter(c=>c.rate>=30||c.nc>=5).slice(0,8);

  if (audits.length===0) return <div className="text-center py-16" style={{color:C.inkSoft}}>Nenhuma auditoria registrada ainda.</div>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex rounded overflow-hidden border" style={{borderColor:C.line}}>
          {[['week','Semana'],['month','Mês'],['all','Tudo']].map(([k,label])=>(
            <button key={k} onClick={()=>setPeriod(k)} className="px-3 py-1.5 text-xs font-bold"
              style={{background: period===k?C.ink:C.surface, color: period===k?'#fff':C.ink}}>{label}</button>
          ))}
        </div>
        <select value={unitFilter} onChange={e=>setUnitFilter(e.target.value)} className="px-3 py-1.5 rounded border text-xs font-bold" style={{borderColor:C.line}}>
          {units.map(u=><option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg p-4" style={{background:C.surface,border:`1px solid ${C.line}`}}>
          <div className="text-xs font-bold mono mb-1" style={{color:C.inkSoft}}>TAXA DE CONFORMIDADE</div>
          <div className="disp" style={{fontSize:36,lineHeight:1,color: conformityRate===null?C.inkSoft:conformityRate>=80?C.green:conformityRate>=60?C.yellowDark:C.red}}>
            {conformityRate===null?'—':`${conformityRate}%`}
          </div>
        </div>
        <div className="rounded-lg p-4" style={{background:C.surface,border:`1px solid ${C.line}`}}>
          <div className="text-xs font-bold mono mb-1" style={{color:C.inkSoft}}>NÃO CONFORMIDADES</div>
          <div className="disp" style={{fontSize:36,lineHeight:1,color:C.red}}>{totalNonConform}</div>
        </div>
        <div className="rounded-lg p-4" style={{background:C.surface,border:`1px solid ${C.line}`}}>
          <div className="text-xs font-bold mono mb-1" style={{color:C.inkSoft}}>CORREDORES CRÍTICOS</div>
          <div className="disp" style={{fontSize:36,lineHeight:1,color: critical.length?C.red:C.green}}>{critical.length}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-lg p-4" style={{background:C.surface,border:`1px solid ${C.line}`}}>
          <div className="text-sm font-bold mb-3">Não conformidade por item</div>
          {byItem.map(r => <Bar key={r.name} label={r.name} rate={r.rate} />)}
        </div>
        <div className="rounded-lg p-4" style={{background:C.surface,border:`1px solid ${C.line}`}}>
          <div className="text-sm font-bold mb-3">Ranking de corredores</div>
          {byCorridor.slice(0,8).map(r => <Bar key={r.key} label={r.key} rate={r.rate} extra={`(${r.nc}/${r.total})`} />)}
        </div>
      </div>
    </div>
  );
}

function HistoryView({audits,onDelete}) {
  const [expanded, setExpanded] = useState(null);
  const [photos, setPhotos] = useState({});
  const sorted = useMemo(()=>[...audits].sort((a,b)=>new Date(b.date)-new Date(a.date)),[audits]);

  const toggle = async (a) => {
    if (expanded===a.id) { setExpanded(null); return; }
    setExpanded(a.id);
    if (a.items.some(i=>i.hasPhoto) && !photos[a.id]) {
      const data = await store.get(safeKey(a.id));
      setPhotos(p => ({...p, [a.id]: data || {}}));
    }
  };

  if (sorted.length===0) return <div className="text-center py-16" style={{color:C.inkSoft}}>Nenhuma auditoria registrada ainda.</div>;

  return (
    <div className="space-y-2">
      {sorted.map(a => (
        <div key={a.id} className="rounded-lg overflow-hidden" style={{background:C.surface,border:`1px solid ${C.line}`}}>
          <button onClick={()=>toggle(a)} className="w-full flex items-center justify-between px-4 py-3 text-left">
            <div>
              <div className="font-bold text-sm">{a.unit} · {a.corridor}</div>
              <div className="text-xs mono" style={{color:C.inkSoft}}>{fmtDate(a.date)} {a.auditor?`· ${a.auditor}`:''}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-2 py-1 rounded" style={{background: a.nonConformCount?C.redSoft:C.greenSoft, color: a.nonConformCount?C.red:C.green}}>
                {a.nonConformCount} N/C de {a.total}
              </span>
              <span onClick={(e)=>{e.stopPropagation(); onDelete(a.id);}} className="p-1" style={{color:C.inkSoft,cursor:'pointer'}}>🗑</span>
            </div>
          </button>
          {expanded===a.id && (
            <div className="px-4 pb-4 pt-1 space-y-1.5" style={{borderTop:`1px solid ${C.line}`}}>
              {a.items.map(it => (
                <div key={it.name} className="flex items-center justify-between text-sm py-1">
                  <span>{it.name}</span>
                  <div className="flex items-center gap-2">
                    <StatusPill status={it.status} />
                    {it.hasPhoto && photos[a.id] && photos[a.id][it.name] && (
                      <img src={photos[a.id][it.name]} className="w-9 h-9 object-cover rounded" style={{border:`1px solid ${C.line}`}} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
