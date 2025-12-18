# Safety & Risk Assessment

## ⚠️ Critical Limitations
This is a **Web Application (PWA)**, which means it has specific limitations compared to native apps (Android/iOS).

### 1. Network Dependency
- **Risk**: The "SOS" feature uses WhatsApp. If the user has poor signal or no data, **the message will not send**.
- **Mitigation**: The 'Siren' and 'Fake Call' features are designed to work offline.

### 2. User Friction (The 'Send' Button)
- **Risk**: Unlike native SMS, a web app cannot send messages in the background. The user **MUST** manually press the 'Send' button in WhatsApp. In a panic situation, this extra step could be fatal.

### 3. No Background Tracking
- **Risk**: If the user locks the phone, the browser stops running. Real-time location tracking cannot check-in autonomously.

## ✅ Safe Usage Recommendation
Do not pitch this app as a total replacement for calling the Police (100/112). 

**Pitch it as a "Situational Tool":**
- Use **'Fake Call'** to exit awkward situations (Preventive).
- Use **'Stealth Mode'** to keep the app open unnoticed when walking in unsafe areas (Preventive).
- Use **'SOS'** as a quick way to generate a location map link for contacts, but be aware of the "Send" step.
