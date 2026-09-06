import type { SaveOrigin } from './saveCelebration';

// Milliseconds: paper burns for exactly 300; loose ink swirls for exactly 600.
export const CEREMONY = { burn: 3400, burnEnd: 3700, goldEnd: 3900, crumbleEnd: 4100, swirlEnd: 4700, end: 4950 };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => 1 - Math.pow(1 - clamp(n), 3);
const signature = new Path2D('M-100 72 C-50 20 -90 125 -55 62 C-36 20 -62 115 -25 68 Q-10 52 -16 82 Q10 46 14 75 Q28 96 44 63 M-110 94 Q-8 78 80 91');

/** Self-contained, pointer-transparent decoration. Returns complete teardown. */
export function playInkCeremony(origin: SaveOrigin): () => void {
    const layer = document.createElement('div');
    Object.assign(layer.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '1600', overflow: 'hidden' });
    const receipt = document.createElement('div');
    receipt.setAttribute('role', 'status');
    receipt.textContent = 'Saved. Signed, sealed, spectacular.';
    Object.assign(receipt.style, { position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: '#263f38', color: '#fff6dc', padding: '12px 20px', borderRadius: '8px', font: '14px Georgia, serif', textAlign: 'center', maxWidth: '80vw' });
    layer.append(receipt);
    document.body.append(layer);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let timer = 0;
    const stop = () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(timer);
        window.removeEventListener('keydown', escape);
        window.removeEventListener('resize', stop);
        reduced.removeEventListener('change', stop);
        layer.remove();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') stop(); };
    window.addEventListener('keydown', escape);
    window.addEventListener('resize', stop, { once: true });
    reduced.addEventListener('change', stop, { once: true });
    if (reduced.matches) {
        receipt.textContent = 'Saved. Signed & sealed.';
        timer = window.setTimeout(stop, 2200);
        return stop;
    }
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, { width: '100%', height: '100%', position: 'absolute', inset: '0' });
    layer.prepend(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) { timer = window.setTimeout(stop, 2200); return stop; }
    const w = window.innerWidth, h = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * ratio; canvas.height = h * ratio;
    const scale = Math.min(1, (w - 24) / 620, (h - 110) / 500);
    const cx = w / 2, cy = h / 2 - 25;
    const target = { x: Math.max(65, Math.min(w - 65, origin.x)), y: Math.max(28, Math.min(h - 65, origin.y)) };
    const ink = document.createElement('canvas'); ink.width = 400; ink.height = 400;
    const ic = ink.getContext('2d')!;
    ic.translate(200, 200);
    const print = (c: CanvasRenderingContext2D, signed: number, stamped: boolean) => {
        c.fillStyle = '#201e19'; c.strokeStyle = '#201e19';
        c.textAlign = 'center'; c.font = '11px Georgia'; c.fillText('THE PERSONAL STATIONERY ARCHIVE', 0, -115);
        c.font = 'bold 29px Georgia'; c.fillText('An inky agreement', 0, -74);
        c.font = 'italic 13px Georgia'; c.fillText('Let it be indelibly known:', 0, -42);
        c.font = '12px Georgia'; c.fillText('This collection is ridiculously well kept.', 0, -16);
        c.fillText('No nib shall be left behind.', 0, 5);
        c.lineWidth = .6; c.strokeRect(-154, -141, 308, 278);
        c.beginPath(); c.moveTo(-126, 105); c.lineTo(116, 105); c.stroke();
        c.font = '9px Georgia'; c.fillText('SIGNED WITH ENTIRELY UNNECESSARY CEREMONY', 0, 123);
        c.save(); c.beginPath(); c.rect(-120, 22, 225 * signed, 82); c.clip();
        c.lineWidth = 2.6; c.lineCap = 'round'; c.stroke(signature); c.restore();
        if (stamped) {
            c.save(); c.translate(64, 66); c.rotate(-.12); c.lineWidth = 3;
            c.strokeRect(-24, -24, 48, 48); c.strokeRect(-19, -19, 38, 38);
            c.font = 'bold 13px Georgia'; c.fillText('INK', 0, -2); c.fillText('& NIB', 0, 13);
            c.restore();
        }
    };
    print(ic, 1, true);
    const pixels = ic.getImageData(0, 0, 400, 400).data;
    const particles: { x: number; y: number; seed: number }[] = [];
    for (let y = 40; y < 340; y += 3) for (let x = 35; x < 365; x += 3) {
        if (pixels[(y * 400 + x) * 4 + 3] > 90) particles.push({ x: x - 200, y: y - 200, seed: ((x * 37 + y * 71) % 997) / 997 });
    }
    const start = performance.now();
    function draw(now: number) {
        if (!ctx) return;
        const t = now - start;
        if (t >= CEREMONY.end) { stop(); return; }
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, w, h);
        // A soft pool of lamplight, without blocking the collection underneath.
        const glow = ctx.createRadialGradient(cx, cy, 40, cx, cy, 360 * scale);
        glow.addColorStop(0, '#f6ecdfe8'); glow.addColorStop(1, '#f6ecdf00');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
        ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale);
        const entry = ease(t / 380);
        ctx.translate(0, (1 - entry) * 380); ctx.rotate((1 - entry) * -.18);
        if (t < CEREMONY.burnEnd) {
            const burn = clamp((t - CEREMONY.burn) / 300);
            ctx.save();
            ctx.beginPath();
            for (let x = -174; x <= 174; x += 6) {
                const y = -163 + 328 * burn + (burn > 0 ? Math.sin(x * .19) * 5 + Math.cos(x * .37) * 3 : 0);
                if (x === -174) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.lineTo(174, 165); ctx.lineTo(-174, 165); ctx.closePath(); ctx.clip();
            ctx.shadowColor = '#30231944'; ctx.shadowBlur = 25; ctx.shadowOffsetY = 12;
            ctx.fillStyle = '#fff6df'; ctx.fillRect(-170, -160, 340, 320); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
            if (burn > 0) {
                const fire = ctx.createLinearGradient(0, -163 + 328 * burn, 0, -135 + 328 * burn);
                fire.addColorStop(0, '#301e15'); fire.addColorStop(.3, '#bc5e1d'); fire.addColorStop(.5, '#ffc96d'); fire.addColorStop(1, '#fff6df');
                ctx.fillStyle = fire; ctx.fillRect(-170, -163 + 328 * burn, 340, 30);
            }
            ctx.restore();
        }
        if (t < CEREMONY.crumbleEnd) {
            ctx.save(); ctx.globalAlpha = 1 - clamp((t - CEREMONY.goldEnd) / 200);
            print(ctx, clamp((t - 500) / 1100), t >= 2770);
            if (t > CEREMONY.burnEnd) {
                // Tint the very same printed marks; paper is already gone.
                ic.globalCompositeOperation = 'source-in'; ic.fillStyle = '#bc8b32'; ic.fillRect(-200, -200, 400, 400);
                ctx.globalAlpha *= clamp((t - CEREMONY.burnEnd) / 200); ctx.drawImage(ink, -200, -200);
            }
            ctx.restore();
        }
        if (t > 2700 && t < 3050) {
            const impact = clamp((t - 2770) / 280);
            ctx.save(); ctx.globalAlpha = 1 - impact; ctx.strokeStyle = '#ad7736'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(64, 86, 30 + impact * 80, 10 + impact * 24, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
        const fly = ease((t - 3100) / 300);
        if (t < 3400) {
            // Lacquered fountain pen follows the signature, then rests beside it.
            const write = clamp((t - 500) / 1100), aside = ease((t - 1600) / 300);
            ctx.save(); ctx.translate(-100 + write * 155 + aside * 155 + fly * 650, 72 + Math.sin(write * 24) * 15 - aside * 125 - fly * 300);
            ctx.rotate(-.62 + aside * 1.8 + fly * 2);
            const pen = ctx.createLinearGradient(-9, 0, 10, 0); pen.addColorStop(0, '#102f2d'); pen.addColorStop(.4, '#52766a'); pen.addColorStop(.6, '#163b36'); pen.addColorStop(1, '#0e2423');
            ctx.fillStyle = pen; ctx.fillRect(-9, -162, 18, 135);
            ctx.fillStyle = '#caa65a'; ctx.fillRect(-10, -150, 20, 5); ctx.fillRect(-10, -39, 20, 7);
            ctx.beginPath(); ctx.moveTo(-9, -27); ctx.lineTo(0, 0); ctx.lineTo(9, -27); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#403523'; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -2); ctx.stroke(); ctx.restore();
            if (t > 1800) {
                // Ink pad arrives with the seal; a lift, deliberate ink-dip, then slam.
                ctx.save(); ctx.translate(-230 - fly * 600, 100 + fly * 200);
                ctx.fillStyle = '#49352c'; ctx.fillRect(-39, -14, 78, 29); ctx.fillStyle = '#9b392d'; ctx.fillRect(-33, -12, 66, 18); ctx.restore();
                let sx = -230, sy = 42;
                if (t < 2050) sy = -280 + ease((t - 1800) / 250) * 322;
                else if (t < 2250) sy = 42 - Math.sin((t - 2050) / 200 * Math.PI) * 65;
                else if (t < 2440) sy = 42 + Math.sin((t - 2250) / 190 * Math.PI) * 45;
                else if (t < 2670) { const p = ease((t - 2440) / 230); sx += 294 * p; sy -= 180 * p; }
                else if (t < 2770) { sx = 64; sy = -138 + Math.pow(clamp((t - 2670) / 100), 3) * 205; }
                else { sx = 64; sy = 67 - ease((t - 2890) / 210) * 145; }
                ctx.save(); ctx.translate(sx + fly * 550, sy - fly * 500); ctx.rotate(fly * 3);
                const wood = ctx.createLinearGradient(-20, 0, 20, 0); wood.addColorStop(0, '#512d26'); wood.addColorStop(.45, '#ae6550'); wood.addColorStop(1, '#67332c');
                ctx.fillStyle = wood; ctx.beginPath(); ctx.roundRect(-22, -86, 44, 90, 10); ctx.fill();
                ctx.fillStyle = '#c7a16b'; ctx.fillRect(-25, -8, 50, 9); ctx.fillStyle = '#9b392d'; ctx.fillRect(-24, 1, 48, 5);
                ctx.fillStyle = '#e2bc86'; ctx.font = '15px Georgia'; ctx.textAlign = 'center'; ctx.fillText('印', 0, -42); ctx.restore();
            }
        }
        ctx.restore();
        if (t >= CEREMONY.goldEnd) {
            const crumble = clamp((t - CEREMONY.goldEnd) / 200);
            const swirl = clamp((t - CEREMONY.crumbleEnd) / 600);
            const pull = ease(swirl);
            // One rising vortex carries smoke and embers into the same button.
            const centerX = cx + (target.x - cx) * pull + Math.sin(swirl * Math.PI * 2) * 65 * (1 - swirl);
            const centerY = cy + (target.y - cy) * pull - Math.sin(swirl * Math.PI) * 120 * scale;
            const position = (p: typeof particles[number], phase: number) => {
                const angle = phase * Math.PI * 3 + Math.sin(p.seed * 31) * Math.sin(phase * Math.PI) * 1.4;
                const shrink = 1 - phase;
                const spread = 1 + Math.sin(phase * Math.PI) * .3;
                return {
                    x: centerX + (p.x * Math.cos(angle) - p.y * Math.sin(angle)) * scale * shrink * spread,
                    y: centerY + (p.x * Math.sin(angle) + p.y * Math.cos(angle)) * scale * shrink * spread,
                };
            };
            // Soft overlapping charcoal curls sit behind the hot fragments.
            // Sample the existing particles to keep the smoke bounded and deterministic.
            for (let i = 0; i < particles.length; i += 28) {
                const p = particles[i];
                const point = position(p, swirl);
                const size = (22 + p.seed * 26) * scale * (1 - swirl);
                if (size < .5) continue;
                const sy = point.y - (8 + p.seed * 20) * (1 - swirl);
                const smoke = ctx.createRadialGradient(point.x, sy, 0, point.x, sy, size);
                smoke.addColorStop(0, '#51453e70');
                smoke.addColorStop(.45, '#7e71654a');
                smoke.addColorStop(1, '#9c8d7b00');
                ctx.globalAlpha = crumble * (1 - swirl);
                ctx.fillStyle = smoke;
                ctx.fillRect(point.x - size, sy - size, size * 2, size * 2);
            }
            for (const p of particles) {
                const { x, y } = position(p, swirl);
                const heat = .65 + .35 * Math.sin(t * .016 + p.seed * 30);
                const size = (1.4 + p.seed * 2.2) * (1 - swirl * .8);
                ctx.globalAlpha = crumble * (1 - Math.pow(swirl, 7));
                if (p.seed > .65) {
                    // An orange halo and pale core distinguish embers from confetti.
                    ctx.fillStyle = `rgba(238, 95, 24, ${heat * .2})`;
                    ctx.beginPath(); ctx.arc(x, y, size * 3, 0, Math.PI * 2); ctx.fill();
                }
                ctx.fillStyle = p.seed > .65 ? '#ffe5a1' : p.seed > .3 ? '#e99332' : '#70412b';
                ctx.save(); ctx.translate(x, y); ctx.rotate(p.seed * 6 + swirl * 9);
                ctx.fillRect(-size / 2, -size / 2, size, size * .6); ctx.restore();
            }
            ctx.globalAlpha = 1;
        }
        ctx.fillStyle = '#263f38'; ctx.beginPath(); ctx.roundRect(target.x - 53, target.y - 19, 106, 38, 8); ctx.fill();
        ctx.strokeStyle = '#c7a35c'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.font = '15px Georgia'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff6df'; ctx.fillText('✓ Saved', target.x, target.y + 5);
        const caption = t < 1800 ? 'Saved. Making it unnecessarily official…' : t < 3100 ? 'The seal of extremely good taste.' : 'Signed, sealed, spectacular.';
        if (receipt.textContent !== caption) receipt.textContent = caption;
        frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return stop;
}
