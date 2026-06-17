/* ==========================================================================
   Lishan School Lucky Draw System - Application Logic (app.js)
   Features: Canvas Animation Engine, Web Audio Synthesizer, Web Speech Synthesis,
             and LocalStorage Persistence.
   ========================================================================== */

// --- Default Student List (Realistic Lishan School classes & names) ---
const DEFAULT_STUDENTS = [
    "一年甲班 哈勇．尤命",
    "一年甲班 陳雅筑",
    "二年甲班 莎韻．瓦旦",
    "二年甲班 林俊宏",
    "三年甲班 達利．巴萬",
    "三年甲班 黃子晴",
    "四年甲班 樂信．瓦歷斯",
    "四年甲班 張淑芬",
    "五年甲班 雲力．馬耀",
    "五年甲班 吳家豪",
    "六年甲班 尤幹．瓦旦",
    "六年甲班 曾美玲",
    "七年甲班 亞外．貝林",
    "七年甲班 許志偉",
    "七年甲班 溫宗翰",
    "八年甲班 帖木．巴尚",
    "八年甲班 李佳穎",
    "八年甲班 簡美惠",
    "九年甲班 依萬．波黑",
    "九年甲班 賴建宇",
    "九年甲班 潘小雯",
    "九年甲班 拔旦．馬奈",
    "國小幼兒園 瓦歷斯．尤命",
    "國小幼兒園 廖千惠"
];

// --- Application State ---
const state = {
    students: [],        // Current list of candidate students
    winners: [],         // History of drawn winners: { class, name, prize, time }
    isDrawing: false,    // Whether drawing animation is active
    animationTheme: 'archery', // 'archery' or 'weaving'
    soundEnabled: true,
    ttsEnabled: true
};

// --- Web Audio Helper for Synthesizing Sounds ---
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
            try {
                audioCtx = new AudioCtxClass();
            } catch (e) {
                console.warn("AudioContext initialization failed:", e);
            }
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Play synthesized archery pull sound
function playPullSound() {
    if (!state.soundEnabled) return;
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(140, audioCtx.currentTime + 1.2);
    
    gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 1.2);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.2);
}

// Play synthesized arrow release (whoosh) sound
function playShootSound() {
    if (!state.soundEnabled) return;
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
    
    // Low pass filter to make it sound more like wind/whoosh
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

// Play synthesized success/hit chime
function playHitSound() {
    if (!state.soundEnabled) return;
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    
    // Play a dual chord (harmonious tribal chime)
    const freqs = [329.63, 392.00, 523.25]; // C major triad chord (E4, G4, C5)
    
    freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.6);
    });
}

// Play spinning click sound for wheel
function playClickSound() {
    if (!state.soundEnabled) return;
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}

// --- Text-To-Speech (SpeechSynthesis) Implementation ---
function speakWinnerNotification(studentClass, studentName, prize) {
    if (!state.ttsEnabled) return;
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speeches
        window.speechSynthesis.cancel();
        
        const text = `恭喜，${studentClass}，${studentName}，同學，抽中，${prize}！請記得帶學習單到教務處教學組領取獎品！`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-TW';
        utterance.rate = 0.95; // Slightly slower for clear announcement
        utterance.pitch = 1.0;
        
        window.speechSynthesis.speak(utterance);
    }
}

// --- Canvas Animation Engine ---
const canvas = document.getElementById('lottery-canvas');
const ctx = canvas.getContext('2d');
let animationFrameId = null;

// Adjust Canvas Resolution for Retina Display
function resizeCanvas() {
    const rect = canvas.parentNode.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Particle Class for Sparkles and Embers
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.6) * 8 - 2; // Bias upwards like campfire embers
        this.radius = Math.random() * 4 + 1.5;
        this.alpha = 1;
        this.color = color || `rgba(255, ${Math.floor(Math.random() * 120 + 80)}, 0, `;
        this.decay = Math.random() * 0.02 + 0.015;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.08; // Gravity
        this.alpha -= this.decay;
    }
    
    draw(c) {
        c.save();
        c.globalAlpha = this.alpha;
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = this.color.includes('rgba') ? this.color + this.alpha + ')' : this.color;
        c.shadowBlur = 8;
        c.shadowColor = 'rgba(255, 100, 0, 0.5)';
        c.fill();
        c.restore();
    }
}

// --- Archery Theme Animation Logic ---
let archeryState = {
    arrowX: 0,
    arrowY: 0,
    arrowTargetX: 0,
    arrowTargetY: 0,
    arrowSpeed: 22,
    isArrowFlying: false,
    particles: [],
    bowPullProgress: 0, // 0 to 1
    phase: 'idle', // 'idle', 'pulling', 'flying', 'hit'
    winnerRevealed: null,
    angleOffset: 0
};

function startArcheryAnimation(winnerName, onComplete) {
    cancelAnimationFrame(animationFrameId);
    
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    
    archeryState = {
        arrowX: w * 0.15,
        arrowY: h * 0.5,
        arrowTargetX: w * 0.65,
        arrowTargetY: h * 0.5,
        arrowSpeed: 24,
        isArrowFlying: false,
        particles: [],
        bowPullProgress: 0,
        phase: 'pulling',
        winnerRevealed: winnerName,
        angleOffset: 0
    };
    
    let pullTimer = 0;
    playPullSound();
    
    function animate() {
        ctx.clearRect(0, 0, w, h);
        
        // 1. Draw spinning names on the right side target zone
        const targetCenterX = w * 0.65;
        const targetCenterY = h * 0.5;
        const targetRadius = Math.min(w, h) * 0.3;
        
        // Name clouds spinning
        archeryState.angleOffset += (archeryState.phase === 'pulling' ? 0.05 : 0.01);
        
        // Show spinning names
        if (state.students.length > 0 && archeryState.phase !== 'hit') {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const count = Math.min(state.students.length, 12);
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2 + archeryState.angleOffset;
                const dist = targetRadius * 0.75;
                const nx = targetCenterX + Math.cos(angle) * dist;
                const ny = targetCenterY + Math.sin(angle) * dist;
                
                ctx.font = '13px "Noto Sans TC"';
                ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + (1 - idxNormalize(i, count)) * 0.35})`;
                ctx.fillText(state.students[i], nx, ny);
            }
            ctx.restore();
        }

        // Draw tribal target circular rings in the center of rotation
        ctx.save();
        ctx.beginPath();
        ctx.arc(targetCenterX, targetCenterY, 35, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = varColor('--atayal-red');
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(targetCenterX, targetCenterY, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // Tribal Diamond pattern inside target center
        ctx.fillStyle = varColor('--accent-orange');
        ctx.beginPath();
        ctx.moveTo(targetCenterX, targetCenterY - 10);
        ctx.lineTo(targetCenterX + 10, targetCenterY);
        ctx.lineTo(targetCenterX, targetCenterY + 10);
        ctx.lineTo(targetCenterX - 10, targetCenterY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // 2. Archery Action Phases
        if (archeryState.phase === 'pulling') {
            pullTimer += 0.016;
            archeryState.bowPullProgress = Math.min(pullTimer / 1.0, 1); // Pull bow over 1 second
            
            if (archeryState.bowPullProgress >= 1) {
                archeryState.phase = 'flying';
                archeryState.isArrowFlying = true;
                playShootSound();
            }
        }
        
        // Draw Traditional Atayal Bow on Left
        const bowX = w * 0.15;
        const bowY = h * 0.5;
        const bowRadius = 90;
        
        ctx.save();
        ctx.strokeStyle = '#8d6e63'; // Wooden bow body
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        
        // Curved bow body
        ctx.beginPath();
        ctx.arc(bowX - 20, bowY, bowRadius, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
        
        // Bow bindings (Atayal red wraps)
        ctx.strokeStyle = varColor('--atayal-red');
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(bowX - 20, bowY, bowRadius, -Math.PI * 0.1, -Math.PI * 0.08);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bowX - 20, bowY, bowRadius, Math.PI * 0.08, Math.PI * 0.1);
        ctx.stroke();
        
        // Bow string
        const stringTopX = bowX - 20 + Math.cos(-Math.PI * 0.45) * bowRadius;
        const stringTopY = bowY + Math.sin(-Math.PI * 0.45) * bowRadius;
        const stringBotX = bowX - 20 + Math.cos(Math.PI * 0.45) * bowRadius;
        const stringBotY = bowY + Math.sin(Math.PI * 0.45) * bowRadius;
        
        const pullOffsetX = archeryState.bowPullProgress * 45;
        const notchX = bowX - pullOffsetX;
        const notchY = bowY;
        
        ctx.strokeStyle = '#e0e0e0'; // String color
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(stringTopX, stringTopY);
        ctx.lineTo(notchX, notchY);
        ctx.lineTo(stringBotX, stringBotY);
        ctx.stroke();
        
        // Arrow Notch/Drawing
        if (archeryState.phase === 'pulling' || (archeryState.phase === 'idle')) {
            drawArrow(ctx, notchX, notchY, 0, 65);
        }
        ctx.restore();
        
        // 3. Arrow Flying Phase
        if (archeryState.phase === 'flying') {
            archeryState.arrowX += archeryState.arrowSpeed;
            
            // Add particles trailing behind the flying arrow
            if (Math.random() < 0.6) {
                archeryState.particles.push(new Particle(archeryState.arrowX - 20, archeryState.arrowY + (Math.random() - 0.5) * 4));
            }
            
            drawArrow(ctx, archeryState.arrowX, archeryState.arrowY, 0, 65);
            
            // Hit check
            if (archeryState.arrowX >= archeryState.arrowTargetX) {
                archeryState.phase = 'hit';
                playHitSound();
                
                // Explode particles
                for (let k = 0; k < 60; k++) {
                    archeryState.particles.push(new Particle(targetCenterX, targetCenterY));
                }
            }
        }
        
        // 4. Hit & Reveal Phase
        if (archeryState.phase === 'hit') {
            // Draw stuck arrow in target
            drawArrow(ctx, targetCenterX, targetCenterY, 0, 50);
            
            // Display winner name with expansion & glow
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Diamond glowing frame background for the winner's name
            const fontScale = Math.min(1.5, 0.5 + (1 - (archeryState.particles.length / 60)) * 1.5);
            ctx.shadowBlur = 15;
            ctx.shadowColor = varColor('--accent-orange');
            
            // Display student class
            const parsed = parseStudent(archeryState.winnerRevealed);
            ctx.font = `600 ${16 * fontScale}px "Noto Sans TC"`;
            ctx.fillStyle = varColor('--text-secondary');
            ctx.fillText(parsed.class, targetCenterX, targetCenterY - 45);
            
            // Large Student Name
            ctx.font = `900 ${36 * fontScale}px "Noto Sans TC"`;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(parsed.name, targetCenterX, targetCenterY + 45);
            ctx.restore();
            
            // Finish animation trigger after particles fade
            if (archeryState.particles.length === 0) {
                setTimeout(() => {
                    onComplete();
                }, 800);
                return; // Stop animation loop
            }
        }
        
        // Update and draw particles
        for (let idx = archeryState.particles.length - 1; idx >= 0; idx--) {
            const p = archeryState.particles[idx];
            p.update();
            if (p.alpha <= 0) {
                archeryState.particles.splice(idx, 1);
            } else {
                p.draw(ctx);
            }
        }
        
        animationFrameId = requestAnimationFrame(animate);
    }
    
    // Normalize helper for fading text transparency
    function idxNormalize(val, max) {
        return val / max;
    }
    
    // Custom Arrow Drawing Helper
    function drawArrow(c, x, y, angle, length) {
        c.save();
        c.translate(x, y);
        c.rotate(angle);
        
        // Arrow shaft
        c.strokeStyle = '#d7ccc8';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(-length, 0);
        c.lineTo(0, 0);
        c.stroke();
        
        // Fletching (Feathers in red and white)
        c.fillStyle = varColor('--atayal-red');
        c.beginPath();
        c.moveTo(-length, 0);
        c.lineTo(-length - 10, 6);
        c.lineTo(-length + 5, 6);
        c.lineTo(-length + 10, 0);
        c.closePath();
        c.fill();
        
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.moveTo(-length, 0);
        c.lineTo(-length - 10, -6);
        c.lineTo(-length + 5, -6);
        c.lineTo(-length + 10, 0);
        c.closePath();
        c.fill();
        
        // Arrowhead (Stone or metal diamond shape)
        c.fillStyle = '#757575';
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(-10, -6);
        c.lineTo(-7, 0);
        c.lineTo(-10, 6);
        c.closePath();
        c.fill();
        
        c.restore();
    }
    
    animate();
}

// --- Weaving Theme Animation Logic (Tribal Pattern Spinner) ---
let weavingState = {
    rotationAngle: 0,
    speed: 0,
    particles: [],
    winnerName: '',
    phase: 'idle' // 'idle', 'spinning', 'stopping', 'reveal'
};

function startWeavingAnimation(winnerName, onComplete) {
    cancelAnimationFrame(animationFrameId);
    
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    
    weavingState = {
        rotationAngle: 0,
        speed: 0.8, // Start fast
        particles: [],
        winnerName: winnerName,
        phase: 'spinning'
    };
    
    let spinDuration = 0;
    let clickTracker = 0;
    
    function animate() {
        ctx.clearRect(0, 0, w, h);
        
        const centerX = w * 0.5;
        const centerY = h * 0.5;
        const wheelRadius = Math.min(w, h) * 0.38;
        
        // Update rotation
        weavingState.rotationAngle += weavingState.speed;
        
        // Click sound intervals
        clickTracker += weavingState.speed;
        if (clickTracker > 0.3 && weavingState.phase !== 'reveal') {
            playClickSound();
            clickTracker = 0;
        }
        
        // Slow down phases
        spinDuration += 0.016;
        if (spinDuration > 1.2 && weavingState.phase === 'spinning') {
            weavingState.phase = 'stopping';
        }
        
        if (weavingState.phase === 'stopping') {
            weavingState.speed *= 0.965; // Decelerate
            if (weavingState.speed < 0.005) {
                weavingState.speed = 0;
                weavingState.phase = 'reveal';
                playHitSound();
                // Particle blast at bottom-pointing pointer
                for (let k = 0; k < 60; k++) {
                    weavingState.particles.push(new Particle(centerX, centerY - wheelRadius));
                }
            }
        }
        
        // Draw Weaving Wheel Background
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(weavingState.rotationAngle);
        
        // 1. Draw outer woven border
        ctx.strokeStyle = varColor('--atayal-red');
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Intersecting patterns inside the wheel
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        const slices = 12;
        for (let i = 0; i < slices; i++) {
            const angle = (i / slices) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * wheelRadius, Math.sin(angle) * wheelRadius);
            ctx.stroke();
        }
        
        // Draw diamond patterns along the outer ring
        for (let i = 0; i < slices * 2; i++) {
            const angle = (i / (slices * 2)) * Math.PI * 2;
            ctx.save();
            ctx.rotate(angle);
            ctx.fillStyle = i % 2 === 0 ? varColor('--accent-orange') : '#ffffff';
            ctx.beginPath();
            ctx.moveTo(wheelRadius - 7, -6);
            ctx.lineTo(wheelRadius + 7, 0);
            ctx.lineTo(wheelRadius - 7, 6);
            ctx.lineTo(wheelRadius - 21, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        
        // Draw candidate names inside slices
        if (state.students.length > 0) {
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 12px "Noto Sans TC"';
            
            const displayCount = Math.min(state.students.length, slices);
            for (let i = 0; i < displayCount; i++) {
                const angle = (i / displayCount) * Math.PI * 2;
                ctx.save();
                ctx.rotate(angle);
                ctx.fillStyle = `rgba(255, 255, 255, ${i === 0 && weavingState.phase === 'reveal' ? 1.0 : 0.65})`;
                if (i === 0 && weavingState.phase === 'reveal') {
                    ctx.font = 'bold 15px "Noto Sans TC"';
                }
                ctx.fillText(state.students[i], wheelRadius - 25, 0);
                ctx.restore();
            }
        }
        
        ctx.restore(); // End of wheel transformation
        
        // Draw pointer at the top
        ctx.save();
        ctx.fillStyle = varColor('--accent-gold');
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - wheelRadius - 15);
        ctx.lineTo(centerX - 15, centerY - wheelRadius - 35);
        ctx.lineTo(centerX + 15, centerY - wheelRadius - 35);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Draw Center Hub (Diamond eye)
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.fillStyle = varColor('--atayal-black');
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Glowing Diamond Core
        ctx.fillStyle = varColor('--atayal-red');
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(20, 0);
        ctx.lineTo(0, 20);
        ctx.lineTo(-20, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Handle Reveal Stage
        if (weavingState.phase === 'reveal') {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Dim background slightly to pop winner name
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(0, 0, w, h);
            
            const fontScale = Math.min(1.4, 0.4 + (1 - (weavingState.particles.length / 60)) * 1.4);
            
            const parsed = parseStudent(weavingState.winnerName);
            
            // Display class
            ctx.font = `600 ${16 * fontScale}px "Noto Sans TC"`;
            ctx.fillStyle = varColor('--text-secondary');
            ctx.fillText(parsed.class, centerX, centerY - 65);
            
            // Name
            ctx.font = `900 ${36 * fontScale}px "Noto Sans TC"`;
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 20;
            ctx.shadowColor = varColor('--atayal-red');
            ctx.fillText(parsed.name, centerX, centerY + 65);
            ctx.restore();
            
            if (weavingState.particles.length === 0) {
                setTimeout(() => {
                    onComplete();
                }, 800);
                return;
            }
        }
        
        // Particle Updates
        for (let idx = weavingState.particles.length - 1; idx >= 0; idx--) {
            const p = weavingState.particles[idx];
            p.update();
            if (p.alpha <= 0) {
                weavingState.particles.splice(idx, 1);
            } else {
                p.draw(ctx);
            }
        }
        
        animationFrameId = requestAnimationFrame(animate);
    }
    
    animate();
}

// Helper to grab CSS Variable values in Canvas
function varColor(cssVarName) {
    return getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim();
}

// Parses string into { class, name }
function parseStudent(str) {
    if (!str) return { class: '', name: '未知候選人' };
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
        return {
            class: parts[0],
            name: parts.slice(1).join(' ')
        };
    }
    return {
        class: '無特定班級',
        name: str
    };
}

// --- List UI & Data Binding Manager ---
const studentListTextarea = document.getElementById('student-list');
const totalCountSpan = document.getElementById('total-count');
const prizeInput = document.getElementById('prize-input');
const drawCountSelect = document.getElementById('draw-count');
const animationSelect = document.getElementById('animation-select');
const soundToggle = document.getElementById('sound-toggle');
const ttsToggle = document.getElementById('tts-toggle');
const winnersListUl = document.getElementById('winners-list');
const stageOverlayDiv = document.getElementById('stage-overlay');

// Parse Textarea input into candidate array
function updateStudentsFromUI() {
    const text = studentListTextarea.value.trim();
    if (text === '') {
        state.students = [];
    } else {
        state.students = text.split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');
    }
    totalCountSpan.textContent = state.students.length;
    saveToStorage();
}

// Load default preset list
function loadDemoList() {
    studentListTextarea.value = DEFAULT_STUDENTS.join('\n');
    updateStudentsFromUI();
}

// Clear list
function clearStudentList() {
    studentListTextarea.value = '';
    updateStudentsFromUI();
}

// UI triggers for settings
soundToggle.addEventListener('change', () => {
    state.soundEnabled = soundToggle.checked;
    saveToStorage();
});

ttsToggle.addEventListener('change', () => {
    state.ttsEnabled = ttsToggle.checked;
    saveToStorage();
});

animationSelect.addEventListener('change', () => {
    state.animationTheme = animationSelect.value;
    saveToStorage();
});

studentListTextarea.addEventListener('input', updateStudentsFromUI);

// Load state from LocalStorage on launch
function loadFromStorage() {
    const savedStudents = localStorage.getItem('lishan_lottery_students');
    const savedWinners = localStorage.getItem('lishan_lottery_winners');
    const savedSound = localStorage.getItem('lishan_lottery_sound');
    const savedTTS = localStorage.getItem('lishan_lottery_tts');
    const savedAnim = localStorage.getItem('lishan_lottery_anim');
    const savedPrize = localStorage.getItem('lishan_lottery_prize');
    
    if (savedStudents !== null) {
        studentListTextarea.value = JSON.parse(savedStudents).join('\n');
    } else {
        // Default to demo list on first open
        studentListTextarea.value = DEFAULT_STUDENTS.join('\n');
    }
    updateStudentsFromUI();
    
    if (savedWinners) {
        state.winners = JSON.parse(savedWinners);
        renderWinnersList();
    }
    
    if (savedSound !== null) {
        state.soundEnabled = JSON.parse(savedSound);
        soundToggle.checked = state.soundEnabled;
    }
    
    if (savedTTS !== null) {
        state.ttsEnabled = JSON.parse(savedTTS);
        ttsToggle.checked = state.ttsEnabled;
    }
    
    if (savedAnim) {
        state.animationTheme = savedAnim;
        animationSelect.value = savedAnim;
    }
    
    if (savedPrize) {
        prizeInput.value = savedPrize;
    }
}

// Save state to LocalStorage
function saveToStorage() {
    localStorage.setItem('lishan_lottery_students', JSON.stringify(state.students));
    localStorage.setItem('lishan_lottery_winners', JSON.stringify(state.winners));
    localStorage.setItem('lishan_lottery_sound', JSON.stringify(state.soundEnabled));
    localStorage.setItem('lishan_lottery_tts', JSON.stringify(state.ttsEnabled));
    localStorage.setItem('lishan_lottery_anim', state.animationTheme);
    localStorage.setItem('lishan_lottery_prize', prizeInput.value);
}

// Render Winners log onto panel
function renderWinnersList() {
    winnersListUl.innerHTML = '';
    if (state.winners.length === 0) {
        winnersListUl.innerHTML = `
            <li class="empty-item">
                <i class="fa-solid fa-ticket-simple"></i>
                目前尚無得獎紀錄，請開始抽獎。
            </li>`;
        return;
    }
    
    // Sort winners to show the newest at the top
    const sorted = [...state.winners].reverse();
    
    sorted.forEach((winner, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="winner-info">
                <div class="winner-student">
                    <span>${winner.class}</span>${winner.name}
                </div>
                <div class="winner-prize">
                    <i class="fa-solid fa-gift"></i> ${winner.prize}
                </div>
            </div>
            <div class="winner-time">
                ${winner.time}
            </div>
        `;
        winnersListUl.appendChild(li);
    });
}

// --- Draw Core Process ---
const btnDraw = document.getElementById('btn-draw');
const winnerPopContainer = document.getElementById('winner-pop-container');
const popClassDiv = document.getElementById('pop-class');
const popNameDiv = document.getElementById('pop-name');
const popPrizeDiv = document.getElementById('pop-prize');
const btnClosePop = document.getElementById('btn-close-pop');

// Modal Popup Control
function showWinnerPop(winnerString, prize) {
    const parsed = parseStudent(winnerString);
    popClassDiv.textContent = parsed.class;
    popNameDiv.textContent = parsed.name;
    popPrizeDiv.textContent = `獲得：${prize}`;
    
    winnerPopContainer.classList.remove('hidden');
    
    // Audio synthesis speech
    speakWinnerNotification(parsed.class, parsed.name, prize);
}

btnClosePop.addEventListener('click', () => {
    winnerPopContainer.classList.add('hidden');
});

// Single draw action
function drawSingle(prize, onSingleComplete) {
    if (state.students.length === 0) {
        alert('抽獎名單內無候選學生，請輸入或載入名單！');
        onSingleComplete(false);
        return;
    }
    
    // Pick a random index
    const randomIndex = Math.floor(Math.random() * state.students.length);
    const selectedWinner = state.students[randomIndex];
    
    // Remove student from candidate list to avoid duplicate wins in this session
    state.students.splice(randomIndex, 1);
    studentListTextarea.value = state.students.join('\n');
    updateStudentsFromUI();
    
    // Add to winner logs
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const parsed = parseStudent(selectedWinner);
    
    const newWinner = {
        class: parsed.class,
        name: parsed.name,
        prize: prize,
        time: timeStr
    };
    
    // Animate stage
    stageOverlayDiv.classList.add('hidden');
    
    const completionCallback = () => {
        state.winners.push(newWinner);
        saveToStorage();
        renderWinnersList();
        showWinnerPop(selectedWinner, prize);
        onSingleComplete(true);
    };
    
    if (state.animationTheme === 'weaving') {
        startWeavingAnimation(selectedWinner, completionCallback);
    } else {
        startArcheryAnimation(selectedWinner, completionCallback);
    }
}

// Batch Drawing Orchestrator
async function triggerLottery() {
    if (state.isDrawing) return;
    if (state.students.length === 0) {
        alert('候選名單沒有學生，請載入或輸入名單！');
        return;
    }
    
    initAudio(); // Initialize audio context on click
    
    state.isDrawing = true;
    btnDraw.disabled = true;
    btnDraw.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 正在尋求祖靈指示...`;
    
    const quantity = parseInt(drawCountSelect.value, 10);
    const prize = prizeInput.value.trim() || '特展精美紀念品';
    
    let currentDraw = 0;
    
    function drawNext() {
        if (currentDraw < quantity && state.students.length > 0) {
            drawSingle(prize, (success) => {
                if (!success) {
                    finishDrawing();
                    return;
                }
                
                // Wait for the modal pop to close before running the next draw (sequential)
                // We listen to the close button click
                const handleClose = () => {
                    btnClosePop.removeEventListener('click', handleClose);
                    currentDraw++;
                    setTimeout(() => {
                        drawNext();
                    }, 500);
                };
                btnClosePop.addEventListener('click', handleClose);
            });
        } else {
            finishDrawing();
        }
    }
    
    function finishDrawing() {
        state.isDrawing = false;
        btnDraw.disabled = false;
        btnDraw.innerHTML = `<i class="fa-solid fa-bow-arrow"></i> 🎯 釋放神箭 ‧ 開始抽獎`;
        stageOverlayDiv.classList.remove('hidden');
        
        // Reset overlay banner
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    drawNext();
}

btnDraw.addEventListener('click', triggerLottery);

// --- CSV Export Helper ---
function exportWinnersToCSV() {
    if (state.winners.length === 0) {
        alert('目前無得獎紀錄可供匯出。');
        return;
    }
    
    let csvContent = '\uFEFF'; // Add BOM for Chinese character compatibility in Excel
    csvContent += '班級,得獎學生,獲得獎項,抽中時間\n';
    
    state.winners.forEach(winner => {
        csvContent += `"${winner.class}","${winner.name}","${winner.prize}","${winner.time}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}${((now.getMonth() + 1)).toString().padStart(2, '0')}${(now.getDate()).toString().padStart(2, '0')}`;
    
    link.setAttribute('download', `梨山國中小_臺灣文學展抽獎結果_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Wire up helper events ---
document.getElementById('btn-load-demo').addEventListener('click', loadDemoList);
document.getElementById('btn-clear-list').addEventListener('click', () => {
    if (confirm('確定要清空學生抽獎名單嗎？')) {
        clearStudentList();
    }
});
document.getElementById('btn-export').addEventListener('click', exportWinnersToCSV);

// Initialize System on load
window.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    
    // Check speech synth support on boot
    if ('speechSynthesis' in window) {
        const toast = document.getElementById('tts-status');
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
});
