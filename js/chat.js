/**
 * نظام الدردشة المتقدم - Advanced Chat System
 */

class ChatSystem {
    constructor() {
        this.currentUser = null;
        this.currentChat = null;
        this.messages = {};
        this.typingUsers = new Set();
        this.replyTo = null;
        this.init();
    }

    init() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if(!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }

        this.loadMessages();
        this.setupEventListeners();
        this.startRealtimeSimulation();
    }

    loadMessages() {
        this.messages = JSON.parse(localStorage.getItem('messages') || '{}');
    }

    saveMessages() {
        localStorage.setItem('messages', JSON.stringify(this.messages));
    }

    getChatKey(userId1, userId2) {
        return [userId1, userId2].sort().join('_');
    }

    getGroupKey(groupId) {
        return `group_${groupId}`;
    }

    sendMessage(text, options = {}) {
        if(!this.currentChat || !text.trim()) return null;

        const chatKey = this.currentChat.type === 'group' 
            ? this.getGroupKey(this.currentChat.id)
            : this.getChatKey(this.currentUser.id, this.currentChat.id);

        if(!this.messages[chatKey]) {
            this.messages[chatKey] = [];
        }

        const message = {
            id: Date.now(),
            sender: this.currentUser.id,
            text: text.trim(),
            type: options.type || 'text',
            time: new Date().toISOString(),
            read: false,
            delivered: false,
            replyTo: this.replyTo || null,
            edited: false,
            deleted: false,
            reactions: [],
            attachments: options.attachments || [],
            mentions: this.extractMentions(text)
        };

        // معالجة الروابط
        if(this.containsLink(text)) {
            message.preview = this.generateLinkPreview(text);
        }

        this.messages[chatKey].push(message);
        this.saveMessages();

        // إعادة تعيين الرد
        this.replyTo = null;
        this.updateReplyUI();

        // إرسال إشعار الكتابة
        this.simulateTyping();

        // تحديث الإحصائيات
        this.updateUserStats('messagesSent');

        return message;
    }

    editMessage(messageId, newText) {
        const chatKey = this.getCurrentChatKey();
        const message = this.messages[chatKey]?.find(m => m.id === messageId);
        
        if(!message || message.sender !== this.currentUser.id) return false;

        message.text = newText;
        message.edited = true;
        message.editedAt = new Date().toISOString();
        
        this.saveMessages();
        return true;
    }

    deleteMessage(messageId, forEveryone = false) {
        const chatKey = this.getCurrentChatKey();
        const messageIndex = this.messages[chatKey]?.findIndex(m => m.id === messageId);
        
        if(messageIndex === -1) return false;

        const message = this.messages[chatKey][messageIndex];

        if(forEveryone && message.sender === this.currentUser.id) {
            message.deleted = true;
            message.text = 'تم حذف هذه الرسالة';
        } else {
            // حذف لدي فقط (تخزين محلي)
            this.messages[chatKey].splice(messageIndex, 1);
        }

        this.saveMessages();
        return true;
    }

    addReaction(messageId, emoji) {
        const chatKey = this.getCurrentChatKey();
        const message = this.messages[chatKey]?.find(m => m.id === messageId);
        
        if(!message) return false;

        const existingReaction = message.reactions.find(r => r.emoji === emoji);
        
        if(existingReaction) {
            if(existingReaction.users.includes(this.currentUser.id)) {
                // إزالة التفاعل
                existingReaction.users = existingReaction.users.filter(id => id !== this.currentUser.id);
                if(existingReaction.users.length === 0) {
                    message.reactions = message.reactions.filter(r => r.emoji !== emoji);
                }
            } else {
                existingReaction.users.push(this.currentUser.id);
            }
        } else {
            message.reactions.push({
                emoji,
                users: [this.currentUser.id]
            });
        }

        this.saveMessages();
        return true;
    }

    forwardMessage(messageId, targetChatId) {
        const chatKey = this.getCurrentChatKey();
        const message = this.messages[chatKey]?.find(m => m.id === messageId);
        
        if(!message) return false;

        const newMessage = {
            ...message,
            id: Date.now(),
            sender: this.currentUser.id,
            time: new Date().toISOString(),
            forwarded: true,
            originalSender: message.sender,
            read: false
        };

        const targetKey = this.getGroupKey(targetChatId) || 
                         this.getChatKey(this.currentUser.id, targetChatId);
        
        if(!this.messages[targetKey]) this.messages[targetKey] = [];
        this.messages[targetKey].push(newMessage);
        this.saveMessages();

        return true;
    }

    pinMessage(messageId) {
        const chatKey = this.getCurrentChatKey();
        const chat = this.getChat(this.currentChat.id);
        
        if(!chat.pinnedMessages) chat.pinnedMessages = [];
        
        if(chat.pinnedMessages.includes(messageId)) {
            chat.pinnedMessages = chat.pinnedMessages.filter(id => id !== messageId);
        } else {
            if(chat.pinnedMessages.length >= 3) {
                chat.pinnedMessages.shift(); // إزالة الأقدم
            }
            chat.pinnedMessages.push(messageId);
        }

        this.saveChat(chat);
        return true;
    }

    markAsRead() {
        if(!this.currentChat) return;

        const chatKey = this.getCurrentChatKey();
        const unreadMessages = this.messages[chatKey]?.filter(m => 
            m.sender !== this.currentUser.id && !m.read
        );

        unreadMessages?.forEach(m => {
            m.read = true;
            m.readAt = new Date().toISOString();
        });

        if(unreadMessages?.length > 0) {
            this.saveMessages();
            this.updateUnreadCount();
        }
    }

    searchMessages(query) {
        if(!this.currentChat) return [];

        const chatKey = this.getCurrentChatKey();
        const messages = this.messages[chatKey] || [];

        return messages.filter(m => 
            m.text.toLowerCase().includes(query.toLowerCase()) &&
            !m.deleted
        );
    }

    getMessageHistory(beforeId, limit = 20) {
        const chatKey = this.getCurrentChatKey();
        const messages = this.messages[chatKey] || [];
        
        let startIndex = messages.length;
        if(beforeId) {
            startIndex = messages.findIndex(m => m.id === beforeId);
        }

        return messages.slice(Math.max(0, startIndex - limit), startIndex);
    }

    // Helper Methods
    containsLink(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return urlRegex.test(text);
    }

    extractMentions(text) {
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while((match = mentionRegex.exec(text)) !== null) {
            mentions.push(match[1]);
        }
        return mentions;
    }

    generateLinkPreview(url) {
        // في الإنتاج، استخدم API لجلب بيانات الرابط
        return {
            url,
            title: 'معاينة الرابط',
            description: 'وصف الرابط...',
            image: null
        };
    }

    getCurrentChatKey() {
        if(!this.currentChat) return null;
        return this.currentChat.type === 'group'
            ? this.getGroupKey(this.currentChat.id)
            : this.getChatKey(this.currentUser.id, this.currentChat.id);
    }

    simulateTyping() {
        // محاكاة إرسال حالة الكتابة للطرف الآخر
        setTimeout(() => {
            this.receiveSimulatedReply();
        }, 1000 + Math.random() * 2000);
    }

    receiveSimulatedReply() {
        if(!this.currentChat || this.currentChat.type === 'group') return;

        const otherUser = this.currentChat;
        
        // إظهار مؤشر الكتابة
        this.showTypingIndicator(otherUser.id);

        setTimeout(() => {
            this.hideTypingIndicator(otherUser.id);

            const replies = [
                'مرحباً! 👋',
                'كيف حالك؟',
                'أنا مشغول قليلاً...',
                'شكراً لك! 😊',
                'حاضر، فهمت عليك',
                'رائع! أخبرني المزيد',
                'هل يمكنك توضيح ذلك؟',
                'أتفق معك تماماً 👍',
                'هذا مثير للاهتمام!',
                'سأتحقق من ذلك'
            ];

            const chatKey = this.getChatKey(this.currentUser.id, otherUser.id);
            if(!this.messages[chatKey]) this.messages[chatKey] = [];

            this.messages[chatKey].push({
                id: Date.now(),
                sender: otherUser.id,
                text: replies[Math.floor(Math.random() * replies.length)],
                type: 'text',
                time: new Date().toISOString(),
                read: false,
                delivered: true
            });

            this.saveMessages();
            this.onNewMessage(chatKey);

        }, 2000);
    }

    showTypingIndicator(userId) {
        this.typingUsers.add(userId);
        this.updateTypingUI();
    }

    hideTypingIndicator(userId) {
        this.typingUsers.delete(userId);
        this.updateTypingUI();
    }

    updateTypingUI() {
        // تحديث واجهة المستخدم
        const indicator = document.getElementById('typingIndicator');
        if(indicator) {
            indicator.style.display = this.typingUsers.size > 0 ? 'flex' : 'none';
        }
    }

    updateReplyUI() {
        const replyBar = document.getElementById('replyBar');
        if(replyBar) {
            replyBar.style.display = this.replyTo ? 'block' : 'none';
        }
    }

    updateUnreadCount() {
        let total = 0;
        const allChats = this.getAllChats();
        
        allChats.forEach(chat => {
            const chatKey = chat.type === 'group' 
                ? this.getGroupKey(chat.id)
                : this.getChatKey(this.currentUser.id, chat.id);
            
            const unread = this.messages[chatKey]?.filter(m => 
                m.sender !== this.currentUser.id && !m.read
            ).length || 0;
            
            total += unread;
        });

        // تحديث الشارة
        const badge = document.getElementById('unreadBadge');
        if(badge) {
            badge.textContent = total;
            badge.style.display = total > 0 ? 'block' : 'none';
        }

        return total;
    }

    getAllChats() {
        // جمع جميع المحادثات من جهات الاتصال والمجموعات
        const chats = [];
        
        // جهات الاتصال
        this.currentUser.contacts?.forEach(contactId => {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.id === contactId);
            if(user) {
                chats.push({
                    id: user.id,
                    name: user.fullName,
                    avatar: user.avatar,
                    type: 'private',
                    isOnline: user.isOnline,
                    lastMessage: this.getLastMessage(this.getChatKey(this.currentUser.id, user.id))
                });
            }
        });

        // المجموعات
        this.currentUser.groups?.forEach(groupId => {
            const groups = JSON.parse(localStorage.getItem('groups') || '[]');
            const group = groups.find(g => g.id === groupId);
            if(group) {
                chats.push({
                    id: group.id,
                    name: group.name,
                    avatar: group.avatar,
                    type: 'group',
                    isAdmin: group.admins.includes(this.currentUser.id),
                    lastMessage: this.getLastMessage(this.getGroupKey(group.id))
                });
            }
        });

        // ترتيب حسب آخر رسالة
        return chats.sort((a, b) => {
            if(!a.lastMessage) return 1;
            if(!b.lastMessage) return -1;
            return new Date(b.lastMessage.time) - new Date(a.lastMessage.time);
        });
    }

    getLastMessage(chatKey) {
        const messages = this.messages[chatKey] || [];
        return messages[messages.length - 1];
    }

    updateUserStats(field) {
        if(!this.currentUser.stats) this.currentUser.stats = {};
        this.currentUser.stats[field] = (this.currentUser.stats[field] || 0) + 1;
        this.currentUser.stats.lastActive = new Date().toISOString();
        
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    setupEventListeners() {
        // اختصارات لوحة المفاتيح
        document.addEventListener('keydown', (e) => {
            if(e.key === 'Escape') {
                this.replyTo = null;
                this.updateReplyUI();
            }
        });
    }

    startRealtimeSimulation() {
        // محاكاة التحديثات الفورية
        setInterval(() => {
            this.loadMessages();
            this.updateUnreadCount();
        }, 3000);
    }

    onNewMessage(chatKey) {
        // حدث عند وصول رسالة جديدة
        this.updateUnreadCount();
        
        // تشغيل صوت الإشعار
        if(this.currentUser.settings?.soundEnabled) {
            this.playNotificationSound();
        }

        // إظهار إشعار
        if(document.hidden) {
            this.showBrowserNotification();
        }
    }

    playNotificationSound() {
        // إنشاء صوت بسيط
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    showBrowserNotification() {
        if('Notification' in window && Notification.permission === 'granted') {
            new Notification('رسالة جديدة', {
                body: 'لديك رسالة جديدة في دردشتي',
                icon: '/icon.png'
            });
        }
    }

    // تصدير الرسائل
    exportChat(format = 'json') {
        const chatKey = this.getCurrentChatKey();
        const messages = this.messages[chatKey] || [];
        
        if(format === 'txt') {
            return messages.map(m => {
                const time = new Date(m.time).toLocaleString('ar-SA');
                const sender = m.sender === this.currentUser.id ? 'أنا' : 'الطرف الآخر';
                return `[${time}] ${sender}: ${m.text}`;
            }).join('\n');
        }
        
        return JSON.stringify(messages, null, 2);
    }

    // مسح المحادثة
    clearChat() {
        const chatKey = this.getCurrentChatKey();
        if(confirm('هل أنت متأكد من مسح جميع الرسائل؟')) {
            this.messages[chatKey] = [];
            this.saveMessages();
            return true;
        }
        return false;
    }
}

// Initialize
const chat = new ChatSystem();
