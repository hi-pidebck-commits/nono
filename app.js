/* ----------------------------------------------------
   NEURALIS // Cybernetic Interactive Logic Engine
   Powered by Web Audio, HTML5 Canvas, and Vanilla JS
------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let soundEnabled = false;
    let audioCtx = null;
    let ambientOsc1 = null;
    let ambientOsc2 = null;
    let ambientGain = null;

    // Interactive Physics & Sound Tuners
    let synapseSpeedMultiplier = 1.0;
    let maxLinkDistance = 140;
    let baseSynthPitch = 220; // Hz
    let brownoutActive = false;

    // Theme states
    const themes = ['cyber-theme', 'green-theme', 'purple-theme'];
    let currentThemeIndex = 0;

    // --- Selectors ---
    const cursor = document.getElementById('customCursor');
    const cursorDot = document.getElementById('customCursorDot');
    const chronoClock = document.getElementById('chronoClock');
    const sysLoadVal = document.getElementById('sysLoadVal');
    const nodeCountBox = document.getElementById('nodeCount');
    const sparkCountBox = document.getElementById('sparkCount');
    const integrityBox = document.getElementById('integrityVal');
    const energyFactorBox = document.getElementById('energyFactor');
    const brownoutOverlay = document.getElementById('brownoutOverlay');
    
    // Sliders
    const syncSpeedSlider = document.getElementById('syncSpeedSlider');
    const syncSpeedVal = document.getElementById('syncSpeedVal');
    const linkDistanceSlider = document.getElementById('linkDistanceSlider');
    const linkDistanceVal = document.getElementById('linkDistanceVal');
    const synthPitchSlider = document.getElementById('synthPitchSlider');
    const synthPitchVal = document.getElementById('synthPitchVal');

    // Controls
    const soundToggle = document.getElementById('soundToggle');
    const soundStatus = document.getElementById('soundStatus');
    const emergencyReboot = document.getElementById('emergencyReboot');

    // Terminal Elements
    const terminalLogs = document.getElementById('terminalLogs');
    const terminalInput = document.getElementById('terminalInput');

    // Canvases
    const ambientCanvas = document.getElementById('ambientCanvas');
    const neuralCanvas = document.getElementById('neuralCanvas');

    // --- Custom Cyber Cursor ---
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    const cursorEase = 0.12; // Snappier trailing delay

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Instant movement for the dot
        cursorDot.style.left = `${mouseX}px`;
        cursorDot.style.top = `${mouseY}px`;
    });

    // Smooth trailing animation for the reticle ring
    function animateCursor() {
        const dx = mouseX - cursorX;
        const dy = mouseY - cursorY;
        cursorX += dx * cursorEase;
        cursorY += dy * cursorEase;
        
        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    window.addEventListener('mousedown', () => {
        cursor.classList.add('clicking');
        playSynthClick(baseSynthPitch * 3.5, 0.05); // Play mechanic high-pitch click tied to synth base pitch
    });

    window.addEventListener('mouseup', () => {
        cursor.classList.add('clicking');
        setTimeout(() => cursor.classList.remove('clicking'), 150);
    });


    // --- 3D Holographic Card Parallax Tilt & Light Reflection ---
    const tiltCards = document.querySelectorAll('.tilt-card');
    
    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            
            // Calculate hover coordinate offsets
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Normalize offsets (-0.5 to 0.5)
            const xc = x / rect.width - 0.5;
            const yc = y / rect.height - 0.5;
            
            // Calculate 3D rotations (max 8 degrees tilt)
            const rotateX = -yc * 16;
            const rotateY = xc * 16;
            
            // Apply transformations
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
            
            // Set dynamic lighting gradient coordinates
            card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
            card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
        });
        
        card.addEventListener('mouseleave', () => {
            // Smoothly reset tilt state
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
        });
    });


    // --- Dynamic Slider Bindings ---
    syncSpeedSlider.addEventListener('input', (e) => {
        synapseSpeedMultiplier = parseFloat(e.target.value);
        syncSpeedVal.textContent = `${synapseSpeedMultiplier.toFixed(1)}x`;
        energyFactorBox.textContent = synapseSpeedMultiplier.toFixed(2);
        playSynthClick(baseSynthPitch * 2, 0.03, 'triangle');
    });

    linkDistanceSlider.addEventListener('input', (e) => {
        maxLinkDistance = parseInt(e.target.value);
        linkDistanceVal.textContent = `${maxLinkDistance}px`;
        playSynthClick(baseSynthPitch * 1.5, 0.03, 'sine');
    });

    synthPitchSlider.addEventListener('input', (e) => {
        baseSynthPitch = parseInt(e.target.value);
        synthPitchVal.textContent = `${baseSynthPitch}Hz`;
        
        // Directly bind slider to live Web Audio oscillator drone
        if (ambientOsc1 && ambientOsc2 && soundEnabled) {
            ambientOsc1.frequency.setTargetAtTime(baseSynthPitch / 4, audioCtx.currentTime, 0.1);
            ambientOsc2.frequency.setTargetAtTime((baseSynthPitch / 4) + 0.5, audioCtx.currentTime, 0.1);
        }
        playSynthClick(baseSynthPitch, 0.04, 'sine');
    });


    // --- High-Precision Telemetry Clock & Loads ---
    function updateHUDClock() {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0');
        chronoClock.textContent = `${hrs}:${mins}:${secs}.${ms}`;
        
        // Random load jittering (brownout dims loads drastically)
        let load = 0;
        if (brownoutActive) {
            load = (2 + Math.random() * 2).toFixed(2);
        } else {
            load = (10 + Math.random() * 8 + (Math.sin(now.getTime() / 5000) * 4)).toFixed(2);
        }
        sysLoadVal.textContent = `${load}%`;

        requestAnimationFrame(updateHUDClock);
    }
    updateHUDClock();


    // --- Cybernetic Sound Synthesizer (Web Audio API) ---
    function initAudio() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create futuristic engine ambient drone
        ambientGain = audioCtx.createGain();
        ambientGain.gain.setValueAtTime(0.015, audioCtx.currentTime); // Low volume background hum

        // Two oscillators detuned based on baseSynthPitch slider
        ambientOsc1 = audioCtx.createOscillator();
        ambientOsc1.type = 'sawtooth';
        ambientOsc1.frequency.setValueAtTime(baseSynthPitch / 4, audioCtx.currentTime); // Dynamic bind

        ambientOsc2 = audioCtx.createOscillator();
        ambientOsc2.type = 'triangle';
        ambientOsc2.frequency.setValueAtTime((baseSynthPitch / 4) + 0.5, audioCtx.currentTime);

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(140, audioCtx.currentTime);

        // Connect
        ambientOsc1.connect(filter);
        ambientOsc2.connect(filter);
        filter.connect(ambientGain);
        ambientGain.connect(audioCtx.destination);

        ambientOsc1.start();
        ambientOsc2.start();
    }

    function playSynthClick(freq = 600, duration = 0.08, type = 'sine') {
        if (!soundEnabled || !audioCtx) return;
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    function playSciFiSweep() {
        if (!soundEnabled || !audioCtx) return;

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseSynthPitch * 8, audioCtx.currentTime + 1.2);
        
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, audioCtx.currentTime);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 1.2);
    }

    function toggleSound() {
        if (!soundEnabled) {
            soundEnabled = true;
            initAudio();
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            // Fade in ambient hum
            if (ambientGain) {
                ambientGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
                ambientGain.gain.linearRampToValueAtTime(0.015, audioCtx.currentTime + 2.0);
            }
            soundStatus.textContent = "ON";
            soundStatus.className = "cyan-text";
            playSynthClick(baseSynthPitch * 4, 0.15);
        } else {
            soundEnabled = false;
            // Fade out ambient
            if (ambientGain) {
                ambientGain.gain.setValueAtTime(0.015, audioCtx.currentTime);
                ambientGain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 0.5);
            }
            soundStatus.textContent = "OFF";
            soundStatus.className = "";
        }
    }

    soundToggle.addEventListener('click', toggleSound);


    // --- Canvas Background Particle Network ---
    const bgCtx = ambientCanvas.getContext('2d');
    let bgParticles = [];
    const maxBgParticles = 45;

    function resizeBgCanvas() {
        ambientCanvas.width = window.innerWidth;
        ambientCanvas.height = window.innerHeight;
    }
    resizeBgCanvas();
    window.addEventListener('resize', resizeBgCanvas);

    class BgParticle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * ambientCanvas.width;
            this.y = Math.random() * ambientCanvas.height;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.radius = Math.random() * 1.5 + 0.5;
            this.alpha = Math.random() * 0.5 + 0.1;
        }
        update() {
            this.x += this.vx * synapseSpeedMultiplier;
            this.y += this.vy * synapseSpeedMultiplier;
            if (this.x < 0 || this.x > ambientCanvas.width || this.y < 0 || this.y > ambientCanvas.height) {
                this.reset();
            }
        }
        draw() {
            bgCtx.beginPath();
            bgCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            bgCtx.fillStyle = `rgba(0, 242, 254, ${this.alpha})`;
            bgCtx.fill();
        }
    }

    for (let i = 0; i < maxBgParticles; i++) {
        bgParticles.push(new BgParticle());
    }

    function animateBg() {
        bgCtx.clearRect(0, 0, ambientCanvas.width, ambientCanvas.height);
        
        // Draw grid lines
        const gridSize = 60;
        bgCtx.strokeStyle = 'rgba(0, 242, 254, 0.02)';
        bgCtx.lineWidth = 1;
        
        for (let x = 0; x < ambientCanvas.width; x += gridSize) {
            bgCtx.beginPath();
            bgCtx.moveTo(x, 0);
            bgCtx.lineTo(x, ambientCanvas.height);
            bgCtx.stroke();
        }
        for (let y = 0; y < ambientCanvas.height; y += gridSize) {
            bgCtx.beginPath();
            bgCtx.moveTo(0, y);
            bgCtx.lineTo(ambientCanvas.width, y);
            bgCtx.stroke();
        }

        // Draw connections
        bgCtx.strokeStyle = 'rgba(0, 242, 254, 0.05)';
        for (let i = 0; i < bgParticles.length; i++) {
            for (let j = i + 1; j < bgParticles.length; j++) {
                const dist = Math.hypot(bgParticles[i].x - bgParticles[j].x, bgParticles[i].y - bgParticles[j].y);
                if (dist < 150) {
                    bgCtx.beginPath();
                    bgCtx.moveTo(bgParticles[i].x, bgParticles[i].y);
                    bgCtx.lineTo(bgParticles[j].x, bgParticles[j].y);
                    bgCtx.stroke();
                }
            }
        }

        // Update and draw particles
        bgParticles.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(animateBg);
    }
    animateBg();


    // --- Advanced Interactive Neural Sandbox Canvas (Core Hubs + Sparks) ---
    const nCtx = neuralCanvas.getContext('2d');
    let neuralNodes = [];
    let signalPulses = [];
    let coreSparks = [];

    function resizeNeuralCanvas() {
        const rect = neuralCanvas.parentElement.getBoundingClientRect();
        neuralCanvas.width = rect.width;
        neuralCanvas.height = rect.height;
    }
    resizeNeuralCanvas();
    window.addEventListener('resize', resizeNeuralCanvas);

    class NeuralNode {
        constructor(x, y, isHub = false) {
            this.x = x;
            this.y = y;
            this.isHub = isHub;
            this.radius = isHub ? 12 : Math.random() * 4 + 4;
            this.pulseRadius = this.radius;
            this.pulseGrow = true;
            this.connected = [];
            this.color = isHub ? '#ffffff' : (Math.random() > 0.4 ? 'var(--neon-cyan)' : 'var(--neon-magenta)');
            this.id = Math.random().toString(36).substr(2, 9);
            this.rotationAngle = 0; // Rotational velocity for core hub satellite orbitals
        }
        update() {
            // Pulse node animation
            if (this.pulseGrow) {
                this.pulseRadius += this.isHub ? 0.2 : 0.1;
                if (this.pulseRadius > this.radius * 1.4) this.pulseGrow = false;
            } else {
                this.pulseRadius -= this.isHub ? 0.2 : 0.1;
                if (this.pulseRadius < this.radius) this.pulseGrow = true;
            }

            if (this.isHub) {
                this.rotationAngle += 0.02 * synapseSpeedMultiplier;
            }
        }
        draw() {
            // Outer glow ring
            nCtx.beginPath();
            nCtx.arc(this.x, this.y, this.pulseRadius, 0, Math.PI * 2);
            if (this.isHub) {
                nCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            } else {
                nCtx.fillStyle = this.color === 'var(--neon-cyan)' ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 0, 180, 0.15)';
            }
            nCtx.fill();

            // Rotational satellites for core hub nodes
            if (this.isHub) {
                nCtx.beginPath();
                nCtx.arc(this.x, this.y, this.radius * 2.2, 0, Math.PI * 2);
                nCtx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
                nCtx.lineWidth = 1;
                nCtx.stroke();

                // Satellites orbiting core
                for (let a = 0; a < 3; a++) {
                    const satAngle = this.rotationAngle + (a * Math.PI * 2 / 3);
                    const satX = this.x + Math.cos(satAngle) * (this.radius * 2.2);
                    const satY = this.y + Math.sin(satAngle) * (this.radius * 2.2);
                    
                    nCtx.beginPath();
                    nCtx.arc(satX, satY, 3, 0, Math.PI * 2);
                    nCtx.fillStyle = 'var(--neon-magenta)';
                    nCtx.fill();
                }
            }

            // Core dot
            nCtx.beginPath();
            nCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            nCtx.fillStyle = this.isHub ? '#ffffff' : (this.color === 'var(--neon-cyan)' ? '#00f2fe' : '#ff00b4');
            nCtx.fill();
            
            if (this.isHub) {
                nCtx.strokeStyle = 'var(--neon-cyan)';
                nCtx.lineWidth = 1.5;
                nCtx.stroke();
            }
        }
    }

    class SignalPulse {
        constructor(startNode, endNode) {
            this.start = startNode;
            this.end = endNode;
            this.progress = 0;
            this.speed = (Math.random() * 0.015 + 0.01) * synapseSpeedMultiplier;
        }
        update() {
            this.progress += this.speed;
            return this.progress >= 1; // Return true when pulse reaches destination node
        }
        draw() {
            const currentX = this.start.x + (this.end.x - this.start.x) * this.progress;
            const currentY = this.start.y + (this.end.y - this.start.y) * this.progress;
            
            // Pulse particle draw
            nCtx.beginPath();
            nCtx.arc(currentX, currentY, 3.5, 0, Math.PI * 2);
            nCtx.fillStyle = 'hsl(45, 100%, 55%)';
            nCtx.shadowColor = 'hsl(45, 100%, 50%)';
            nCtx.shadowBlur = 8;
            nCtx.fill();
            nCtx.shadowBlur = 0; // reset shadow
        }
    }

    class Spark {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.radius = Math.random() * 1.5 + 0.5;
            this.alpha = 1;
            this.decay = Math.random() * 0.03 + 0.02;
        }
        update() {
            this.x += this.vx * synapseSpeedMultiplier;
            this.y += this.vy * synapseSpeedMultiplier;
            this.alpha -= this.decay;
            return this.alpha <= 0;
        }
        draw() {
            nCtx.beginPath();
            nCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            nCtx.fillStyle = `rgba(255, 180, 0, ${this.alpha})`;
            nCtx.fill();
        }
    }

    // Canvas click trigger neural seed (creates Hub node if double clicked or random)
    neuralCanvas.addEventListener('click', (e) => {
        const rect = neuralCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Hub core node spawned if click count is mod 3 or near existing hubs
        const makeHub = (neuralNodes.length === 0 || Math.random() < 0.25);
        spawnNeuralNode(clickX, clickY, makeHub);
    });

    function spawnNeuralNode(x, y, isHub = false) {
        const node = new NeuralNode(x, y, isHub);
        
        // Find existing nodes to connect
        neuralNodes.forEach(other => {
            const dist = Math.hypot(node.x - other.x, node.y - other.y);
            if (dist < maxLinkDistance) {
                node.connected.push(other);
                other.connected.push(node);
                
                // Seed custom connection log in terminal shell
                appendLog(`Synaptic pathway established [NODE:${node.id.substr(0,4)} 🔗 NODE:${other.id.substr(0,4)}]`, 'info-line');
            }
        });

        neuralNodes.push(node);
        nodeCountBox.textContent = neuralNodes.length;

        // Visual click wave sound synthesis
        if (isHub) {
            playSynthClick(baseSynthPitch * 0.5, 0.4, 'sawtooth');
            playSynthClick(baseSynthPitch, 0.25, 'triangle');
        } else {
            playSynthClick(baseSynthPitch * 2.2, 0.15, 'triangle');
        }

        // Add periodic signal emitter from this new node
        triggerDataPulses(node);
    }

    function spawnSparks(x, y, amount = 10) {
        for (let i = 0; i < amount; i++) {
            coreSparks.push(new Spark(x, y));
        }
        sparkCountBox.textContent = coreSparks.length;
    }

    function triggerDataPulses(startNode) {
        if (startNode.connected.length === 0) return;
        
        // Emit pulses to all neighbors
        startNode.connected.forEach(neighbor => {
            signalPulses.push(new SignalPulse(startNode, neighbor));
        });

        // Trigger typing clicking audio fx
        if (Math.random() < 0.3) {
            playSynthClick(baseSynthPitch * 4.5, 0.03, 'sine');
        }
    }

    // Auto periodic data transmission
    setInterval(() => {
        if (neuralNodes.length === 0) return;
        // Randomly pick a node and emit pulses
        const randomNode = neuralNodes[Math.floor(Math.random() * neuralNodes.length)];
        triggerDataPulses(randomNode);
    }, 1200);

    function animateNeuralCore() {
        nCtx.clearRect(0, 0, neuralCanvas.width, neuralCanvas.height);
        
        // Render network grid lines
        nCtx.lineWidth = 1.5;
        neuralNodes.forEach(node => {
            node.connected.forEach(other => {
                nCtx.beginPath();
                nCtx.moveTo(node.x, node.y);
                nCtx.lineTo(other.x, other.y);
                
                // Draw a beautiful cyber gradient connection
                const gradient = nCtx.createLinearGradient(node.x, node.y, other.x, other.y);
                gradient.addColorStop(0, node.color === 'var(--neon-cyan)' ? 'rgba(0, 242, 254, 0.25)' : 'rgba(255, 0, 180, 0.25)');
                gradient.addColorStop(1, other.color === 'var(--neon-cyan)' ? 'rgba(0, 242, 254, 0.25)' : 'rgba(255, 0, 180, 0.25)');
                nCtx.strokeStyle = gradient;
                nCtx.stroke();
            });
        });

        // Update and draw signal pulses
        signalPulses = signalPulses.filter(pulse => {
            const finished = pulse.update();
            if (finished) {
                // Sparks generated when reaching node
                spawnSparks(pulse.end.x, pulse.end.y, 8);
                playSynthClick(baseSynthPitch * 4, 0.02, 'sine');

                // When pulse reaches destination, propagate to NEXT nodes
                if (Math.random() < 0.4 && pulse.end.connected.length > 1) {
                    const nextNodes = pulse.end.connected.filter(n => n.id !== pulse.start.id);
                    if (nextNodes.length > 0) {
                        const target = nextNodes[Math.floor(Math.random() * nextNodes.length)];
                        signalPulses.push(new SignalPulse(pulse.end, target));
                    }
                }
                return false; // remove from active list
            }
            pulse.draw();
            return true;
        });

        // Update and draw Sparks
        coreSparks = coreSparks.filter(spark => {
            const dead = spark.update();
            if (!dead) spark.draw();
            return !dead;
        });
        sparkCountBox.textContent = coreSparks.length;

        // Update and draw nodes
        neuralNodes.forEach(node => {
            node.update();
            node.draw();
        });

        requestAnimationFrame(animateNeuralCore);
    }
    animateNeuralCore();


    // --- Scrolling Live Diagnostic Scroller (Left Panel) ---
    const feeds = [
        "SYNAPSE LINK_STABLE AT 99.42%",
        "CPU INTERRUPT TRIGGERS RESOLVING...",
        "DECOUPLING ANTIGRAVITY QUANTUM CORRELATIONS",
        "OLLAMA MAINFRAME TELEMETRY INCOMING...",
        "MODEL GEMMA4 EXTRAPOLATING PARAMETERS",
        "HOLOGRAPHIC ENCRYPTOR SYNCING BUFFERS...",
        "LOCAL COMPATIBLE MODEL ACTIVE ON PORT 11434",
        "RECRUITING DATA SUBSECTION 0x48FA1",
        "HAPTIC FEEDBACK SENSORS CALIBRATING...",
        "SIGNAL PROPAGATION STABILITY EXCELLENT"
    ];

    function appendDiagnosticLine() {
        const index = Math.floor(Math.random() * feeds.length);
        const line = document.createElement('div');
        line.className = 'scroller-line';
        line.innerHTML = `<span class="cyan-text">[SYS]</span> ${feeds[index]}`;
        
        diagnosticScroller.appendChild(line);
        diagnosticScroller.scrollTop = diagnosticScroller.scrollHeight;
        
        // Cap lines to prevent page bloat
        if (diagnosticScroller.childNodes.length > 15) {
            diagnosticScroller.removeChild(diagnosticScroller.firstChild);
        }
    }
    // Populate scrolling diagnosis continuously
    setInterval(appendDiagnosticLine, 3000);


    // --- CLI Shell Interactive Terminal (Right Panel) ---
    function appendLog(text, className = '') {
        const line = document.createElement('div');
        line.className = `log-line ${className}`;
        line.textContent = text;
        terminalLogs.appendChild(line);
        terminalLogs.scrollTop = terminalLogs.scrollHeight;
        
        // Play very short typing click fx
        playSynthClick(baseSynthPitch * 5.5, 0.02, 'sine');
    }

    terminalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const inputVal = terminalInput.value.trim();
            if (inputVal === '') return;
            
            // Log command
            appendLog(`> ${inputVal}`, 'info-line');
            processCommand(inputVal);
            terminalInput.value = '';
        } else {
            // Typing sounds
            if (Math.random() < 0.4) {
                playSynthClick(Math.random() * 400 + baseSynthPitch * 3, 0.02, 'sine');
            }
        }
    });

    function processCommand(cmd) {
        const parts = cmd.toLowerCase().split(' ');
        const mainCmd = parts[0];
        
        switch (mainCmd) {
            case 'help':
                appendLog('--- NEURAL PROTOCOL SUITE COMMANDS ---');
                appendLog('help              - Show active quantum protocol listing');
                appendLog('scan              - Initiate deep system diagnostic probe');
                appendLog('sysinfo           - Display quantum mainframe system configuration');
                appendLog('neuralize         - Inject 10 synthetic node sequences into core');
                appendLog('theme             - Toggle neon theme profile (cyan/green/purple)');
                appendLog('sound             - Toggle cyber sound synthesis engine (on/off)');
                appendLog('power             - Trigger visual system-wide brownout voltage drop');
                appendLog('clear             - Flush holographic CLI log buffer');
                break;
                
            case 'clear':
                terminalLogs.innerHTML = '';
                break;
                
            case 'sound':
                toggleSound();
                appendLog(`Haptic & Sound engine toggled to: ${soundEnabled ? 'ONLINE (ON)' : 'OFFLINE (OFF)'}`, soundEnabled ? 'success-line' : 'warning-line');
                break;
                
            case 'theme':
                // Toggle theme sequentially or by name
                document.body.classList.remove(...themes);
                currentThemeIndex = (currentThemeIndex + 1) % themes.length;
                document.body.classList.add(themes[currentThemeIndex]);
                appendLog(`Visual matrix theme profile shifted: ${themes[currentThemeIndex].toUpperCase()}`, 'success-line');
                playSynthClick(baseSynthPitch * 1.5, 0.3, 'sawtooth');
                break;
                
            case 'neuralize':
                appendLog('Seeding 10 synthetic neural nodes...', 'warning-line');
                const rect = neuralCanvas.getBoundingClientRect();
                for (let i = 0; i < 10; i++) {
                    setTimeout(() => {
                        const rx = Math.random() * neuralCanvas.width;
                        const ry = Math.random() * neuralCanvas.height;
                        const makeHub = (i % 4 === 0);
                        spawnNeuralNode(rx, ry, makeHub);
                    }, i * 100);
                }
                break;
                
            case 'sysinfo':
                appendLog('--- SYSTEM ARCHITECTURE PROFILE ---');
                appendLog(`CODENAME: NEURALIS CORE DECK v3.0`);
                appendLog(`BROWSER ENGINE: ${navigator.userAgent.substring(0, 45)}...`);
                appendLog(`SECURE LINK: LOCK ON http://localhost:11434/v1 (@local)`);
                appendLog(`QUANTUM STABILITY MATRIX: ${integrityBox.textContent}`);
                appendLog(`ACTIVE SYNSAPSE NODES COUNT: ${neuralNodes.length}`);
                appendLog(`ACTIVE SPARK FLUX COUNT: ${coreSparks.length}`);
                break;
                
            case 'scan':
                appendLog('Initiating Deep System Probe...', 'warning-line');
                runDiagnosticsProbe();
                break;

            case 'power':
                triggerBrownout();
                break;

            default:
                if (cmd.startsWith('@local')) {
                    appendLog(`Interpreting prompt query to local LLM: "${cmd.substring(6).trim()}"`, 'warning-line');
                    appendLog(`Sending payload to Ollama endpoint...`, 'info-line');
                    setTimeout(() => {
                        appendLog(`[Ollama Response]: Neuralis mainframe online. Endpoint locked on localhost:11434. Gemma model ready for cognitive prompts.`, 'success-line');
                    }, 1200);
                } else {
                    appendLog(`PROTOCOL FAILURE: unknown console action "${cmd}".`, 'error-line');
                    appendLog('Type "help" to list available diagnostic routines.', 'info-line');
                    playSynthClick(baseSynthPitch * 0.8, 0.25, 'sawtooth'); // Error buzz sound
                }
        }
    }

    // Trigger visual system-wide brownout voltage drop
    function triggerBrownout() {
        if (brownoutActive) return;
        brownoutActive = true;
        brownoutOverlay.classList.add('brownout-active');
        appendLog('⚡ WARNING: VOLTAGE DROP DETECTED. BRONWOUT SEQUENCE COMMENCED.', 'error-line');
        playSynthClick(100, 1.2, 'sawtooth');
        
        // Glitch inputs
        const originalSpeed = synapseSpeedMultiplier;
        synapseSpeedMultiplier = 0.15;
        syncSpeedSlider.value = 0.1;
        syncSpeedVal.textContent = "0.1x";
        
        setTimeout(() => {
            brownoutActive = false;
            brownoutOverlay.classList.remove('brownout-active');
            synapseSpeedMultiplier = originalSpeed;
            syncSpeedSlider.value = originalSpeed;
            syncSpeedVal.textContent = `${originalSpeed.toFixed(1)}x`;
            appendLog('⚡ Voltage stabilizer online. Primary grids restored.', 'success-line');
            playSciFiSweep();
        }, 4000);
    }

    // Animated deep diagnostic scan sequence
    function runDiagnosticsProbe() {
        let step = 0;
        const scanSteps = [
            { text: "Locating config parameters...", class: "info-line" },
            { text: "Reading [antigracity.config.json]...", class: "info-line" },
            { text: "Config file validated (VALID JSON).", class: "success-line" },
            { text: "Default provider: openai-compatible", class: "info-line" },
            { text: "Endpoint url: http://localhost:11434/v1 (@local locked)", class: "success-line" },
            { text: "Fallback system: Gemini 3.5 Flash ENABLED.", class: "success-line" },
            { text: "Core diagnostic check complete. 0 structural errors found.", class: "success-line" }
        ];

        // Custom scan visual sound FX
        playSciFiSweep();

        const timer = setInterval(() => {
            if (step >= scanSteps.length) {
                clearInterval(timer);
                return;
            }
            appendLog(`[PROBE] ${scanSteps[step].text}`, scanSteps[step].class);
            
            // Randomly flash integrity box as warning
            if (step === 2) {
                integrityBox.textContent = "99.98%";
                integrityBox.className = "box-value magenta-glow";
            }
            if (step === 6) {
                integrityBox.textContent = "100.0%";
                integrityBox.className = "box-value green-glow";
            }

            step++;
        }, 600);
    }

    // Emergency Reboot Action Trigger
    emergencyReboot.addEventListener('click', () => {
        playSciFiSweep();
        appendLog('!!! EMERGENCY SYSTEM REBOOT COMMENCED !!!', 'error-line');
        appendLog('Clearing active synapse channels...', 'warning-line');
        
        neuralNodes = [];
        signalPulses = [];
        coreSparks = [];
        nodeCountBox.textContent = 0;
        sparkCountBox.textContent = 0;
        integrityBox.textContent = "0.00%";
        integrityBox.className = "box-value error-line";

        // Dynamic terminal rebooting loading animation
        setTimeout(() => {
            appendLog('Re-initializing quantum cores...', 'info-line');
        }, 1000);

        setTimeout(() => {
            appendLog('Restoring synaptic integrity matrix...', 'info-line');
        }, 2000);

        setTimeout(() => {
            integrityBox.textContent = "100.0%";
            integrityBox.className = "box-value green-glow";
            appendLog('Neural core reboot sequence complete. System fully operational.', 'success-line');
            playSynthClick(baseSynthPitch * 3, 0.4, 'triangle');
        }, 3200);
    });

});
