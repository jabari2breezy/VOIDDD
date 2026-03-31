/**
 * VOID Celestial Archive - WebGL Physics Engine
 * Using Three.js for 60fps simulation
 */

class PhysicsEngine {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'webgl-container';
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100vw';
        this.container.style.height = '100vh';
        this.container.style.zIndex = '0';
        this.container.style.pointerEvents = 'none';
        document.body.prepend(this.container);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 100;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        this.mouse = new THREE.Vector2(0, 0);
        this.targetMouse = new THREE.Vector2(0, 0);
        this.mouseWorld = new THREE.Vector3(0, 0, 0);
        this.mouseVel = new THREE.Vector2(0, 0);
        this.lastMousePos = new THREE.Vector2(0, 0);
        this.targetScrollY = 0;
        
        this.clock = new THREE.Clock();
        this.isHoveringLogo = false;
        this.isHoveringTshirt = false;
        this.isHoveringFerro = false;
        this.tilt = new THREE.Vector2(0, 0);

        this.initBlackHole();
        this.initStars();
        this.initParticleLogo();
        this.initTShirt();
        this.initFerrofluid();
        this.initArchiveAndOptions();
        this.initTshirtViewportOverlay();
        this.initVoidUnderstageCanvas();
        this.initShirtOutlineLayer();
        this.initVoidPressHint();
        this.initCursor();
        this.initGyroscope();
        this.initEmailAutomation();

        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('scroll', () => {
            this.targetScrollY = window.scrollY;
        });

        // Touch Interaction Pass
        window.addEventListener('touchstart', (e) => {
            if(e.touches.length > 0) {
                this.onTouchMove(e.touches[0]);
                // Check if touching the main viewport area
                const touchRelY = e.touches[0].clientY;
                const viewTop = document.getElementById('archive')?.offsetTop || 0;
                const ferroTop = document.getElementById('ferrofluid-trigger')?.offsetTop || 0;
                const ferroHeight = document.getElementById('ferrofluid-trigger')?.offsetHeight || 0;
                
                if (touchRelY > viewTop && touchRelY < ferroTop) this.isHoveringTshirt = true;
                if (touchRelY >= ferroTop && touchRelY <= ferroTop + ferroHeight) this.isHoveringFerro = true;
                
                // Hide custom cursor on first touch
                const cursor = document.getElementById('custom-cursor');
                if (cursor) cursor.style.display = 'none';
            }
        }, {passive: false});

        window.addEventListener('touchmove', (e) => {
            if(e.touches.length > 0) this.onTouchMove(e.touches[0]);
        }, {passive: false});

        window.addEventListener('touchend', () => {
             this.targetMouse.set(0, 0); 
             this.isHoveringTshirt = false;
             this.isHoveringFerro = false;
        });

        setTimeout(() => {
            const tshirtTrigger = document.getElementById('tshirt-trigger-area');
            if (tshirtTrigger) {
                tshirtTrigger.addEventListener('mouseenter', () => this.isHoveringTshirt = true);
                tshirtTrigger.addEventListener('mouseleave', () => this.isHoveringTshirt = false);
            }
            const ferroTrigger = document.getElementById('ferrofluid-trigger');
            if (ferroTrigger) {
                ferroTrigger.addEventListener('mouseenter', () => this.isHoveringFerro = true);
                ferroTrigger.addEventListener('mouseleave', () => this.isHoveringFerro = false);
            }
        }, 500);

        this.animate();
        // Removed duplicate resize listener from end
    }

    onTouchMove(touch) {
        this.targetMouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        this.targetMouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.blackHoleUniforms) {
            this.blackHoleUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        }
        if (this.ferroUniforms) {
            this.ferroUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        }
        if (typeof this.resizeTshirtOverlayCanvas === 'function') {
            this.resizeTshirtOverlayCanvas();
        }
        if (typeof this.resizeVoidUnderstageCanvas === 'function') {
            this.resizeVoidUnderstageCanvas();
        }
        if (typeof this.layoutShirtOutlines === 'function') {
            this.layoutShirtOutlines();
        }
    }

    initBlackHole() {
        // Increased geometry bounds to prevent the wide accretion disk from visibly cutting off at the edges
        const geometry = new THREE.PlaneGeometry(600, 600);
        this.blackHoleUniforms = {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: this.blackHoleUniforms,
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                varying vec2 vUv;

                float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
                float noise(vec2 p) {
                    vec2 i = floor(p); vec2 f = fract(p);
                    vec2 u = f*f*(3.0-2.0*f);
                    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
                }

                void main() {
                    // UV multiplier matched to geometry stretch to preserve exact rendering scale but add margin
                    vec2 uv = (vUv - 0.5) * 4.0;
                    float r = length(uv);
                    
                    // Refraction Gravitational Lens
                    float refraction = 0.4 / (r + 0.1);
                    vec2 refractedUv = vUv + normalize(uv) * refraction * 0.1;

                    // Event Horizon
                    float eh = 0.22;
                    float blackHole = smoothstep(eh - 0.005, eh + 0.005, r);
                    
                    // Accretion Disk (Seamless Swirl)
                    float disk_r = length(uv * vec2(1.0, 3.0)); 
                    float swirl = disk_r * 3.0 - uTime * 0.6;
                    float s = sin(swirl);
                    float c = cos(swirl);
                    mat2 rot = mat2(c, -s, s, c);
                    vec2 rotatedUv = rot * (uv * vec2(1.0, 3.0));
                    float gas = noise(rotatedUv * 6.0) * 0.5 + 0.5;
                    float disk_glow = smoothstep(eh, eh + 0.8, disk_r) * smoothstep(eh + 1.5, eh + 0.6, disk_r);
                    
                    // Grain
                    float grain = noise(uv * 100.0 + fract(uTime)) * 0.04;
                    
                    vec3 finalColor = vec3(disk_glow * gas * 1.8);
                    finalColor *= blackHole;
                    finalColor += grain;

                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            transparent: true,
            depthWrite: false
        });

        this.blackHole = new THREE.Mesh(geometry, material);
        this.blackHole.position.z = -150;
        this.blackHole.position.y = 40;
        this.scene.add(this.blackHole);
    }

    initStars() {
        this.starCount = 1500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.starCount * 3);
        const bases = new Float32Array(this.starCount * 3);
        const sizes = new Float32Array(this.starCount);
        const opacities = new Float32Array(this.starCount);

        for(let i=0; i<this.starCount; i++) {
            const x = (Math.random() - 0.5) * 800;
            const y = (Math.random() - 0.5) * 800;
            const z = (Math.random() - 0.5) * 400 - 100;
            
            positions[i*3] = x;
            positions[i*3+1] = y;
            positions[i*3+2] = z;
            
            bases[i*3] = x;
            bases[i*3+1] = y;
            bases[i*3+2] = z;
            
            sizes[i] = Math.random() * 2.5 + 0.5;
            opacities[i] = Math.random() * 0.8 + 0.2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: `
                attribute float size;
                attribute float opacity;
                varying float vOpacity;
                uniform float uTime;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (200.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                    vOpacity = opacity * (0.8 + 0.2 * sin(uTime * 2.0 + position.x));
                }
            `,
            fragmentShader: `
                varying float vOpacity;
                void main() {
                    float d = distance(gl_PointCoord, vec2(0.5));
                    if(d > 0.5) discard;
                    gl_FragColor = vec4(1.0, 1.0, 1.0, vOpacity * smoothstep(0.5, 0.2, d));
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.starSystem = new THREE.Points(geometry, material);
        this.scene.add(this.starSystem);
        this.starPositions = positions;
        this.starBases = bases;
        this.starVelocities = new Float32Array(this.starCount * 3);
    }

    initParticleLogo() {
        const image = new Image();
        image.src = 'hero-logo.png';
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            const positions = [];
            const bases = [];
            const colors = [];

            // Sampling every 2px to keep it silky yet dense
            for (let y = 0; y < canvas.height; y += 2) {
                for (let x = 0; x < canvas.width; x += 2) {
                    const idx = (y * canvas.width + x) * 4;
                    const r = data[idx];
                    const g = data[idx+1];
                    const b = data[idx+2];
                    const a = data[idx+3];
                    
                    // Filter for significantly visible WHITE pixels (exclude pure black backdrops from JPGs/PNGs)
                    if (a > 180 && r > 100 && g > 100 && b > 100) {
                        // Center and slightly enlarge for hero status
                        const worldX = (x - canvas.width / 2) * 0.18;
                        const worldY = -(y - canvas.height / 2) * 0.18;
                        positions.push(worldX, worldY, (Math.random()-0.5)*0.3);
                        bases.push(worldX, worldY, 0);
                        colors.push(r/255, g/255, b/255);
                    }
                }
            }

            this.logoCount = positions.length / 3;
            const geo = new THREE.BufferGeometry();
            this.logoPositions = new Float32Array(positions);
            this.logoBases = new Float32Array(bases);
            this.logoVelocities = new Float32Array(this.logoCount * 3);
            
            geo.setAttribute('position', new THREE.BufferAttribute(this.logoPositions, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

            const mat = new THREE.PointsMaterial({ 
                size: 0.5, // Finer particles for silky feel
                vertexColors: true, 
                transparent: true, 
                opacity: 0.8,
                depthWrite: false
            });
            this.logoSystem = new THREE.Points(geo, mat);
            // Positioned higher (y=50) & closer (z=-80) to the black hole's center
            this.logoSystem.position.set(0, 50, -80);
            this.scene.add(this.logoSystem);
        };
    }

    initTShirt() {
        const loader = new THREE.TextureLoader();
        const geometry = new THREE.PlaneGeometry(120, 120, 64, 64);
        this.tshirtUniforms = {
            uTime: { value: 0 },
            uFrontTexture: { value: loader.load('front.png') },
            uBackTexture: { value: loader.load('back.png') },
            uHover: { value: 0 },
            uInvertVariant: { value: 0 },
            uFinishGlow: { value: 0.15 },
            uBlackHolePos: { value: new THREE.Vector3(0, 40, -150) },
            uRimColor: { value: new THREE.Color(0xd0d0d0) }
        };

        this.tshirtMaterial = new THREE.ShaderMaterial({
            uniforms: this.tshirtUniforms,
            vertexShader: `
                uniform float uTime;
                uniform vec3 uBlackHolePos;
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                varying float vDistToBH;

                void main() {
                    vUv = uv;
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);
                    vDistToBH = distance(worldPos.xyz, uBlackHolePos);
                    float warp = smoothstep(180.0, 50.0, vDistToBH);
                    worldPos.xyz += normalize(uBlackHolePos - worldPos.xyz) * warp * 12.0;
                    worldPos.z += sin(uTime * 1.5 + position.x * 0.05) * 2.5;
                    vec4 mvPosition = viewMatrix * worldPos;
                    vViewPosition = -mvPosition.xyz;
                    vNormal = normalMatrix * normal;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D uFrontTexture;
                uniform sampler2D uBackTexture;
                uniform float uTime;
                uniform float uHover;
                uniform float uInvertVariant;
                uniform float uFinishGlow;
                uniform vec3 uRimColor;
                varying vec2 vUv;
                varying vec3 vNormal, vViewPosition;

                void main() {
                    vec2 uv = vUv;
                    if (!gl_FrontFacing) uv.x = 1.0 - uv.x;
                    vec4 tex = gl_FrontFacing ? texture2D(uFrontTexture, uv) : texture2D(uBackTexture, uv);

                    float baseAvg = dot(tex.rgb, vec3(1.0/3.0));
                    float invAvg = dot(vec3(1.0) - tex.rgb, vec3(1.0/3.0));
                    if (tex.a < 0.1 || (uInvertVariant < 0.5 ? baseAvg : invAvg) > 0.98) discard;

                    vec3 rgb = tex.rgb;
                    if (uInvertVariant > 0.5) rgb = vec3(1.0) - rgb;
                    
                    vec3 normal = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
                    float rim = pow(1.0 - max(dot(normalize(vViewPosition), normal), 0.0), 3.5);
                    float noise = fract(sin(dot(vUv, vec2(12.7, 7.8))) * 437.5 + uTime * 0.5);
                    if (noise < uHover * 0.4) discard;
                    
                    float finish = clamp(uFinishGlow, 0.0, 1.0);
                    vec3 finishTint = vec3(0.75, 0.9, 1.1) * finish * 0.25;
                    vec3 outRgb = rgb + rim * uRimColor * (2.0 + finish * 3.0) + finishTint;
                    gl_FragColor = vec4(outRgb, tex.a);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.tshirtMesh = new THREE.Mesh(geometry, this.tshirtMaterial);
        this.tshirtMesh.position.set(0, -80, -50);
        this.scene.add(this.tshirtMesh);
        this.tshirtMesh.visible = false;

        this.tshirtTargetRotation = new THREE.Euler(0, 0, 0);
    }

    initFerrofluid() {
        const geometry = new THREE.PlaneGeometry(2, 2);
        this.ferroUniforms = {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uCursor: { value: new THREE.Vector2(0, 0) },
            uTilt: { value: new THREE.Vector2(0, 0) },
            uHover: { value: 0 }
        };

        this.ferroMaterial = new THREE.ShaderMaterial({
            uniforms: this.ferroUniforms,
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec2 uResolution;
                uniform vec2 uMouse;
                uniform vec2 uCursor;
                uniform vec2 uTilt;
                uniform float uHover;
                varying vec2 vUv;

                #define MAX_STEPS 64
                #define SURFACE_DIST 0.001
                #define MAX_DIST 10.0

                // Better Noise for Ferrofluid
                float hash(vec3 p) {
                    p = fract(p * vec3(123.34, 456.21, 789.18));
                    p += dot(p, p.yzx + 45.32);
                    return fract((p.x + p.y) * p.z);
                }

                float sdSphere(vec3 p, float s) { return length(p) - s; }

                float getDist(vec3 p) {
                    float t = uTime * 0.5;
                    
                    // Magnet Interaction (uMouse)
                    float distToMagnet = length(p.xy - uMouse * 1.5);
                    float magnetPull = exp(-distToMagnet * 3.0) * uHover;
                    
                    // Anti-Magnet Interaction (uCursor)
                    float distToCursor = length(p.xy - uCursor * 1.5);
                    float cursorRepel = exp(-distToCursor * 4.0) * 0.8;

                    // Base Sphere
                    float sphere = sdSphere(p, 0.6);
                    
                    // Spikes logic
                    vec3 sp = p * 12.0;
                    float spikes = sin(sp.x + t) * sin(sp.y + t) * sin(sp.z + t);
                    spikes = pow(max(0.0, spikes), 4.0) * (0.3 + magnetPull * 1.2);
                    
                    sphere -= spikes;
                    sphere += cursorRepel; // Hollowing out
                    
                    return sphere * 0.5;
                }

                vec3 getNormal(vec3 p) {
                    vec2 e = vec2(0.01, 0);
                    float d = getDist(p);
                    vec3 n = d - vec3(getDist(p-e.xyy), getDist(p-e.yxy), getDist(p-e.yyx));
                    return normalize(n);
                }

                void main() {
                    vec2 uv = (vUv - 0.5) * 2.0;
                    uv.x *= uResolution.x / uResolution.y;
                    
                    vec3 ro = vec3(0, 0, -2.5);
                    vec3 rd = normalize(vec3(uv, 1.5));
                    
                    float dO = 0.0;
                    for(int i=0; i<MAX_STEPS; i++) {
                        vec3 p = ro + rd * dO;
                        float dS = getDist(p);
                        dO += dS;
                        if(dO > MAX_DIST || dS < SURFACE_DIST) break;
                    }
                    
                    vec3 col = vec3(0.01); // Background deep black
                    
                    if(dO < MAX_DIST) {
                        vec3 p = ro + rd * dO;
                        vec3 n = getNormal(p);
                        
                        // Specular Light (Tilt aware)
                        vec3 lightPos = vec3(uTilt.x * 2.0, uTilt.y * 2.0 + 2.0, -3.0);
                        vec3 l = normalize(lightPos - p);
                        vec3 r = reflect(-l, n);
                        vec3 v = normalize(ro - p);
                        
                        float spec = pow(max(0.0, dot(v, r)), 40.0);
                        float rim = pow(1.0 - max(0.0, dot(v, n)), 4.0);
                        
                        // Deep black body with white specular at tips
                        col = vec3(0.02) + vec3(1.0) * spec * 0.8 + vec3(1.0) * rim * 0.1;
                        
                        // Anti-magnet Reactive Glow
                        float distToCursor = length(p.xy - uCursor * 1.5);
                        float glow = exp(-distToCursor * 8.0);
                        col += vec3(0.8, 0.9, 1.0) * glow * 0.2;
                    }
                    
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
            transparent: true
        });

        this.ferroMesh = new THREE.Mesh(geometry, this.ferroMaterial);
        this.ferroMesh.position.z = -5; // Behind main elements but in view when scrolled
        
        // We'll manually update its position to follow the scroll in animate
        this.scene.add(this.ferroMesh);
    }

    initGyroscope() {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requires permission
            window.addEventListener('click', () => {
                DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response == 'granted') {
                        window.addEventListener('deviceorientation', (e) => this.onGyro(e));
                    }
                }).catch(console.error);
            }, { once: true });
        } else {
            window.addEventListener('deviceorientation', (e) => this.onGyro(e));
        }
    }

    onGyro(e) {
        // Normalize tilt data
        this.tilt.x = e.gamma / 45; // -1 to 1 range approx
        this.tilt.y = e.beta / 45;
    }

    initEmailAutomation() {
        const form = document.getElementById('news-form-container');
        if (!form) return;

        const emailInput = document.getElementById('email-input');
        const newsStatus = document.getElementById('news-status');
        const submitBtn = form.querySelector('.news-submit');

        const storedEmail = localStorage.getItem('void_subscribed');
        if (storedEmail && newsStatus) {
            form.style.display = 'none';
            newsStatus.innerHTML = `Thank you for joining VOID.<br><strong>${storedEmail}</strong>`;
            newsStatus.style.opacity = '1';
            newsStatus.style.color = '#fff';
            newsStatus.style.fontWeight = '700';
            newsStatus.style.textTransform = 'uppercase';
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!emailInput?.value?.includes('@')) {
                if (newsStatus) {
                    newsStatus.textContent = 'Please enter a valid email address.';
                    newsStatus.style.color = '#ff6666';
                }
                return;
            }

            if (submitBtn) submitBtn.textContent = 'Sending…';
            if (newsStatus) newsStatus.style.color = 'rgba(255,255,255,0.6)';

            try {
                const res = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailInput.value.trim() })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'Send failed');

                localStorage.setItem('void_subscribed', emailInput.value.trim());
                form.style.display = 'none';
                if (newsStatus) {
                    newsStatus.innerHTML = `Thank you for joining VOID.<br><strong>${emailInput.value.trim()}</strong>`;
                    newsStatus.style.color = '#fff';
                    newsStatus.style.fontWeight = '700';
                    newsStatus.style.textTransform = 'uppercase';
                }
            } catch (err) {
                // Graceful fallback: keep UX positive even if local API is unavailable.
                localStorage.setItem('void_subscribed', emailInput.value.trim());
                form.style.display = 'none';
                if (newsStatus) {
                    newsStatus.innerHTML = `You’re in.<br><strong>${emailInput.value.trim()}</strong>`;
                    newsStatus.style.color = '#fff';
                    newsStatus.style.fontWeight = '700';
                    newsStatus.style.textTransform = 'uppercase';
                }
                if (submitBtn) submitBtn.textContent = 'Submit';
            }
        });
    }

    initVoidPressHint() {
        this.voidPressBurstUntil = 0;
        const hintBtn = document.getElementById('void-press-hint');
        if (!hintBtn) return;
        hintBtn.addEventListener('click', () => {
            this.voidPressBurstUntil = performance.now() + 1800;
            // Optional subtle CTA behavior: jump to archive after burst starts.
            const archive = document.getElementById('archive');
            if (archive) {
                archive.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    initTshirtViewportOverlay() {
        this.tshirtOverlayCanvas = document.getElementById('tshirt-viewport-overlay');
        if (!this.tshirtOverlayCanvas) return;
        this.tshirtOverlayCtx = this.tshirtOverlayCanvas.getContext('2d');
        this.overlayW = 0;
        this.overlayH = 0;

        this.resizeTshirtOverlayCanvas = () => {
            const parent = this.tshirtOverlayCanvas.parentElement;
            if (!parent || !this.tshirtOverlayCtx) return;
            const r = parent.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.overlayW = r.width;
            this.overlayH = r.height;
            this.tshirtOverlayCanvas.width = Math.max(1, r.width * dpr);
            this.tshirtOverlayCanvas.height = Math.max(1, r.height * dpr);
            this.tshirtOverlayCanvas.style.width = `${r.width}px`;
            this.tshirtOverlayCanvas.style.height = `${r.height}px`;
            this.tshirtOverlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        this.resizeTshirtOverlayCanvas();
    }

    initVoidUnderstageCanvas() {
        this.understageCanvas = document.getElementById('void-understage-canvas');
        if (!this.understageCanvas) return;

        this.understageCtx = this.understageCanvas.getContext('2d', { alpha: true });
        this.underW = 0;
        this.underH = 0;
        this.underDpr = 1;

        this.underParticles = [];
        this.underBursts = [];

        this.resizeVoidUnderstageCanvas = () => {
            const wrap = document.getElementById('void-understage');
            if (!wrap || !this.understageCtx) return;
            const r = wrap.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.underDpr = dpr;

            this.underW = Math.max(1, Math.round(r.width * dpr));
            this.underH = Math.max(1, Math.round(r.height * dpr));
            this.understageCanvas.width = this.underW;
            this.understageCanvas.height = this.underH;
            this.understageCanvas.style.width = `${Math.round(r.width)}px`;
            this.understageCanvas.style.height = `${Math.round(r.height)}px`;

            // Re-seed particles for the new size.
            const isMobile = window.innerWidth < 900;
            const count = isMobile ? 18 : 28;
            this.underParticles = [];
            for (let i = 0; i < count; i++) {
                this.underParticles.push({
                    x: Math.random() * this.underW,
                    y: Math.random() * this.underH,
                    vx: (Math.random() - 0.5) * 0.12,
                    vy: (Math.random() - 0.5) * 0.12
                });
            }
        };

        this.resizeVoidUnderstageCanvas();

        const wrap = document.getElementById('void-understage');
        if (!wrap) return;

        // Pointer bursts (fun) without blocking scroll.
        const addBurstAt = (clientX, clientY) => {
            const r = wrap.getBoundingClientRect();
            const x = clientX - r.left;
            const y = clientY - r.top;
            const dpr = this.underDpr || 1;
            this.underBursts.push({ x: x * dpr, y: y * dpr, born: performance.now() });
            if (this.underBursts.length > 8) this.underBursts.shift();
        };

        wrap.addEventListener('pointerdown', (e) => {
            // Only primary interactions.
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            addBurstAt(e.clientX, e.clientY);
        });
        wrap.addEventListener('pointermove', (e) => {
            // Keep it alive while moving.
            if (e.buttons === 1) addBurstAt(e.clientX, e.clientY);
        });
    }

    drawVoidUnderstageCanvas(elapsed) {
        if (!this.understageCanvas || !this.understageCtx || !this.underW || !this.underH) return;

        const ctx = this.understageCtx;
        ctx.clearRect(0, 0, this.underW, this.underH);

        const isMobile = window.innerWidth < 900;
        const nx = (this.targetMouse.x + 1) / 2;
        const ny = (-this.targetMouse.y + 1) / 2;
        const cx = nx * this.underW;
        const cy = ny * this.underH;

        // Soft dark wash to keep it behind text.
        const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(this.underW, this.underH) * 0.65);
        wash.addColorStop(0, 'rgba(255,255,255,0.05)');
        wash.addColorStop(0.35, 'rgba(255,255,255,0.015)');
        wash.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, this.underW, this.underH);

        // Update particles (metaball-ish field)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.underParticles) {
            const dx = cx - p.x;
            const dy = cy - p.y;
            const dist = Math.hypot(dx, dy) + 0.0001;
            const pull = Math.min(1400 / dist, 1.3);

            // Flow noise
            const flow = 0.6 + 0.4 * Math.sin(elapsed * 0.55 + (p.x + p.y) * 0.0008);
            p.vx += (dx / dist) * 0.015 * pull * flow;
            p.vy += (dy / dist) * 0.012 * pull * flow;

            p.vx *= isMobile ? 0.92 : 0.9;
            p.vy *= isMobile ? 0.92 : 0.9;
            p.x += p.vx;
            p.y += p.vy;

            // Soft bounds
            if (p.x < -30) p.x = this.underW + 30;
            if (p.x > this.underW + 30) p.x = -30;
            if (p.y < -30) p.y = this.underH + 30;
            if (p.y > this.underH + 30) p.y = -30;

            const r = 10 + pull * 18;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            g.addColorStop(0, 'rgba(255,255,255,0.10)');
            g.addColorStop(0.4, 'rgba(255,255,255,0.03)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw bursts as expanding rings.
        if (this.underBursts && this.underBursts.length) {
            const now = performance.now();
            for (const b of this.underBursts) {
                const age = (now - b.born) / 1000;
                if (age > 1.8) continue;
                const rr = age * (isMobile ? 90 : 120) * (this.underDpr || 1);
                const a = Math.max(0, 0.22 - age * 0.12);
                ctx.strokeStyle = `rgba(255,255,255,${a})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(b.x, b.y, rr, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.restore();

        // Subtle scanlines for texture.
        ctx.save();
        ctx.globalAlpha = isMobile ? 0.08 : 0.06;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        const dpr = this.underDpr || 1;
        const step = (isMobile ? 18 : 14) * dpr;
        for (let y = 0; y < this.underH; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.underW, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    initShirtOutlineLayer() {
        this.shirtRipples = [];
        this._shirtTouchX = null;
        this._shirtTouchY = null;
        this.canvFront = document.getElementById('shirt-outline-front');
        this.canvBack = document.getElementById('shirt-outline-back');
        this.shirtStageEl = document.querySelector('.shirt-3d-stage');
        this.shirtUserYaw = 0; // user rotation offset (radians)
        this.shirtUserPitch = -0.12; // user rotation offset (radians)
        this.shirtIsDragging = false;
        this.shirtLastX = 0;
        this.shirtLastY = 0;
        this._outlineFrontBitmap = null;
        this._outlineBackBitmap = null;
        this._frontImgEl = null;
        this._backImgEl = null;

        const loadImg = (src) =>
            new Promise((resolve, reject) => {
                const im = new Image();
                im.onload = () => resolve(im);
                im.onerror = reject;
                im.src = src;
            });

        Promise.all([loadImg('front.png'), loadImg('back.png')])
            .then(([f, b]) => {
                this._frontImgEl = f;
                this._backImgEl = b;
                if (typeof this.updateTeePreviewFromConfig === 'function') {
                    this.updateTeePreviewFromConfig();
                } else {
                    this.regenerateShirtOutlineBitmaps();
                    this.layoutShirtOutlines();
                }
            })
            .catch(() => {});

        const area = document.getElementById('tshirt-trigger-area');
        if (!area) return;

        const localPoint = (clientX, clientY) => {
            const r = area.getBoundingClientRect();
            return { x: clientX - r.left, y: clientY - r.top };
        };

        area.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            this.shirtIsDragging = true;
            this.shirtLastX = e.clientX;
            this.shirtLastY = e.clientY;
            try { area.setPointerCapture(e.pointerId); } catch (_) {}
        });

        area.addEventListener('pointermove', (e) => {
            if (!this.shirtIsDragging) return;
            const dx = e.clientX - this.shirtLastX;
            const dy = e.clientY - this.shirtLastY;
            this.shirtLastX = e.clientX;
            this.shirtLastY = e.clientY;

            // Yaw around the vertical axis, pitch around horizontal axis.
            this.shirtUserYaw += dx * 0.006;
            this.shirtUserPitch += dy * 0.004;
            const limit = 0.62;
            this.shirtUserPitch = Math.max(-limit, Math.min(limit, this.shirtUserPitch));
        });

        const endDrag = () => { this.shirtIsDragging = false; };
        area.addEventListener('pointerup', endDrag);
        area.addEventListener('pointercancel', endDrag);

        area.addEventListener(
            'touchstart',
            (e) => {
                if (e.touches[0]) {
                    const p = localPoint(e.touches[0].clientX, e.touches[0].clientY);
                    this._shirtTouchX = p.x;
                    this._shirtTouchY = p.y;
                    this.addShirtRipple(p.x, p.y);
                }
            },
            { passive: true }
        );
        area.addEventListener(
            'touchmove',
            (e) => {
                if (e.touches[0]) {
                    const p = localPoint(e.touches[0].clientX, e.touches[0].clientY);
                    this._shirtTouchX = p.x;
                    this._shirtTouchY = p.y;
                }
            },
            { passive: true }
        );
        area.addEventListener(
            'touchend',
            () => {
                this._shirtTouchX = null;
                this._shirtTouchY = null;
            },
            { passive: true }
        );
        area.addEventListener('mousedown', (e) => {
            const p = localPoint(e.clientX, e.clientY);
            this.addShirtRipple(p.x, p.y);
        });
    }

    addShirtRipple(x, y) {
        if (!this.shirtRipples) this.shirtRipples = [];
        this.shirtRipples.push({ x, y, born: performance.now() });
        if (this.shirtRipples.length > 10) this.shirtRipples.shift();
    }

    extractShirtOutlineFromImage(img, invertLuminance) {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return null;
        const tc = document.createElement('canvas');
        tc.width = w;
        tc.height = h;
        const tctx = tc.getContext('2d');
        tctx.drawImage(img, 0, 0);
        const { data } = tctx.getImageData(0, 0, w, h);
        const fg = new Uint8Array(w * h);
        const idx = (x, y) => (y * w + x) * 4;
        const isFg = (x, y) => {
            if (x < 0 || y < 0 || x >= w || y >= h) return false;
            const i = idx(x, y);
            const a = data[i + 3];
            if (a < 40) return false;
            let L = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (invertLuminance) L = 255 - L;
            return L < 245;
        };
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                fg[y * w + x] = isFg(x, y) ? 1 : 0;
            }
        }
        const edge = new Uint8Array(w * h);
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const p = y * w + x;
                if (!fg[p]) continue;
                if (!fg[p - 1] || !fg[p + 1] || !fg[p - w] || !fg[p + w]) edge[p] = 1;
            }
        }
        const thick = new Uint8Array(edge);
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const p = y * w + x;
                if (edge[p]) continue;
                if (edge[p - 1] || edge[p + 1] || edge[p - w] || edge[p + w]) thick[p] = 1;
            }
        }
        const out = tctx.createImageData(w, h);
        const o = out.data;
        for (let p = 0; p < w * h; p++) {
            if (!thick[p]) continue;
            const j = p * 4;
            o[j] = o[j + 1] = o[j + 2] = o[j + 3] = 255;
        }
        const oc = document.createElement('canvas');
        oc.width = w;
        oc.height = h;
        oc.getContext('2d').putImageData(out, 0, 0);
        return oc;
    }

    regenerateShirtOutlineBitmaps() {
        if (!this._frontImgEl || !this._backImgEl) return;
        const inv = this.activeConfig && this.activeConfig.variant === 'pure-white';
        this._outlineFrontBitmap = this.extractShirtOutlineFromImage(this._frontImgEl, inv);
        this._outlineBackBitmap = this.extractShirtOutlineFromImage(this._backImgEl, inv);
    }

    layoutShirtOutlines() {
        if (!this.canvFront || !this.canvBack || !this._outlineFrontBitmap || !this._outlineBackBitmap) return;
        const stage = this.shirtStageEl || document.querySelector('.shirt-3d-stage');
        if (!stage) return;

        const stageRect = stage.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        // Clamp internal canvas resolution for performance.
        const internalMaxPx = 1700;
        const baseW = stageRect.width * dpr;
        const baseH = stageRect.height * dpr;
        const scaleDown = Math.min(1, internalMaxPx / Math.max(baseW, baseH));
        const internalW = Math.max(1, Math.round(baseW * scaleDown));
        const internalH = Math.max(1, Math.round(baseH * scaleDown));

        const drawInto = (canvas, bmp) => {
            const bw = bmp.width;
            const bh = bmp.height;
            canvas.width = internalW;
            canvas.height = internalH;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            const ctx = canvas.getContext('2d');
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const sc = Math.min(internalW / bw, internalH / bh);
            const dw = bw * sc;
            const dh = bh * sc;
            const dx = (internalW - dw) * 0.5;
            const dy = (internalH - dh) * 0.5;
            ctx.drawImage(bmp, 0, 0, bw, bh, dx, dy, dw, dh);
        };

        drawInto(this.canvFront, this._outlineFrontBitmap);
        drawInto(this.canvBack, this._outlineBackBitmap);
    }

    updateShirtStageRotation(elapsed) {
        if (!this.shirtStageEl) return;
        const autoYaw = elapsed * 0.16; // slow cinematic spin
        const yaw = autoYaw + this.shirtUserYaw;
        const pitch = this.shirtUserPitch;

        const toDeg = (rad) => (rad * 180) / Math.PI;
        this.shirtStageEl.style.setProperty('--shirt-ry', `${toDeg(yaw)}deg`);
        this.shirtStageEl.style.setProperty('--shirt-rx', `${toDeg(pitch)}deg`);
    }

    drawTshirtViewportOverlay(elapsed) {
        if (!this.tshirtOverlayCanvas || !this.tshirtOverlayCtx || !this.overlayW) return;
        const ctx = this.tshirtOverlayCtx;
        const w = this.overlayW;
        const h = this.overlayH;
        ctx.clearRect(0, 0, w, h);

        const area = document.getElementById('tshirt-trigger-area');
        if (!area) return;
        const rect = area.getBoundingClientRect();
        let mx = this.cursorPos.x - rect.left;
        let my = this.cursorPos.y - rect.top;
        if (this._shirtTouchX != null && this._shirtTouchY != null) {
            mx = this._shirtTouchX;
            my = this._shirtTouchY;
        }

        const now = performance.now();

        // Ambient drift wash (full frame)
        const wash = ctx.createLinearGradient(0, 0, w, h);
        const p = 0.5 + 0.5 * Math.sin(elapsed * 0.28);
        wash.addColorStop(0, `rgba(255,255,255,${0.018 + p * 0.012})`);
        wash.addColorStop(0.5, `rgba(255,255,255,${0.006 + (1 - p) * 0.01})`);
        wash.addColorStop(1, `rgba(255,255,255,${0.014 + p * 0.008})`);
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // Touch / cursor ripples (concentric, editorial)
        if (this.shirtRipples && this.shirtRipples.length) {
            this.shirtRipples = this.shirtRipples.filter((r) => now - r.born < 2600);
            for (const r of this.shirtRipples) {
                const age = (now - r.born) / 1000;
                for (let k = 0; k < 4; k++) {
                    const rad = (age - k * 0.22) * Math.min(w, h) * 0.18;
                    if (rad < 2 || rad > Math.min(w, h) * 0.55) continue;
                    const a = Math.max(0, 0.1 - age * 0.028 - k * 0.018);
                    ctx.strokeStyle = `rgba(255,255,255,${a})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }

        // Elastic lattice — pulls toward pointer / finger, fewer cells on phone
        const targetCells = w < 520 ? 200 : 340;
        const step = Math.max(36, Math.min(54, Math.sqrt((w * h) / targetCells)));
        const cols = Math.ceil(w / step);
        const rows = Math.ceil(h / step);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let j = 0; j < rows; j++) {
            for (let i = 0; i < cols; i++) {
                const bx = i * step + step * 0.5;
                const by = j * step + step * 0.5;
                const dx = mx - bx;
                const dy = my - by;
                const dist = Math.hypot(dx, dy) + 80;
                const pull = Math.min(200 / dist, 1.1);
                const wave = Math.sin(elapsed * 1.1 + bx * 0.015 + by * 0.012) * 3.5;
                const ox = bx + (dx / dist) * pull * 22 + wave * pull;
                const oy = by + (dy / dist) * pull * 18 + Math.cos(elapsed * 0.9 + by * 0.014) * 3 * pull;

                const alpha = 0.05 + pull * 0.09;
                ctx.fillStyle = `rgba(255,255,255,${Math.min(alpha, 0.18)})`;
                ctx.beginPath();
                ctx.arc(ox, oy, w < 520 ? 0.9 : 1.1, 0, Math.PI * 2);
                ctx.fill();

                if (i < cols - 1) {
                    const bx2 = (i + 1) * step + step * 0.5;
                    const d2x = mx - bx2;
                    const d2y = my - (j * step + step * 0.5);
                    const d2 = Math.hypot(d2x, d2y) + 80;
                    const p2 = Math.min(200 / d2, 1.1);
                    const ox2 = bx2 + (d2x / d2) * p2 * 22 + Math.sin(elapsed * 1.1 + bx2 * 0.015) * 3.5 * p2;
                    const oy2 = j * step + step * 0.5 + (d2y / d2) * p2 * 18;
                    ctx.strokeStyle = `rgba(255,255,255,${0.028 + Math.min(pull, p2) * 0.05})`;
                    ctx.lineWidth = 0.45;
                    ctx.beginPath();
                    ctx.moveTo(ox, oy);
                    ctx.lineTo(ox2, oy2);
                    ctx.stroke();
                }
                if (j < rows - 1) {
                    const by2 = (j + 1) * step + step * 0.5;
                    const d3x = mx - bx;
                    const d3y = my - by2;
                    const d3 = Math.hypot(d3x, d3y) + 80;
                    const p3 = Math.min(200 / d3, 1.1);
                    const ox3 = bx + (d3x / d3) * p3 * 22;
                    const oy3 = by2 + (d3y / d3) * p3 * 18 + Math.cos(elapsed * 0.9 + by2 * 0.014) * 3 * p3;
                    ctx.strokeStyle = `rgba(255,255,255,${0.025 + Math.min(pull, p3) * 0.045})`;
                    ctx.lineWidth = 0.45;
                    ctx.beginPath();
                    ctx.moveTo(ox, oy);
                    ctx.lineTo(ox3, oy3);
                    ctx.stroke();
                }
            }
        }

        ctx.restore();

        const grd = ctx.createRadialGradient(mx, my, 0, mx, my, Math.min(w, h) * 0.42);
        grd.addColorStop(0, 'rgba(255,255,255,0.055)');
        grd.addColorStop(0.35, 'rgba(255,255,255,0.012)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.28)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
    }

    initArchiveAndOptions() {
        this.basePrice = 25000;
        this.archiveKey = 'void_archive_v1';

        // ---- Archive (cart) UI refs ----
        this.cartSidebar = document.getElementById('cart-sidebar');
        this.cartToggle = document.getElementById('cart-toggle');
        this.cartClose = document.getElementById('cart-close');
        this.cartItems = document.getElementById('cart-items');
        this.cartCountEl = document.getElementById('cart-count');
        this.cartSubtotalEl = document.getElementById('cart-subtotal');
        this.cartTotalEl = document.getElementById('cart-total-value');
        this.cartNotification = document.getElementById('cart-notification');

        const openCart = () => this.cartSidebar?.classList.add('open');
        const closeCart = () => this.cartSidebar?.classList.remove('open');

        if (this.cartToggle) {
            this.cartToggle.addEventListener('click', (e) => {
                e.preventDefault();
                openCart();
            });
        }
        if (this.cartClose) {
            this.cartClose.addEventListener('click', closeCart);
        }

        this.loadArchiveItems = () => {
            try {
                const raw = localStorage.getItem(this.archiveKey);
                const parsed = raw ? JSON.parse(raw) : [];
                if (!Array.isArray(parsed)) return [];
                return parsed.map((it) => ({
                    ...it,
                    qty: Number(it.qty) > 0 ? Number(it.qty) : 1
                }));
            } catch (_) {
                return [];
            }
        };
        this.saveArchiveItems = (items) => {
            try {
                localStorage.setItem(this.archiveKey, JSON.stringify(items));
            } catch (_) {}
        };

        this.variantLabel = (v) => (v === 'pure-white' ? 'PURE WHITE' : 'CORE BLACK');
        this.finishLabel = (f) => {
            if (f === 'night-glow') return 'NIGHT GLOW';
            if (f === 'ion-sheen') return 'ION SHEEN';
            return 'MATTE INK';
        };

        this.formatTsh = (n) => `Tsh ${Number(n).toLocaleString()}`;

        // ---- Options Modal UI refs ----
        this.optionsModal = document.getElementById('options-modal');
        this.optionsBackdrop = document.getElementById('options-modal-backdrop');
        this.optionsCloseBtn = document.getElementById('options-close-btn');
        this.optionsAddToCartBtn = document.getElementById('options-add-to-cart-btn');
        this.optionsStatusText = document.getElementById('options-status-text');
        this.optionsPriceValue = document.getElementById('options-price-value');
        this.tshirtConfigDisplayEl = document.getElementById('tshirt-config-display');

        this.sizeYOffsetMap = { XS: 16, S: 10, M: 0, L: -10, XL: -18 };
        this.sizeScaleMap = { XS: 0.88, S: 0.96, M: 1.04, L: 1.14, XL: 1.22 };

        this.activeConfig = {
            productId: 'void-tee-drop-01',
            variant: 'core-black',
            size: null,
            finish: 'matte-ink'
        };

        const setPillSelected = (containerEl, selectedValue, attrName) => {
            if (!containerEl) return;
            containerEl.querySelectorAll('.option-pill').forEach((btn) => {
                const v = btn.dataset[attrName];
                btn.classList.toggle('selected', v === selectedValue);
            });
        };

        this.openOptionsModal = (ctx) => {
            if (!this.optionsModal) return;

            this.activeConfig.productId = ctx?.productId || 'void-tee-drop-01';
            this.activeConfig.variant = ctx?.variant || 'core-black';
            this.activeConfig.finish = 'matte-ink';
            this.activeConfig.size = null; // force picking size before add-to-cart

            const sizeContainer = document.getElementById('options-size-pills');
            const variantContainer = document.getElementById('options-variant-pills');
            const finishContainer = document.getElementById('options-finish-pills');

            setPillSelected(variantContainer, this.activeConfig.variant, 'variant');
            setPillSelected(finishContainer, this.activeConfig.finish, 'finish');
            // clear size selection
            if (sizeContainer) {
                sizeContainer.querySelectorAll('.option-pill').forEach((btn) => btn.classList.remove('selected'));
            }

            if (this.optionsStatusText) this.optionsStatusText.textContent = 'Select size';
            if (this.optionsPriceValue) this.optionsPriceValue.textContent = this.formatTsh(this.basePrice);
            if (this.optionsAddToCartBtn) this.optionsAddToCartBtn.disabled = true;

            this.updateTeePreviewFromConfig();
            this.updateTeeConfigDisplay();

            this.optionsModal.classList.add('open');
            this.optionsModal.setAttribute('aria-hidden', 'false');
        };

        this.closeOptionsModal = () => {
            if (!this.optionsModal) return;
            this.optionsModal.classList.remove('open');
            this.optionsModal.setAttribute('aria-hidden', 'true');
        };

        this.showCartNotification = () => {
            if (!this.cartNotification) return;
            this.cartNotification.classList.add('show');
            setTimeout(() => this.cartNotification.classList.remove('show'), 2000);
        };

        this.lineKey = (it) => `${it.productId}|${it.variant}|${it.size}|${it.finish}`;

        this.updateCartUI = () => {
            const items = this.archive || [];
            const totalQty = items.reduce((acc, it) => acc + (Number(it.qty) > 0 ? Number(it.qty) : 1), 0);

            if (this.cartCountEl) this.cartCountEl.textContent = String(totalQty);

            if (this.cartItems) {
                if (!items.length) {
                    this.cartItems.innerHTML = `<div class="empty-cart-msg">YOUR ARCHIVE IS EMPTY.</div>`;
                } else {
                    this.cartItems.innerHTML = items.map((it) => {
                        const qty = Number(it.qty) > 0 ? Number(it.qty) : 1;
                        const name = `VOID TEE DROP 01 // ${this.variantLabel(it.variant)}`;
                        const meta = `SIZE: ${it.size} // FINISH: ${this.finishLabel(it.finish)}`;
                        const lineTotal = (Number(it.price) || 0) * qty;
                        const priceEach = this.formatTsh(it.price);
                        const lineStr = this.formatTsh(lineTotal);
                        return `
                          <div class="cart-item" data-archive-id="${it.id}">
                            <div class="cart-item-row">
                              <div class="cart-item-info">
                                <span class="cart-item-name">${name}</span>
                                <span class="cart-item-price">${meta}</span>
                                <span class="cart-item-price" style="display:block; opacity:0.55; margin-top:0.35rem;">${priceEach} × ${qty} = ${lineStr}</span>
                              </div>
                              <div class="cart-item-controls">
                                <div class="cart-qty">
                                  <button type="button" class="cart-qty-btn" data-archive-action="dec" data-archive-id="${it.id}" aria-label="Decrease quantity">−</button>
                                  <span>${qty}</span>
                                  <button type="button" class="cart-qty-btn" data-archive-action="inc" data-archive-id="${it.id}" aria-label="Increase quantity">+</button>
                                </div>
                                <button type="button" class="cart-remove" data-archive-action="remove" data-archive-id="${it.id}">REMOVE</button>
                              </div>
                            </div>
                          </div>
                        `;
                    }).join('');
                }
            }

            const subtotal = items.reduce((acc, it) => {
                const q = Number(it.qty) > 0 ? Number(it.qty) : 1;
                return acc + (Number(it.price) || 0) * q;
            }, 0);
            if (this.cartSubtotalEl) this.cartSubtotalEl.textContent = this.formatTsh(subtotal);
            if (this.cartTotalEl) this.cartTotalEl.textContent = this.formatTsh(subtotal);
        };

        this.cartItems?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-archive-action]');
            if (!btn) return;
            const id = btn.dataset.archiveId;
            const action = btn.dataset.archiveAction;
            if (!id || !action) return;
            const items = this.archive || [];
            const idx = items.findIndex((x) => x.id === id);
            if (idx < 0) return;
            if (action === 'remove') {
                items.splice(idx, 1);
            } else if (action === 'inc') {
                items[idx].qty = (Number(items[idx].qty) > 0 ? Number(items[idx].qty) : 1) + 1;
            } else if (action === 'dec') {
                const q = (Number(items[idx].qty) > 0 ? Number(items[idx].qty) : 1) - 1;
                if (q <= 0) items.splice(idx, 1);
                else items[idx].qty = q;
            }
            this.archive = items;
            this.saveArchiveItems(this.archive);
            this.updateCartUI();
        });

        this.updateTeeConfigDisplay = () => {
            if (!this.tshirtConfigDisplayEl) return;
            const sizeText = this.activeConfig.size || '—';
            const fin = this.finishLabel(this.activeConfig.finish)
                .toLowerCase()
                .replace(/\b\w/g, (c) => c.toUpperCase());
            this.tshirtConfigDisplayEl.textContent = `Size ${sizeText} · ${fin}`;
        };

        this.updateTeePreviewFromConfig = () => {
            if (this.tshirtMesh && this.tshirtUniforms) {
                const isWhite = this.activeConfig.variant === 'pure-white';
                this.tshirtUniforms.uInvertVariant.value = isWhite ? 1 : 0;
                this.tshirtUniforms.uRimColor.value = isWhite ? new THREE.Color(0x2b2b2b) : new THREE.Color(0xd0d0d0);

                const finish = this.activeConfig.finish;
                const finishGlow =
                    finish === 'night-glow' ? 0.62 :
                    finish === 'ion-sheen' ? 0.36 :
                    0.12;
                this.tshirtUniforms.uFinishGlow.value = finishGlow;

                const size = this.activeConfig.size;
                const scale = size ? this.sizeScaleMap[size] : 1.0;
                this.tshirtMesh.scale.set(scale, scale, 1);
            }

            if (this._frontImgEl && this._backImgEl) {
                this.regenerateShirtOutlineBitmaps();
                this.layoutShirtOutlines();
            }

            if (this.shirtStageEl) {
                const size = this.activeConfig.size;
                const stageScale = size ? this.sizeScaleMap[size] : 1.0;
                this.shirtStageEl.style.setProperty('--shirt-s', String(stageScale));
            }
        };

        this.addToArchive = () => {
            if (!this.activeConfig.size) {
                if (this.optionsStatusText) this.optionsStatusText.textContent = 'Select size';
                return;
            }
            const candidate = {
                productId: this.activeConfig.productId,
                variant: this.activeConfig.variant,
                size: this.activeConfig.size,
                finish: this.activeConfig.finish,
                price: this.basePrice,
                addedAt: Date.now()
            };

            this.archive = this.archive || [];
            const key = this.lineKey(candidate);
            const existing = this.archive.find((x) => this.lineKey(x) === key);
            if (existing) {
                existing.qty = (Number(existing.qty) > 0 ? Number(existing.qty) : 1) + 1;
            } else {
                this.archive.push({
                    id: `void-${Math.random().toString(16).slice(2)}-${Date.now()}`,
                    ...candidate,
                    qty: 1
                });
            }
            this.saveArchiveItems(this.archive);

            this.updateCartUI();
            this.showCartNotification();
            this.closeOptionsModal();

            setTimeout(openCart, 450);
        };

        // ---- Event listeners (Modal + Picker) ----
        this.optionsBackdrop?.addEventListener('click', this.closeOptionsModal);
        this.optionsCloseBtn?.addEventListener('click', this.closeOptionsModal);
        this.optionsAddToCartBtn?.addEventListener('click', this.addToArchive);

        const sizeContainer = document.getElementById('options-size-pills');
        const variantContainer = document.getElementById('options-variant-pills');
        const finishContainer = document.getElementById('options-finish-pills');

        sizeContainer?.addEventListener('click', (e) => {
            const btn = e.target.closest('.option-pill');
            if (!btn) return;
            const size = btn.dataset.size;
            this.activeConfig.size = size;
            setPillSelected(sizeContainer, size, 'size');
            if (this.optionsAddToCartBtn) this.optionsAddToCartBtn.disabled = false;
            if (this.optionsStatusText) this.optionsStatusText.textContent = 'Ready';
            this.updateTeePreviewFromConfig();
            this.updateTeeConfigDisplay();
        });

        variantContainer?.addEventListener('click', (e) => {
            const btn = e.target.closest('.option-pill');
            if (!btn) return;
            const variant = btn.dataset.variant;
            this.activeConfig.variant = variant;
            setPillSelected(variantContainer, variant, 'variant');
            this.updateTeePreviewFromConfig();
            this.updateTeeConfigDisplay();
        });

        finishContainer?.addEventListener('click', (e) => {
            const btn = e.target.closest('.option-pill');
            if (!btn) return;
            const finish = btn.dataset.finish;
            this.activeConfig.finish = finish;
            setPillSelected(finishContainer, finish, 'finish');
            this.updateTeePreviewFromConfig();
            this.updateTeeConfigDisplay();
        });

        // ---- Choose options triggers ----
        document.querySelectorAll('.choose-options-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.openOptionsModal({
                    productId: btn.dataset.productId,
                    variant: btn.dataset.variant
                });
            });
        });

        const heroBtn = document.getElementById('hero-authenticate-btn');
        heroBtn?.addEventListener('click', () => {
            this.openOptionsModal({ productId: 'void-tee-drop-01', variant: 'core-black' });
        });

        // ---- Initialize ----
        this.archive = this.loadArchiveItems();
        this.updateCartUI();
        this.updateTeePreviewFromConfig();
        this.updateTeeConfigDisplay();
    }

    initCursor() {
        // Build white unfilled outline from the real object photo
        this.cursor = document.createElement('div');
        this.cursor.id = 'custom-cursor';
        document.body.appendChild(this.cursor);
        
        const photoIndex = Math.floor(Math.random() * 4) + 1;
        const img = new Image();
        img.src = `cursor_${photoIndex}.png`;
        img.onload = () => {
            const cvs = document.createElement('canvas');
            cvs.width = 64; cvs.height = 64;
            const ctx = cvs.getContext('2d');
            
            // Draw image scaled to fit
            const scale = Math.min(64 / img.width, 64 / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, (64-w)/2, (64-h)/2, w, h);
            
            const imgData = ctx.getImageData(0,0,64,64);
            const data = imgData.data;
            const edgeData = new Uint8ClampedArray(data.length);
            
            // Edge detection logic (white outline on transparent bg)
            for(let y=1; y<63; y++) {
                for(let x=1; x<63; x++) {
                    const i = (y*64+x)*4;
                    // Detect alpha or brightness differences (edge lines)
                    const iLeft = i - 4;
                    const iUp = i - 256;
                    
                    // Simple contrast check across RGB and Alpha
                    const diffX = Math.abs(data[i] - data[iLeft]) + Math.abs(data[i+3] - data[iLeft+3]);
                    const diffY = Math.abs(data[i] - data[iUp]) + Math.abs(data[i+3] - data[iUp+3]);
                    
                    if (diffX + diffY > 60) {
                        edgeData[i] = 255; edgeData[i+1] = 255; edgeData[i+2] = 255; edgeData[i+3] = 255;
                    } else {
                        edgeData[i+3] = 0; // remain transparent
                    }
                }
            }
            imgData.data.set(edgeData);
            ctx.putImageData(imgData, 0, 0);
            
            // Apply generated outline as cursor background
            this.cursor.style.backgroundImage = `url(${cvs.toDataURL()})`;
            this.cursor.style.backgroundSize = 'contain';
            this.cursor.style.backgroundRepeat = 'no-repeat';
            this.cursor.style.backgroundPosition = 'center';
            this.cursor.innerHTML = ''; // clear any svg children if leftover
        };

        this.cursorPos = { x: window.innerWidth/2, y: window.innerHeight/2 };
        this.cursorTarget = { x: window.innerWidth/2, y: window.innerHeight/2 };
        document.body.style.cursor = 'none';
        
        window.addEventListener('mousemove', (e) => {
            this.cursorTarget.x = e.clientX;
            this.cursorTarget.y = e.clientY;
        });
    }

    onMouseMove(e) {
        this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        
        const vec = new THREE.Vector3(this.targetMouse.x, this.targetMouse.y, 0.5);
        vec.unproject(this.camera);
        vec.sub(this.camera.position).normalize();
        const distance = -this.camera.position.z / vec.z;
        this.mouseWorld.copy(this.camera.position).add(vec.multiplyScalar(distance));

        if (this.lastMousePos) {
            this.mouseVel.x = e.clientX - this.lastMousePos.x;
            this.mouseVel.y = e.clientY - this.lastMousePos.y;
        }
        this.lastMousePos.set(e.clientX, e.clientY);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        const dt = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();

        // Cursor Fluid Easing
        this.cursorPos.x += (this.cursorTarget.x - this.cursorPos.x) * 0.15;
        this.cursorPos.y += (this.cursorTarget.y - this.cursorPos.y) * 0.15;
        this.cursor.style.transform = `translate(${this.cursorPos.x - 24}px, ${this.cursorPos.y - 24}px)`;

        this.mouse.lerp(this.targetMouse, 0.1);
        this.camera.position.y += (-this.targetScrollY * 0.08 - this.camera.position.y) * 0.05;

        if (this.blackHoleUniforms) this.blackHoleUniforms.uTime.value = elapsed;
        if (this.starSystem) this.starSystem.material.uniforms.uTime.value = elapsed;

        if (this.logoSystem) {
            // Dynamic check for mathematically precise hover independent of screen scale
            const logoScreenVec = this.logoSystem.position.clone().project(this.camera);
            const dx = this.mouse.x - logoScreenVec.x;
            const dy = this.mouse.y - logoScreenVec.y;
            this.isHoveringLogo = (Math.sqrt(dx*dx + dy*dy) < 0.35); // Adjust threshold as needed
            if (performance.now() < this.voidPressBurstUntil) this.isHoveringLogo = true;
            
            for(let i=0; i<this.logoCount; i++) {
                const idx = i*3;
                if (this.isHoveringLogo) {
                    // SILKY BLOOM: Dissipate in completely random directions
                    this.logoVelocities[idx] += (Math.random() - 0.5) * 0.08;
                    this.logoVelocities[idx+1] += (Math.random() - 0.5) * 0.08;
                    this.logoVelocities[idx+2] += (Math.random() - 0.5) * 0.08;
                    
                    // Add subtle swirling noise
                    const swirl = 0.02;
                    this.logoVelocities[idx] += Math.sin(this.logoPositions[idx+1] * 0.5 + elapsed) * swirl;
                    this.logoVelocities[idx+2] += Math.cos(this.logoPositions[idx] * 0.5 + elapsed) * swirl;

                    this.logoPositions[idx] += this.logoVelocities[idx];
                    this.logoPositions[idx+1] += this.logoVelocities[idx+1];
                    this.logoPositions[idx+2] += this.logoVelocities[idx+2];
                    
                    // Silky Damping
                    this.logoVelocities[idx] *= 0.94;
                    this.logoVelocities[idx+1] *= 0.94;
                    this.logoVelocities[idx+2] *= 0.94;
                } else {
                    // Magnetic Reassembly
                    const distToTarget = Math.sqrt(
                        Math.pow(this.logoBases[idx] - this.logoPositions[idx], 2) + 
                        Math.pow(this.logoBases[idx+1] - this.logoPositions[idx+1], 2)
                    );
                    
                    if (distToTarget > 0.05) {
                        // Smooth magentic pull relative to distance
                        const lerpSpeed = 0.06 + Math.min(distToTarget * 0.02, 0.04); 
                        this.logoPositions[idx] += (this.logoBases[idx] - this.logoPositions[idx]) * lerpSpeed;
                        this.logoPositions[idx+1] += (this.logoBases[idx+1] - this.logoPositions[idx+1]) * lerpSpeed;
                        this.logoPositions[idx+2] += (this.logoBases[idx+2] - this.logoPositions[idx+2]) * lerpSpeed;
                    } else {
                        // Snap exactly when close enough to stop microscopic jitter
                        this.logoPositions[idx] = this.logoBases[idx];
                        this.logoPositions[idx+1] = this.logoBases[idx+1];
                        this.logoPositions[idx+2] = this.logoBases[idx+2];
                    }
                    this.logoVelocities[idx] = 0;
                    this.logoVelocities[idx+1] = 0;
                    this.logoVelocities[idx+2] = 0;
                }
            }
            this.logoSystem.geometry.attributes.position.needsUpdate = true;
        }

        if (this.tshirtMesh) {
            this.tshirtUniforms.uTime.value = elapsed;
            this.tshirtUniforms.uHover.value += ((this.isHoveringTshirt?1:0) - this.tshirtUniforms.uHover.value) * 0.1;
            const isMobile = window.innerWidth < 900;
            const activeSize = this.activeConfig?.size;
            const sizeYOffset = (activeSize && this.sizeYOffsetMap) ? (this.sizeYOffsetMap[activeSize] || 0) : 0;
            const targetY = (isMobile ? -60 : -100) + sizeYOffset; // Shift up on mobile + size tuning
            this.tshirtMesh.position.x += (this.mouse.x * 12.0 - this.tshirtMesh.position.x) * 0.05;
            this.tshirtMesh.position.y += ((targetY + Math.sin(elapsed*0.8)*4.0 - this.targetScrollY*0.1) - this.tshirtMesh.position.y) * 0.05;
            this.tshirtTargetRotation.y += this.mouseVel.x * 0.0006;
            this.tshirtTargetRotation.x += this.mouseVel.y * 0.0006;
            this.tshirtTargetRotation.y *= 0.94; this.tshirtTargetRotation.x *= 0.94;
            this.tshirtMesh.rotation.y += (this.tshirtTargetRotation.y - this.tshirtMesh.rotation.y) * 0.05;
            this.tshirtMesh.rotation.x += (this.tshirtTargetRotation.x - this.tshirtMesh.rotation.x) * 0.05;
            this.mouseVel.multiplyScalar(0.9);

            // Update real-time technical coordinates
            const coordsEl = document.getElementById('cursor-coords');
            if (coordsEl) {
                const xVal = this.mouse.x.toFixed(2);
                const yVal = this.mouse.y.toFixed(2);
                coordsEl.textContent = `X ${xVal} · Y ${yVal}`;
            }
        }

        if (this.ferroMesh) {
            const ferroTrigger = document.getElementById('ferrofluid-trigger');
            if (ferroTrigger) {
                const rect = ferroTrigger.getBoundingClientRect();
                const centerY = (rect.top + rect.bottom) / 2;
                const scrollProgress = 1.0 - Math.abs(centerY - window.innerHeight / 2) / (window.innerHeight);
                
                this.ferroUniforms.uHover.value += ((this.isHoveringFerro ? 1.0 : 0.0) - this.ferroUniforms.uHover.value) * 0.1;
                this.ferroUniforms.uTime.value = elapsed;
                this.ferroUniforms.uMouse.value.lerp(this.mouse, 0.1);
                
                // Map cursor screen space to shader space (-1 to 1)
                const curPos = new THREE.Vector2(
                    (this.cursorPos.x / window.innerWidth) * 2 - 1,
                    -(this.cursorPos.y / window.innerHeight) * 2 + 1
                );
                this.ferroUniforms.uCursor.value.lerp(curPos, 0.1);
                this.ferroUniforms.uTilt.value.lerp(this.tilt, 0.1);
                
                // Position mesh relative to its section
                const worldPos = new THREE.Vector3(0, 0, -50);
                worldPos.y = (centerY / window.innerHeight) * -200 + 100 + this.camera.position.y;
                this.ferroMesh.position.copy(worldPos);
                
                // Magnetic Status Update
                const statusEl = document.getElementById('magnet-status');
                if (statusEl) {
                    if (this.isHoveringFerro) statusEl.textContent = 'Active';
                    else if (this.ferroUniforms.uHover.value > 0.1) statusEl.textContent = 'Stabilizing';
                    else statusEl.textContent = 'Idle';
                }
            }
        }

        this.drawVoidUnderstageCanvas(elapsed);
        this.drawTshirtViewportOverlay(elapsed);

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('load', () => {
    new PhysicsEngine();
});
