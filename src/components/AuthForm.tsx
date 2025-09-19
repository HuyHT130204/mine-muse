/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import { signInWithEmail, resetPassword } from '@/lib/supabase';

interface Props {
  onSuccess?: () => void;
}

export default function AuthForm({ onSuccess }: Props) {
  const [email] = useState('Schofield.eth@gmail.com'); // Fixed email, cannot be changed
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Ensure Dancing Script font is available for the brand title
  useEffect(() => {
    const id = 'mm-dancing-script-font';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap';
      document.head.appendChild(link);
    }
  }, []);
  // Typing effect for the left preview card
  const titleLine1 = 'Bitcoin Mining Content';
  const titleLine2 = 'That Stands Out';
  const bodyFull = 'Clear narratives on hashrate trends, difficulty cycles, fee markets, and miner economics — crafted for professionals in the mining niche.';
  const body2Full = 'Templates include news-style briefs, weekly wrap-ups, data-driven explainers, and platform-ready snippets tailored for Twitter, LinkedIn, and Instagram.';
  const [typedTitle1, setTypedTitle1] = useState('');
  const [typedTitle2, setTypedTitle2] = useState('');
  const [typedBody, setTypedBody] = useState('');
  const [typedBody2, setTypedBody2] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // Lightweight canvas animation: floating coins and $ signs with parallax
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const context = ctx as CanvasRenderingContext2D;
    let raf = 0;
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    context.scale(devicePixelRatio, devicePixelRatio);
    type Particle = { x: number; y: number; z: number; s: number; vx: number; vy: number; rot: number; vr: number; type: 'coin' | 'dollar' };
    const particles: Particle[] = Array.from({ length: 36 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 1 + 0.5,
      s: Math.random() * 0.8 + 0.6,
      vx: (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1),
      vy: Math.random() * 0.4 + 0.2,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.02,
      type: Math.random() < 0.5 ? 'coin' : 'dollar',
    }));

    function drawCoin(x: number, y: number, scale: number, rot: number) {
      const r = 10 * scale;
      const grd = context.createLinearGradient(x - r, y - r, x + r, y + r);
      grd.addColorStop(0, '#F9C86E');
      grd.addColorStop(1, '#F7931A');
      context.save();
      context.translate(x, y);
      context.rotate(rot);
      context.fillStyle = grd;
      context.beginPath();
      context.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(0,0,0,0.15)';
      context.font = `${9 * scale}px system-ui, -apple-system, Segoe UI, Roboto`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('₿', 0, 0);
      context.restore();
    }

    function drawDollar(x: number, y: number, scale: number, rot: number) {
      context.save();
      context.translate(x, y);
      context.rotate(rot);
      context.fillStyle = 'rgba(34,197,94,0.12)';
      context.strokeStyle = '#22c55e';
      context.lineWidth = 1;
      context.beginPath();
      const w = 16 * scale, h = 10 * scale;
      const anyCtx = context as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r?: number) => void };
      if (typeof anyCtx.roundRect === 'function') {
        anyCtx.roundRect(-w / 2, -h / 2, w, h, 3 * scale);
      } else {
        context.rect(-w / 2, -h / 2, w, h);
      }
      context.fill();
      context.stroke();
      context.fillStyle = '#16a34a';
      context.font = `${8 * scale}px system-ui, -apple-system, Segoe UI, Roboto`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('$', 0, 0);
      context.restore();
    }

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      context.scale(devicePixelRatio, devicePixelRatio);
    };
    const onResize = () => { resize(); };
    window.addEventListener('resize', onResize);

    function tick() {
      context.clearRect(0, 0, width, height);
      // subtle background gradient
      const g = context.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, 'rgba(147,197,253,0.15)');
      g.addColorStop(1, 'rgba(59,130,246,0.06)');
      context.fillStyle = g;
      context.fillRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx * p.z;
        p.y += p.vy * p.z;
        p.rot += p.vr;
        if (p.x < -24) p.x = width + 24;
        if (p.x > width + 24) p.x = -24;
        if (p.y > height + 24) { p.y = -24; p.x = Math.random() * width; }
        const scale = p.s * (0.7 + 0.3 * Math.sin(p.rot * 2));
        if (p.type === 'coin') drawCoin(p.x, p.y, scale, p.rot);
        else drawDollar(p.x, p.y, scale, p.rot);
      }
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  // Typewriter animation
  useEffect(() => {
    let tIdx1 = 0;
    let tIdx2 = 0;
    let bIdx = 0;
    setTypedTitle1('');
    setTypedTitle2('');
    setTypedBody('');
    setIsTyping(true);
    const speedTitle = 22; // ms per char
    const speedBody = 12;
    const speedBody2 = 12;
    let titleTimer: number | undefined;
    let title2Timer: number | undefined;
    let bodyTimer: number | undefined;
    let body2Timer: number | undefined;

    function typeTitle() {
      titleTimer = window.setInterval(() => {
        tIdx1 += 1;
        setTypedTitle1(titleLine1.slice(0, tIdx1));
        if (tIdx1 >= titleLine1.length) {
          window.clearInterval(titleTimer);
          typeTitle2();
        }
      }, speedTitle);
    }

    function typeTitle2() {
      title2Timer = window.setInterval(() => {
        tIdx2 += 1;
        setTypedTitle2(titleLine2.slice(0, tIdx2));
        if (tIdx2 >= titleLine2.length) {
          window.clearInterval(title2Timer);
          typeBody();
        }
      }, speedTitle);
    }

    function typeBody() {
      bodyTimer = window.setInterval(() => {
        bIdx += 1;
        setTypedBody(bodyFull.slice(0, bIdx));
        if (bIdx >= bodyFull.length) {
          window.clearInterval(bodyTimer);
          typeBody2();
        }
      }, speedBody);
    }

    function typeBody2() {
      let b2Idx = 0;
      setTypedBody2('');
      body2Timer = window.setInterval(() => {
        b2Idx += 1;
        setTypedBody2(body2Full.slice(0, b2Idx));
        if (b2Idx >= body2Full.length) {
          window.clearInterval(body2Timer);
          setIsTyping(false);
        }
      }, speedBody2);
    }

    typeTitle();
    return () => { if (titleTimer) window.clearInterval(titleTimer); if (title2Timer) window.clearInterval(title2Timer); if (bodyTimer) window.clearInterval(bodyTimer); if (body2Timer) window.clearInterval(body2Timer); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const { error } = await signInWithEmail(email, password);
      if (error) throw error;
      onSuccess?.();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        const msg = (err as { message?: string }).message || 'Authentication failed';
        setError(msg);
      } else {
        setError('Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setInfo('Password reset email sent to Schofield.eth@gmail.com');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        const msg = (err as { message?: string }).message || 'Failed to send reset email';
        setError(msg);
      } else {
        setError('Failed to send reset email');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] grid grid-cols-1 lg:grid-cols-2 gap-0">
      {/* Left visual panel (like Instagram slideshow) */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-8 xl:p-10 relative overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(ellipse at top left, rgba(59,130,246,0.10), transparent 40%), radial-gradient(ellipse at bottom right, rgba(147,197,253,0.15), transparent 40%)' }} />
        {/* Rotating BTC coin tile */}
        <div className="relative w-full max-w-sm 2xl:max-w-md aspect-[4/5] rounded-[24px] shadow-2xl overflow-hidden border border-gray-200 bg-white animate-[mm-float_8s_ease-in-out_infinite] perspective-[1200px]">
          <div className="h-48 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
            <img src="/bitcoin.png" alt="Bitcoin" className="w-24 h-24 object-contain drop-shadow animate-[spin_9s_linear_infinite]" />
          </div>
          <div className="p-6 space-y-2">
            <h3 className="text-[17px] font-semibold text-gray-900 leading-tight">
              {typedTitle1}
            </h3>
            <div className="text-2xl font-bold text-gray-900 -mt-1">
              {typedTitle2}
              {isTyping && <span className="ml-1 inline-block w-2.5 h-6 bg-gray-400 align-middle animate-pulse" />}
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              {typedBody}
              {(!isTyping && !typedBody) && bodyFull}
            </p>
            {typedBody && (
              <>
                <p className="text-sm leading-relaxed text-gray-600">
                  {typedBody2}
                  {isTyping && typedBody2.length < body2Full.length && (
                    <span className="ml-0.5 inline-block w-2 h-4 bg-gray-400 align-middle animate-pulse" />
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex items-center justify-center py-10 px-6">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="mb-6 text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <img src="/logo.png" alt="Mine‑Muse" className="w-12 h-12 sm:w-14 sm:h-14" />
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900" style={{ fontFamily: 'Dancing Script, system-ui, sans-serif' }}>Mine‑Muse</h1>
            </div>
            <p className="text-sm text-gray-500">Create and repurpose mining content</p>
          </div>

          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
          )}
          {info && (
            <div className="mb-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
              <span>{info}</span>
            </div>
          )}

          {/* Single login form */}
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-lg border border-gray-300/80 bg-gray-50 px-3.5 py-2.5 text-[14px] text-gray-500 cursor-not-allowed"
                  placeholder="Schofield.eth@gmail.com"
                />
                <p className="text-xs text-gray-500 mt-1">This email is fixed and cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300/80 bg-white/90 px-3.5 py-2.5 text-[14px] text-gray-900 placeholder-gray-400 shadow-[inset_0_1px_2px_rgba(16,24,40,0.06)] transition focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 hover:border-gray-400"
                  placeholder="Enter your password"
                  minLength={6}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-2.5 text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-black disabled:opacity-60 transition"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            
            <div className="text-center">
              <button 
                onClick={handleResetPassword}
                disabled={loading}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition disabled:opacity-50"
              >
                Forgot password?
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


