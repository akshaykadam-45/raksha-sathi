// --- ELEMENTS ---
const stealthMode = document.getElementById('stealthMode');
const panicMode = document.getElementById('panicMode');
const sosBtn = document.getElementById('sosBtn');
const statusText = document.getElementById('statusText');
const sirenBtn = document.getElementById('sirenBtn');
const fakeCallBtn = document.getElementById('fakeCallBtn');
const callScreen = document.getElementById('callScreen');
const exitPanicBtn = document.getElementById('exitPanicBtn');

// --- STEALTH LOGIC ---
// Double tap to unlock
let lastTap = 0;
stealthMode.addEventListener('click', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 500 && tapLength > 0) {
        // Double Tap Detected
        unlockApp();
        e.preventDefault();
    }
    lastTap = currentTime;
});

function unlockApp() {
    stealthMode.classList.add('hidden');
    stealthMode.classList.remove('stealth-active');

    panicMode.classList.remove('hidden');
    // Request permissions implicitly on unlock
    if (Notification.permission !== "granted") Notification.requestPermission();
}

exitPanicBtn.addEventListener('click', () => {
    panicMode.classList.add('hidden');
    stealthMode.classList.remove('hidden');
    stealthMode.classList.add('stealth-active');
});

// Clock Logic
function updateClock() {
    const now = new Date();
    document.getElementById('currentTime').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('currentDate').innerText = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}
setInterval(updateClock, 1000);
updateClock();

// --- SOS LOGIC (WhatsApp) ---
sosBtn.addEventListener('click', () => {
    statusText.innerText = "🛰️ Acquiring Satellite Lock...";
    sosBtn.classList.add('pulse-fast');

    // Check for saved Emergency Contact
    let emergencyContact = localStorage.getItem('raksha_contact');
    if (!emergencyContact) {
        emergencyContact = prompt("⚠️ SETUP: Enter Emergency Phone Number (with Country Code, e.g., 919999999999):");
        if (emergencyContact) {
            localStorage.setItem('raksha_contact', emergencyContact.replace(/\D/g, '')); // Clean number
        }
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy; // in meters

                // Construct Google Maps Link
                // Using specific zoom level for clarity
                const mapLink = `https://maps.google.com/?q=${lat},${lng}`;

                const msg = `🚩 *EMERGENCY SOS* \nI need help! \n\n📍 My Exact Location (Accuracy: ${Math.round(accuracy)}m):\n${mapLink}`;

                // Deep link with specific number if available
                // Format: https://wa.me/91999999999?text=...
                const baseUrl = emergencyContact ? `https://wa.me/${emergencyContact}` : `https://wa.me/`;
                const waLink = `${baseUrl}?text=${encodeURIComponent(msg)}`;

                statusText.innerText = "✔️ Location Locked! Sending...";
                setTimeout(() => {
                    window.location.href = waLink;
                    sosBtn.classList.remove('pulse-fast');
                }, 1000);
            },
            (err) => {
                console.warn(err);
                statusText.innerText = "⚠️ GPS Failed. Sending approximate.";
                window.location.href = `https://wa.me/?text=${encodeURIComponent("🚩 EMERGENCY! GPS Failed. Call me immediately!")}`;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
});

// --- SIREN LOGIC (Simple Audio) ---
let isSirenPlaying = false;
let audioCtx;
let oscillator;

sirenBtn.addEventListener('click', () => {
    if (!isSirenPlaying) {
        startSiren();
    } else {
        stopSiren();
    }
});

function startSiren() {
    // 1. Init Audio Context
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // 2. Create Oscillator
    oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sawtooth'; // Harsh sound
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // Start high

    // 3. Siren Wailing Effect (LFO manually visualized)
    // We'll just ramp frequency up and down
    const now = audioCtx.currentTime;
    oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
    oscillator.frequency.exponentialRampToValueAtTime(800, now + 1.0);
    // Loop this logic? Simplest is just a high pitch alarm for now or use interval

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();

    // UI Update
    sirenBtn.classList.add('active');
    sirenBtn.querySelector('span').innerText = "STOP";
    isSirenPlaying = true;

    // Siren Loop interval
    window.sirenInterval = setInterval(() => {
        if (!isSirenPlaying) return;
        const t = audioCtx.currentTime;
        oscillator.frequency.exponentialRampToValueAtTime(1200, t + 0.5);
        oscillator.frequency.exponentialRampToValueAtTime(800, t + 1.0);
    }, 1000);
}

function stopSiren() {
    if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
    }
    clearInterval(window.sirenInterval);
    sirenBtn.classList.remove('active');
    sirenBtn.querySelector('span').innerText = "Siren";
    isSirenPlaying = false;
}

// --- FAKE CALL LOGIC ---
fakeCallBtn.addEventListener('click', () => {
    // Delay 3 seconds then show screen
    fakeCallBtn.innerText = "Wait 3s...";
    setTimeout(() => {
        callScreen.classList.remove('hidden');
        fakeCallBtn.innerText = "Fake Call";
        // Attempt to vibrate if mobile
        if (navigator.vibrate) navigator.vibrate([1000, 1000, 1000]);
    }, 3000);
});

document.querySelector('.decline-btn').addEventListener('click', () => {
    callScreen.classList.add('hidden');
});
document.querySelector('.accept-btn').addEventListener('click', () => {
    callScreen.classList.add('hidden');
    // Maybe play a fake voice audio here?
});

// --- SAFE MAP LOGIC ---
const mapModal = document.getElementById('mapModal');
const safeMapBtn = document.getElementById('safeMapBtn');
const closeModal = document.querySelector('.close-modal');
let map;

safeMapBtn.addEventListener('click', () => {
    mapModal.classList.remove('hidden');

    // Init map if not already done
    if (!map) {
        // Default to Mumbai coordinates if GPS fails or as starter
        map = L.map('map').setView([19.0760, 72.8777], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Mock Safe Zones
        const safeZones = [
            { lat: 19.0760, lng: 72.8777, label: "Police Station" },
            { lat: 19.0800, lng: 72.8800, label: "24x7 Pharmacy" },
            { lat: 19.0700, lng: 72.8700, label: "Crowded Mall (Safe)" }
        ];

        safeZones.forEach(zone => {
            L.marker([zone.lat, zone.lng])
                .addTo(map)
                .bindPopup(`<b>${zone.label}</b><br>Safe Zone`)
        });

        // Try getting user location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const { latitude, longitude } = pos.coords;
                map.setView([latitude, longitude], 15);
                L.marker([latitude, longitude], { icon: redIcon }).addTo(map)
                    .bindPopup("<b>You are here</b>").openPopup();
            });
        }
    }

    // Invalidate size to fix rendering hidden div issues
    setTimeout(() => { map.invalidateSize(); }, 100);
});

closeModal.addEventListener('click', () => {
    mapModal.classList.add('hidden');
});

// Custom Red Icon for User
var redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

