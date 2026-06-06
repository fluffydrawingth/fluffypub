import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';

export default function LoginPage() {
  const { login, register, user, loading } = useAuth();
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<'login'|'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'customer'|'artist'>('customer');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const p = theme.primaryColor;

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate(user.role === 'admin' ? '/admin' : user.role === 'artist' ? '/artist-dashboard' : '/account');
    }
  }, [user, loading]);

  const submit = async () => {
    setError(''); setBusy(true);
    let result;
    if (tab === 'login') {
      if (!email || !password) { setError('Email and password required.'); setBusy(false); return; }
      result = await login(email, password);
    } else {
      if (!name || !email || !password) { setError('All fields required.'); setBusy(false); return; }
      result = await register(name, email, password, role);
    }
    setBusy(false);
    if (result.success) {
      // useEffect above will redirect
    } else {
      setError(result.error || 'Something went wrong.');
    }
  };

  const inp = (val: string, set: (v:string)=>void, placeholder: string, type='text') => (
    <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={placeholder}
      onKeyDown={e=>e.key==='Enter'&&submit()}
      style={{ width:'100%', padding:'12px 16px', borderRadius:13, border:`2px solid ${p}30`, fontSize:15, outline:'none', fontFamily:theme.fontFamily, boxSizing:'border-box', marginBottom:14 }}
      onFocus={e=>(e.target.style.borderColor=p)}
      onBlur={e=>(e.target.style.borderColor=p+'30')}
    />
  );

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:`linear-gradient(135deg, ${theme.bgColor}, ${theme.bgColor2})`, fontFamily:theme.fontFamily, padding:24, position:'relative', overflow:'hidden' }}>
      {['🌸','✨','🐰','🎀','💕','🌺'].map((e,i)=>(
        <span key={i} style={{ position:'absolute', top:`${10+(i*14)%70}%`, left:`${5+(i*17)%90}%`, fontSize:`${18+(i*5)%14}px`, opacity:0.18, pointerEvents:'none' }}>{e}</span>
      ))}
      <div style={{ background:'white', borderRadius:28, padding:'44px 40px', width:'100%', maxWidth:420, boxShadow:`0 24px 64px ${p}18, 0 8px 24px rgba(0,0,0,0.08)`, position:'relative', zIndex:1, border:`1.5px solid ${p}18` }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:42, marginBottom:10 }}>{theme.logoEmoji}</div>
          <div style={{ fontSize:22, fontWeight:900, color:p, marginBottom:4 }}>{theme.logoText}</div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:`${p}10`, borderRadius:14, padding:4, marginBottom:24 }}>
          {(['login','register'] as const).map(t=>(
            <button key={t} onClick={()=>{setTab(t);setError('');}} style={{ flex:1, padding:'9px', borderRadius:11, border:'none', cursor:'pointer', fontSize:14, fontWeight:700, background:tab===t?'white':'transparent', color:tab===t?p:theme.textColor+'88', boxShadow:tab===t?'0 2px 8px rgba(0,0,0,0.08)':'none', fontFamily:theme.fontFamily }}>
              {t==='login'?'Sign In':'Create Account'}
            </button>
          ))}
        </div>

        {tab==='register' && <>
          {inp(name, setName, 'Full Name')}
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {(['customer','artist'] as const).map(r=>(
              <button key={r} onClick={()=>setRole(r)} style={{ flex:1, padding:'10px', borderRadius:12, border:`2px solid ${role===r?p:p+'30'}`, background:role===r?p+'12':'white', color:role===r?p:theme.textColor+'88', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:theme.fontFamily }}>
                {r==='customer'?'🛒 Customer':'🎨 Artist'}
              </button>
            ))}
          </div>
        </>}

        {inp(email, setEmail, tab==='login'?'Email address':'Email address', 'email')}

        <div style={{ position:'relative', marginBottom:20 }}>
          <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
            placeholder="Password" onKeyDown={e=>e.key==='Enter'&&submit()}
            style={{ width:'100%', padding:'12px 46px 12px 16px', borderRadius:13, border:`2px solid ${p}30`, fontSize:15, outline:'none', fontFamily:theme.fontFamily, boxSizing:'border-box' }}
            onFocus={e=>(e.target.style.borderColor=p)} onBlur={e=>(e.target.style.borderColor=p+'30')}
          />
          <button type="button" onClick={()=>setShowPw(x=>!x)} style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16, padding:0 }}>{showPw?'🙈':'👁️'}</button>
        </div>

        {error && <div style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:11, padding:'9px 13px', marginBottom:16, fontSize:13, color:'#dc2626', fontWeight:600 }}>⚠️ {error}</div>}

        <button onClick={submit} disabled={busy} style={{ width:'100%', padding:'14px', background:busy?p+'88':p, color:'white', border:'none', cursor:busy?'wait':'pointer', borderRadius:15, fontSize:15, fontWeight:800, fontFamily:theme.fontFamily, boxShadow:`0 8px 24px ${p}44`, marginBottom:14 }}>
          {busy?'⏳ Please wait...':(tab==='login'?'🔓 Sign In':'✨ Create Account')}
        </button>

        <div style={{ textAlign:'center' }}>
          <button onClick={()=>navigate('/')} style={{ background:'none', border:'none', cursor:'pointer', color:theme.textColor+'55', fontSize:13, fontFamily:theme.fontFamily }}>← Back to Store</button>
        </div>

        {/* Demo credentials */}
        <div style={{ marginTop:20, padding:'12px 14px', background:'#f8fafc', borderRadius:12, fontSize:11, color:'#64748b', lineHeight:1.6 }}>
          <strong>Demo accounts:</strong><br/>
          Admin: admin@fluffypub.com / fluffyadmin2026<br/>
          Artist: artist@mochi.art / mochiartist<br/>
          Customer: customer@test.com / customer123
        </div>
      </div>
    </div>
  );
}
