// --- ELEMENTS ---
const stealthMode = document.getElementById('stealthMode');
const panicMode = document.getElementById('panicMode');
const sosBtn = document.getElementById('sosBtn');
const statusText = document.getElementById('statusText');
const policeBtn = document.getElementById('policeBtn');
const hospitalBtn = document.getElementById('hospitalBtn');
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

// Clock Logic
function updateClock() {
    const now = new Date();
    document.getElementById('currentTime').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('currentDate').innerText = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}
setInterval(updateClock, 1000);
updateClock();

// --- LOCATION TRACKING & SOS LOGIC ---
let currentLocation = null;
let watchId = null;

function startLocationTracking() {
    if (!navigator.geolocation) {
        statusText.innerText = "❌ GPS not supported";
        return;
    }


    const gpsDot = document.getElementById('gpsDot');
    statusText.innerText = "Acquiring location...";
    gpsDot.className = 'gps-dot gps-searching';

    // 1. Try Fast/Coarse location first (helps with "Stuck" issues)
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            currentLocation = pos;
            console.log("Coarse fix acquired");
            updateGpsStatus(pos);
        },
        (err) => {
            console.warn("Coarse GPS failed, moving to high-accuracy", err);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );

    // 2. Start Precise Tracking (continuously)
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            currentLocation = position;
            updateGpsStatus(position);
        },
        (err) => {
            console.warn("GPS Watch Error:", err);
            handleGpsError(err);
        },
        {
            enableHighAccuracy: true,
            timeout: 60000,
            maximumAge: 0
        }
    );
}

function updateGpsStatus(position) {
    const gpsDot = document.getElementById('gpsDot');
    const accuracy = Math.round(position.coords.accuracy);
    statusText.innerText = `GPS Active (Acc: ${accuracy}m)`;

    // Update Dot Color
    if (accuracy < 30) gpsDot.className = 'gps-dot gps-active'; // Green (Precise)
    else gpsDot.className = 'gps-dot gps-searching'; // Orange (Weak)
}

function handleGpsError(err) {
    const gpsDot = document.getElementById('gpsDot');
    gpsDot.className = 'gps-dot'; // Reset

    switch (err.code) {
        case err.PERMISSION_DENIED:
            statusText.innerText = "❌ Location Permission Denied!";
            alert("⚠️ Please Enable Location Permissions in your Browser Settings.");
            break;
        case err.POSITION_UNAVAILABLE:
            statusText.innerText = "❌ Signal Weak / Unavailable";
            break;
        case err.TIMEOUT:
            statusText.innerText = "⚠️ GPS Timeout. Retry?";
            break;
        default:
            statusText.innerText = "❌ GPS Error";
    }
}

function stopLocationTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

// Update Unlock/Lock to start/stop tracking
function unlockApp() {
    stealthMode.classList.add('hidden');
    stealthMode.classList.remove('stealth-active');

    panicMode.classList.remove('hidden');
    // Request permissions implicitly on unlock
    if (Notification.permission !== "granted") Notification.requestPermission();

    // START TRACKING IMMEDIATELY
    startLocationTracking();
}

exitPanicBtn.addEventListener('click', () => {
    panicMode.classList.add('hidden');
    stealthMode.classList.remove('hidden');
    stealthMode.classList.add('stealth-active');

    // STOP TRACKING TO SAVE BATTERY & RESET
    stopLocationTracking();
    currentLocation = null;
    statusText.innerText = "Status: Idle";
});

// --- SOS BUTTON LOGIC (SMS with OFFLINE FALLBACK) ---
sosBtn.addEventListener('click', () => {
    sosBtn.classList.add('pulse-fast');

    // Check for saved Emergency Contact
    let emergencyContact = localStorage.getItem('raksha_contact');
    if (!emergencyContact) {
        emergencyContact = prompt("⚠️ SETUP: Enter Emergency Phone Number (with Country Code, e.g., +919999999999):");
        if (emergencyContact) {
            localStorage.setItem('raksha_contact', emergencyContact.replace(/\s+/g, '')); // Clean spaces
        }
    }

    // Use the continuously tracked location if available
    if (currentLocation) {
        sendSosMessage(currentLocation, emergencyContact);
    } else {
        // Fallback: Try one-shot if tracking hasn't barely started or failed
        statusText.innerText = "⏳ Getting fix...";
        navigator.geolocation.getCurrentPosition(
            (pos) => sendSosMessage(pos, emergencyContact),
            (err) => {
                console.warn(err);
                statusText.innerText = "⚠️ GPS Failed. Sending fallback.";
                // Fallback without coordinates if GPS completely fails
                sendSmsFallback(emergencyContact);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }
});

function sendSosMessage(position, emergencyContact) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;

    const mapLink = `https://maps.google.com/?q=${lat},${lng}`;
    // SMS Body
    const msg = `🚩 EMERGENCY! I need help!\nMy Location (Acc: ${Math.round(accuracy)}m):\n${mapLink}`;

    triggerSms(emergencyContact, msg);
}

function sendSmsFallback(emergencyContact) {
    const msg = "🚩 EMERGENCY! I need help! My GPS failed. Call me immediately!";
    triggerSms(emergencyContact, msg);
}

function triggerSms(phone, message) {
    // Generate SMS Link
    // Note: 'sms:' protocol varies slightly by OS, but 'sms:number?body=text' is standard.
    // iOS sometimes prefers '&' separator. We use '?' as it's common for Web -> Android.

    // Encode the message properly for URL
    const encodedMsg = encodeURIComponent(message);
    const smsLink = `sms:${phone || ''}?body=${encodedMsg}`;

    statusText.innerText = "🚀 Opening SMS...";
    setTimeout(() => {
        window.location.href = smsLink;
        sosBtn.classList.remove('pulse-fast');
    }, 500);
}

// --- QUICK NAV LOGIC ---
if (policeBtn) {
    policeBtn.addEventListener('click', () => {
        if (currentLocation) {
            const { latitude, longitude } = currentLocation.coords;
            window.open(`https://www.google.com/maps/search/police+station/@${latitude},${longitude},15z`, "_blank");
        } else {
            // Explicit Feedback
            alert("⚠️ GPS is still searching... Please wait for the green dot.");
        }
    });
}

if (hospitalBtn) {
    hospitalBtn.addEventListener('click', () => {
        if (currentLocation) {
            const { latitude, longitude } = currentLocation.coords;
            window.open(`https://www.google.com/maps/search/hospital/@${latitude},${longitude},15z`, "_blank");
        } else {
            // Explicit Feedback
            alert("⚠️ GPS is still searching... Please wait for the green dot.");
        }
    });
}
