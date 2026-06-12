import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';

export default function LoginPage() {
  const { login, register, user, loading, resetPassword } = useAuth();
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<'login'|'register'|'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const p = theme.primaryColor;

  // Check for confirmation success in URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('confirmed=1')) {
      setSuccess('✅ Email confirmed! You can now log in.');
      window.location.hash = '/login';
    }
    if (hash.includes('error=confirmation_failed')) {
      setError('Confirmation link expired. Please register again.');
      window.location.hash = '/login';
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate(user.role === 'admin' ? '/admin' : user.role === 'artist' ? '/artist-dashboard' : '/account');
    }
  }, [user, loading]);

  const submit = async () => {
    setError(''); setSuccess(''); setBusy(true);
    if (tab === 'forgot') {
      if (!email) { setError('Please enter your email.'); setBusy(false); return; }
      const result = await resetPassword(email);
      if (result.success) setSuccess('✅ Password reset email sent! Check your inbox.');
      else setError(result.error || 'Failed to send reset email.');
      setBusy(false); return;
    }
    if (tab === 'login') {
      if (!email || !password) { setError('Email and password required.'); setBusy(false); return; }
      const result = await login(email, password);
      if (!result.success) setError(result.error || 'Login failed.');
    } else {
      if (!name || !email || !password) { setError('All fields required.'); setBusy(false); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); setBusy(false); return; }
      const result = await register(name, email, password, 'customer');
      if (result.success) {
        setSuccess('✅ Account created! Check your email for a confirmation link before logging in.');
        setTab('login'); setPassword('');
      } else {
        setError(result.error || 'Registration failed.');
      }
    }
    setBusy(false);
  };

  const inp = (val:string, set:(v:string)=>void, placeholder:string, type='text') => (
    <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={placeholder}
      onKeyDown={e=>e.key==='Enter'&&submit()}
      style={{ width:'100%', padding:'12px 16px', borderRadius:13, border:`2px solid ${p}30`, fontSize:15, outline:'none', fontFamily:theme.fontFamily, boxSizing:'border-box', marginBottom:14 }}
      onFocus={e=>(e.target.style.borderColor=p)} onBlur={e=>(e.target.style.borderColor=p+'30')}
    />
  );

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:`linear-gradient(135deg, ${theme.bgColor}, ${theme.bgColor2})`, fontFamily:theme.fontFamily, padding:24, position:'relative', overflow:'hidden' }}>
      {['🌸','✨','🐰','🎀','💕','🌺'].map((e,i)=>(
        <span key={i} style={{ position:'absolute', top:`${10+(i*14)%70}%`, left:`${5+(i*17)%90}%`, fontSize:`${18+(i*5)%14}px`, opacity:0.18, pointerEvents:'none' }}>{e}</span>
      ))}
      <div style={{ background:'white', borderRadius:28, padding:'44px 40px', width:'100%', maxWidth:420, boxShadow:`0 24px 64px ${p}18, 0 8px 24px rgba(0,0,0,0.08)`, position:'relative', zIndex:1, border:`1.5px solid ${p}18` }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          {theme.logoImageCrop?.croppedDataUrl
            ? <img src={theme.logoImageCrop.croppedDataUrl} style={{ width:54, height:54, borderRadius:'50%', objectFit:'cover', marginBottom:10 }} alt="logo" />
            : <div style={{ fontSize:42, marginBottom:10 }}>{theme.logoEmoji}</div>}
          <div style={{ fontSize:22, fontWeight:900, color:p, marginBottom:4 }}>{theme.logoText}</div>
        </div>

        <div style={{ display:'flex', background:`${p}10`, borderRadius:14, padding:4, marginBottom:24 }}>
          {(['login','register'] as const).map(t=>(
            <button key={t} onClick={()=>{setTab(t as any);setError('');setSuccess('');}} style={{ flex:1, padding:'9px', borderRadius:11, border:'none', cursor:'pointer', fontSize:14, fontWeight:700, background:tab===t?'white':'transparent', color:tab===t?p:theme.textColor+'88', boxShadow:tab===t?'0 2px 8px rgba(0,0,0,0.08)':'none', fontFamily:theme.fontFamily }}>
              {t==='login'?'Sign In':'Create Account'}
            </button>
          ))}
        </div>

        {success && <div style={{ background:'#d1fae5', border:'1.5px solid #6ee7b7', borderRadius:11, padding:'10px 13px', marginBottom:16, fontSize:13, color:'#065f46', fontWeight:600 }}>{success}</div>}

        {tab==='register' && <>
          {inp(name, setName, 'Full Name')}

        </>}

        {inp(email, setEmail, 'Email address', 'email')}

        {tab !== 'forgot' && <div style={{ position:'relative', marginBottom:20 }}>
          <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
            placeholder="Password" onKeyDown={e=>e.key==='Enter'&&submit()}
            style={{ width:'100%', padding:'12px 46px 12px 16px', borderRadius:13, border:`2px solid ${p}30`, fontSize:15, outline:'none', fontFamily:theme.fontFamily, boxSizing:'border-box' }}
            onFocus={e=>(e.target.style.borderColor=p)} onBlur={e=>(e.target.style.borderColor=p+'30')}
          />
          <button type="button" onClick={()=>setShowPw(x=>!x)} style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16, padding:0 }}>{showPw?'🙈':'👁️'}</button>
        </div>}

        {tab==='login' && (
          <div style={{ textAlign:'right' as const, marginTop:-8, marginBottom:16 }}>
            <button onClick={()=>{setTab('forgot');setError('');setSuccess('');}} style={{ background:'none', border:'none', cursor:'pointer', color:p, fontSize:12, fontFamily:theme.fontFamily, fontWeight:600 }}>Forgot password?</button>
          </div>
        )}
        {error && <div style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:11, padding:'9px 13px', marginBottom:16, fontSize:13, color:'#dc2626', fontWeight:600 }}>⚠️ {error}</div>}

        <button onClick={submit} disabled={busy} style={{ width:'100%', padding:'14px', background:busy?p+'88':p, color:'white', border:'none', cursor:busy?'wait':'pointer', borderRadius:15, fontSize:15, fontWeight:800, fontFamily:theme.fontFamily, boxShadow:`0 8px 24px ${p}44`, marginBottom:14 }}>
          {busy?'⏳ Please wait...':(tab==='login'?'🔓 Sign In':tab==='forgot'?'📧 Send Reset Email':'✨ Create Account')}
        </button>

        <div style={{ textAlign:'center' }}>
          <button onClick={()=>navigate('/')} style={{ background:'none', border:'none', cursor:'pointer', color:theme.textColor+'55', fontSize:13, fontFamily:theme.fontFamily }}>← Back to Store</button>
        </div>
      </div>
    </div>
  );
}
