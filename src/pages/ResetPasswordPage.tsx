import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';

export default function ResetPasswordPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  useAuth(); // keep context alive
  const p = theme.primaryColor;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [recoveryTokens, setRecoveryTokens] = useState<{access_token:string, refresh_token:string} | null>(null);

  // Extract tokens from URL hash when arriving from Supabase email link
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token') || '';
    const refresh_token = params.get('refresh_token') || '';
    const type = params.get('type');
    if (access_token && type === 'recovery') {
      setRecoveryTokens({ access_token, refresh_token });
      // Clean URL so tokens aren't stored in browser history
      window.history.replaceState(null, '', window.location.pathname + '#/reset-password');
    }
  }, []);

  const submit = async () => {
    setError('');
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    const r = await fetch('/api/auth?action=update-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        access_token: recoveryTokens?.access_token || '',
        refresh_token: recoveryTokens?.refresh_token || '',
      }),
    });
    const d = await r.json();
    if (r.ok) { setDone(true); setTimeout(() => navigate('/login'), 2500); }
    else setError(d.error || 'Failed to update password.');
    setBusy(false);
  };

  const inp = (val: string, set: (v: string) => void, placeholder: string) => (
    <input type="password" value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
      onKeyDown={e => e.key === 'Enter' && submit()}
      style={{ width:'100%', padding:'12px 16px', borderRadius:13, border:`2px solid ${p}30`, fontSize:15, outline:'none', fontFamily:theme.fontFamily, boxSizing:'border-box' as const, marginBottom:14 }}
      onFocus={e => e.target.style.borderColor = p} onBlur={e => e.target.style.borderColor = p + '30'}
    />
  );

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, fontFamily:theme.fontFamily, padding:24 }}>
      <div style={{ background:'white', borderRadius:28, padding:'44px 40px', width:'100%', maxWidth:400, boxShadow:`0 24px 64px ${p}18`, border:`1.5px solid ${p}18` }}>
        <div style={{ textAlign:'center' as const, marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🔑</div>
          <h2 style={{ fontSize:22, fontWeight:900, color:p, margin:0 }}>Set New Password</h2>
          <p style={{ fontSize:13, color:'#64748b', marginTop:6 }}>Enter your new password below</p>
        </div>

        {done ? (
          <div style={{ background:'#d1fae5', border:'1.5px solid #6ee7b7', borderRadius:14, padding:'16px 18px', textAlign:'center' as const }}>
            <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
            <div style={{ fontWeight:800, color:'#065f46' }}>Password updated!</div>
            <div style={{ fontSize:13, color:'#065f46', marginTop:4 }}>Redirecting to login...</div>
          </div>
        ) : (
          <>
            {inp(password, setPassword, 'New password')}
            {inp(confirm, setConfirm, 'Confirm new password')}
            {error && <div style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:11, padding:'9px 13px', marginBottom:14, fontSize:13, color:'#dc2626', fontWeight:600 }}>⚠️ {error}</div>}
            <button onClick={submit} disabled={busy} style={{ width:'100%', padding:'14px', background:busy?p+'88':p, color:'white', border:'none', cursor:'pointer', borderRadius:15, fontSize:15, fontWeight:800, fontFamily:theme.fontFamily, boxShadow:`0 8px 24px ${p}44` }}>
              {busy ? '⏳ Updating...' : '🔒 Update Password'}
            </button>
          </>
        )}

        <div style={{ textAlign:'center' as const, marginTop:16 }}>
          <button onClick={() => navigate('/login')} style={{ background:'none', border:'none', cursor:'pointer', color:`${p}88`, fontSize:13, fontFamily:theme.fontFamily }}>← Back to Login</button>
        </div>
      </div>
    </div>
  );
}
