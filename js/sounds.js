/**
 * مولد الأصوات البرمجي - Sound Generator
 * لا يحتاج ملفات MP3!
 */

class SoundGenerator {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }

    // صوت الإشعار - Notification
    playNotification() {
        if(!this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // نغمة جميلة: E5 -> G#5 -> B5
        const now = this.audioContext.currentTime;
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(659.25, now); // E5
        oscillator.frequency.setValueAtTime(830.61, now + 0.1); // G#5
        oscillator.frequency.setValueAtTime(987.77, now + 0.2); // B5
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }

    // صوت إرسال الرسالة - Send
    playSend() {
        if(!this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        const now = this.audioContext.currentTime;
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        oscillator.start(now);
        oscillator.stop(now + 0.15);
    }

    // صوت استقبال الرسالة - Receive
    playReceive() {
        if(!this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        const now = this.audioContext.currentTime;
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.setValueAtTime(800, now + 0.05);
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
    }

    // صوت الخطأ - Error
    playError() {
        if(!this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        const now = this.audioContext.currentTime;
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.linearRampToValueAtTime(100, now + 0.3);
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
    }

    // صوت النجاح - Success
    playSuccess() {
        if(!this.enabled) return;
        
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        
        notes.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            const now = this.audioContext.currentTime + (index * 0.1);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, now);
            
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            oscillator.start(now);
            oscillator.stop(now + 0.3);
        });
    }

    // صوت النقر - Click
    playClick() {
        if(!this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        const now = this.audioContext.currentTime;
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(400, now);
        
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        oscillator.start(now);
        oscillator.stop(now + 0.05);
    }

    // صوت الاتصال - Calling
    playCalling() {
        if(!this.enabled) return;
        
        const playRing = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            const now = this.audioContext.currentTime;
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, now);
            oscillator.frequency.setValueAtTime(0, now + 0.2);
            oscillator.frequency.setValueAtTime(440, now + 0.4);
            oscillator.frequency.setValueAtTime(0, now + 0.6);
            
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.setValueAtTime(0.3, now + 0.2);
            gainNode.gain.setValueAtTime(0.3, now + 0.4);
            gainNode.gain.setValueAtTime(0, now + 0.6);
            
            oscillator.start(now);
            oscillator.stop(now + 0.6);
        };
        
        playRing();
        this.callingInterval = setInterval(playRing, 3000);
    }

    stopCalling() {
        if(this.callingInterval) {
            clearInterval(this.callingInterval);
            this.callingInterval = null;
        }
    }

    // تفعيل/تعطيل الأصوات
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // تهيئة الصوت (مطلوب بعد تفاعل المستخدم)
    init() {
        if(this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}

// إنشاء نسخة عامة
const sounds = new SoundGenerator();

// تصدير للاستخدام
window.sounds = sounds;
