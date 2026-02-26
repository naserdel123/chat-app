/**
 * نظام المصادقة والتسجيل - Auth System
 */

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.init();
    }

    init() {
        this.loadUsers();
        this.checkSession();
    }

    loadUsers() {
        this.users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // إنشاء مشرف افتراضي إذا لم يوجد
        if(!this.users.find(u => u.role === 'superadmin')) {
            this.createSuperAdmin();
        }
    }

    createSuperAdmin() {
        const superAdmin = {
            id: 1,
            fullName: 'المشرف العام',
            username: '@admin',
            phone: 'admin',
            email: 'admin@chat.app',
            password: this.hashPassword('admin123'),
            avatar: 'https://i.pravatar.cc/150?img=1',
            role: 'superadmin',
            isOnline: false,
            createdAt: new Date().toISOString(),
            contacts: [],
            groups: [],
            settings: {
                darkMode: true,
                notifications: true
            }
        };
        
        this.users.push(superAdmin);
        this.saveUsers();
    }

    hashPassword(password) {
        // في الإنتاج استخدم bcrypt
        return btoa(password + 'salt');
    }

    verifyPassword(password, hashed) {
        return this.hashPassword(password) === hashed;
    }

    register(userData) {
        // التحقق من التكرار
        if(this.users.find(u => u.phone === userData.phone)) {
            return { success: false, error: 'رقم الهاتف مسجل مسبقاً' };
        }
        if(this.users.find(u => u.username === userData.username)) {
            return { success: false, error: 'اسم المستخدم مستخدم مسبقاً' };
        }
        if(this.users.find(u => u.email === userData.email)) {
            return { success: false, error: 'البريد الإلكتروني مسجل مسبقاً' };
        }

        // إنشاء المستخدم
        const newUser = {
            id: Date.now(),
            ...userData,
            password: this.hashPassword(userData.password),
            role: 'user',
            isOnline: true,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            contacts: [],
            blocked: [],
            groups: [],
            settings: {
                darkMode: true,
                notifications: true,
                soundEnabled: true,
                readReceipts: true
            },
            stats: {
                messagesSent: 0,
                messagesReceived: 0,
                groupsJoined: 0,
                lastActive: new Date().toISOString()
            }
        };

        this.users.push(newUser);
        this.saveUsers();
        this.setCurrentUser(newUser);
        
        return { success: true, user: newUser };
    }

    login(credential, password) {
        const user = this.users.find(u => 
            u.phone === credential || 
            u.username === credential || 
            u.email === credential
        );

        if(!user) {
            return { success: false, error: 'المستخدم غير موجود' };
        }

        if(!this.verifyPassword(password, user.password)) {
            // تسجيل محاولة فاشلة
            this.logFailedAttempt(user.id);
            return { success: false, error: 'كلمة المرور غير صحيحة' };
        }

        // التحقق من الحظر
        if(user.isBlocked) {
            return { success: false, error: 'الحساب محظور. تواصل مع الإدارة' };
        }

        // تحديث البيانات
        user.isOnline = true;
        user.lastLogin = new Date().toISOString();
        user.lastActive = new Date().toISOString();
        
        // تسجيل الجهاز
        if(!user.devices) user.devices = [];
        user.devices.push({
            id: navigator.userAgent + Date.now(),
            name: navigator.platform,
            lastActive: new Date().toISOString()
        });

        this.saveUsers();
        this.setCurrentUser(user);

        return { success: true, user };
    }

    logout() {
        if(this.currentUser) {
            const user = this.users.find(u => u.id === this.currentUser.id);
            if(user) {
                user.isOnline = false;
                user.lastActive = new Date().toISOString();
                this.saveUsers();
            }
        }
        this.clearSession();
        window.location.href = 'index.html';
    }

    setCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
    }

    clearSession() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    checkSession() {
        const saved = localStorage.getItem('currentUser');
        if(saved) {
            this.currentUser = JSON.parse(saved);
            // التحقق من صلاحية الجلسة (24 ساعة)
            const lastActive = new Date(this.currentUser.lastActive);
            const now = new Date();
            const hoursDiff = (now - lastActive) / (1000 * 60 * 60);
            
            if(hoursDiff > 24) {
                this.clearSession();
                return false;
            }
            
            // تحديث الحالة
            this.currentUser.isOnline = true;
            this.currentUser.lastActive = new Date().toISOString();
            this.setCurrentUser(this.currentUser);
            return true;
        }
        return false;
    }

    updateProfile(updates) {
        if(!this.currentUser) return false;
        
        const user = this.users.find(u => u.id === this.currentUser.id);
        if(!user) return false;

        Object.assign(user, updates);
        Object.assign(this.currentUser, updates);
        
        this.saveUsers();
        this.setCurrentUser(this.currentUser);
        
        return true;
    }

    changePassword(oldPass, newPass) {
        if(!this.currentUser) return false;
        
        const user = this.users.find(u => u.id === this.currentUser.id);
        if(!this.verifyPassword(oldPass, user.password)) {
            return false;
        }

        user.password = this.hashPassword(newPass);
        this.saveUsers();
        return true;
    }

    blockUser(userId) {
        if(!this.currentUser) return false;
        
        if(!this.currentUser.blocked) this.currentUser.blocked = [];
        if(!this.currentUser.blocked.includes(userId)) {
            this.currentUser.blocked.push(userId);
            this.updateProfile({ blocked: this.currentUser.blocked });
        }
        return true;
    }

    unblockUser(userId) {
        if(!this.currentUser) return false;
        
        this.currentUser.blocked = this.currentUser.blocked.filter(id => id !== userId);
        this.updateProfile({ blocked: this.currentUser.blocked });
        return true;
    }

    isBlocked(userId) {
        return this.currentUser?.blocked?.includes(userId) || false;
    }

    logFailedAttempt(userId) {
        // تسجيل محاولات تسجيل الدخول الفاشلة للأمان
        const attempts = JSON.parse(localStorage.getItem('loginAttempts') || '[]');
        attempts.push({
            userId,
            time: new Date().toISOString(),
            ip: 'client-side' // في الإنتاج استخدم IP حقيقي
        });
        localStorage.setItem('loginAttempts', JSON.stringify(attempts));
    }

    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    // Admin Functions
    getAllUsers() {
        if(this.currentUser?.role !== 'superadmin' && this.currentUser?.role !== 'admin') {
            return [];
        }
        return this.users;
    }

    deleteUser(userId) {
        if(this.currentUser?.role !== 'superadmin') return false;
        if(userId === this.currentUser.id) return false; // لا يمكن حذف نفسك
        
        this.users = this.users.filter(u => u.id !== userId);
        this.saveUsers();
        return true;
    }

    blockUserAdmin(userId) {
        if(this.currentUser?.role !== 'superadmin' && this.currentUser?.role !== 'admin') {
            return false;
        }
        
        const user = this.users.find(u => u.id === userId);
        if(user) {
            user.isBlocked = true;
            user.blockedReason = 'مخالفة قوانين الاستخدام';
            user.blockedAt = new Date().toISOString();
            user.blockedBy = this.currentUser.id;
            this.saveUsers();
            return true;
        }
        return false;
    }

    promoteToAdmin(userId) {
        if(this.currentUser?.role !== 'superadmin') return false;
        
        const user = this.users.find(u => u.id === userId);
        if(user) {
            user.role = 'admin';
            this.saveUsers();
            return true;
        }
        return false;
    }

    getStats() {
        return {
            totalUsers: this.users.length,
            onlineUsers: this.users.filter(u => u.isOnline).length,
            newToday: this.users.filter(u => {
                const created = new Date(u.createdAt);
                const today = new Date();
                return created.toDateString() === today.toDateString();
            }).length,
            blockedUsers: this.users.filter(u => u.isBlocked).length
        };
    }
}

// Export للاستخدام
const auth = new AuthSystem();
