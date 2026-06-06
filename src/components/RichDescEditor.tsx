import React, { useState } from 'react';
import ImageUpload from './ImageUpload';

export type Block = 
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'heading'; content: string; level: 1|2|3 }
  | { id: string; type: 'bullets'; items: string[] }
  | { id: string; type: 'image'; url: string; caption: string }
  | { id: string; type: 'image_text'; url: string; caption: string; text: string; imageLeft: boolean };

const P = '#f472b6';
const uid = () => Math.random().toString(36).slice(2);

function BlockEditor({ block, onChange, onDelete, onMove, isFirst, isLast }: any) {
  const btnStyle = (color='#374151', bg='white', border='#e5e7eb') => ({
    padding:'4px 10px', borderRadius:7, border:`1px solid ${border}`, background:bg,
    cursor:'pointer', fontSize:11, fontWeight:600, color, fontFamily:'inherit',
  });
  const ta = (val:string, set:(v:string)=>void, rows=3, placeholder='') => (
    <textarea value={val} onChange={e=>set(e.target.value)} rows={rows} placeholder={placeholder}
      style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', fontFamily:'inherit', resize:'vertical' as const, boxSizing:'border-box' as const }}
      onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'}
    />
  );

  return (
    <div style={{ background:'#fafafa', borderRadius:12, padding:'14px 16px', border:'1px solid #f3f4f6', marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' as const, letterSpacing:0.5 }}>
          {block.type === 'text' ? '📝 Text' : block.type === 'heading' ? '🔤 Heading' : block.type === 'bullets' ? '• Bullets' : block.type === 'image' ? '🖼️ Image' : '🖼️+📝 Image & Text'}
        </span>
        <div style={{ display:'flex', gap:4 }}>
          <button onClick={()=>onMove(-1)} disabled={isFirst} style={{...btnStyle(), opacity:isFirst?0.4:1}}>↑</button>
          <button onClick={()=>onMove(1)} disabled={isLast} style={{...btnStyle(), opacity:isLast?0.4:1}}>↓</button>
          <button onClick={onDelete} style={btnStyle('#ef4444','#fef2f2','#fca5a5')}>Delete</button>
        </div>
      </div>

      {block.type === 'text' && ta(block.content, v=>onChange({...block,content:v}), 4, 'Write text content...')}

      {block.type === 'heading' && (
        <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:8 }}>
          <select value={block.level} onChange={e=>onChange({...block,level:parseInt(e.target.value)})} style={{ padding:'8px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none' }}>
            <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option>
          </select>
          <input value={block.content} onChange={e=>onChange({...block,content:e.target.value})} placeholder="Heading text..."
            style={{ padding:'8px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', fontFamily:'inherit' }} />
        </div>
      )}

      {block.type === 'bullets' && (
        <div>
          {block.items.map((item:string, i:number) => (
            <div key={i} style={{ display:'flex', gap:6, marginBottom:6 }}>
              <span style={{ paddingTop:8, color:P }}>•</span>
              <input value={item} onChange={e=>{const items=[...block.items];items[i]=e.target.value;onChange({...block,items});}}
                placeholder={`Bullet ${i+1}`}
                style={{ flex:1, padding:'7px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', fontFamily:'inherit' }} />
              <button onClick={()=>{const items=block.items.filter((_:any,j:number)=>j!==i);onChange({...block,items});}} style={btnStyle('#ef4444','#fef2f2','#fca5a5')}>✕</button>
            </div>
          ))}
          <button onClick={()=>onChange({...block,items:[...block.items,'']})} style={{...btnStyle(P,'#fdf2f8',P+'40'), marginTop:4}}>+ Add bullet</button>
        </div>
      )}

      {block.type === 'image' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <ImageUpload label="Image" value={block.url} onChange={v=>onChange({...block,url:v})} folder="products" />
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Caption</label>
            <input value={block.caption} onChange={e=>onChange({...block,caption:e.target.value})} placeholder="Image caption..."
              style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const }} />
          </div>
        </div>
      )}

      {block.type === 'image_text' && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:10 }}>
            <button onClick={()=>onChange({...block,imageLeft:true})} style={btnStyle(block.imageLeft?'white':P, block.imageLeft?P:'white', P)}>Image Left</button>
            <button onClick={()=>onChange({...block,imageLeft:false})} style={btnStyle(!block.imageLeft?'white':P, !block.imageLeft?P:'white', P)}>Image Right</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <ImageUpload label="Image" value={block.url} onChange={v=>onChange({...block,url:v})} folder="products" />
            {ta(block.text, v=>onChange({...block,text:v}), 5, 'Text content alongside image...')}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

export default function RichDescEditor({ blocks, onChange }: Props) {
  const addBlock = (type: Block['type']) => {
    let b: Block;
    if (type === 'text') b = { id:uid(), type:'text', content:'' };
    else if (type === 'heading') b = { id:uid(), type:'heading', content:'', level:2 };
    else if (type === 'bullets') b = { id:uid(), type:'bullets', items:[''] };
    else if (type === 'image') b = { id:uid(), type:'image', url:'', caption:'' };
    else b = { id:uid(), type:'image_text', url:'', caption:'', text:'', imageLeft:true };
    onChange([...blocks, b]);
  };

  const update = (i:number, b:Block) => { const nb=[...blocks]; nb[i]=b; onChange(nb); };
  const del = (i:number) => onChange(blocks.filter((_,j)=>j!==i));
  const move = (i:number, dir:number) => {
    const nb=[...blocks]; const j=i+dir;
    if(j<0||j>=nb.length) return;
    [nb[i],nb[j]]=[nb[j],nb[i]]; onChange(nb);
  };

  const btnTypes = [
    {type:'text',label:'📝 Text'},
    {type:'heading',label:'🔤 Heading'},
    {type:'bullets',label:'• Bullets'},
    {type:'image',label:'🖼️ Image'},
    {type:'image_text',label:'🖼️+📝 Image & Text'},
  ] as const;

  return (
    <div>
      {blocks.map((b,i) => (
        <BlockEditor key={b.id} block={b} onChange={(nb:Block)=>update(i,nb)} onDelete={()=>del(i)} onMove={(d:number)=>move(i,d)} isFirst={i===0} isLast={i===blocks.length-1} />
      ))}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' as const, marginTop:8 }}>
        <span style={{ fontSize:12, color:'#9ca3af', paddingTop:5, fontWeight:600 }}>Add block:</span>
        {btnTypes.map(({type,label}) => (
          <button key={type} onClick={()=>addBlock(type as Block['type'])} style={{ padding:'5px 12px', borderRadius:8, border:`1.5px solid ${P}30`, background:'#fdf2f8', color:P, cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit' }}>{label}</button>
        ))}
      </div>
    </div>
  );
}

// Renderer for the public product page
export function RichDescRenderer({ blocks }: { blocks: Block[] }) {
  if (!blocks || !blocks.length) return null;
  return (
    <div>
      {blocks.map((b,i) => {
        if (b.type === 'text') return <p key={i} style={{ fontSize:15, lineHeight:1.8, color:'#374151', margin:'0 0 16px' }}>{b.content}</p>;
        if (b.type === 'heading') {
          const fs = b.level===1?22:b.level===2?18:15;
          const fw = b.level===1?900:b.level===2?800:700;
          return <div key={i} style={{ fontSize:fs, fontWeight:fw, color:'#111827', margin:'20px 0 10px' }}>{b.content}</div>;
        }
        if (b.type === 'bullets') return (
          <ul key={i} style={{ paddingLeft:20, margin:'0 0 16px' }}>
            {b.items.map((item,j) => <li key={j} style={{ fontSize:15, lineHeight:1.8, color:'#374151', marginBottom:4 }}>{item}</li>)}
          </ul>
        );
        if (b.type === 'image') return (
          <div key={i} style={{ margin:'16px 0' }}>
            {b.url && <img src={b.url} alt={b.caption} style={{ maxWidth:'100%', borderRadius:12, display:'block' }} />}
            {b.caption && <div style={{ fontSize:12, color:'#9ca3af', marginTop:6, textAlign:'center' as const }}>{b.caption}</div>}
          </div>
        );
        if (b.type === 'image_text') return (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, margin:'16px 0', alignItems:'start', flexDirection:b.imageLeft?'row':'row-reverse' as any }}>
            {b.imageLeft && b.url && <img src={b.url} alt={b.caption} style={{ width:'100%', borderRadius:12 }} />}
            <p style={{ fontSize:15, lineHeight:1.8, color:'#374151', margin:0 }}>{b.text}</p>
            {!b.imageLeft && b.url && <img src={b.url} alt={b.caption} style={{ width:'100%', borderRadius:12 }} />}
          </div>
        );
        return null;
      })}
    </div>
  );
}
