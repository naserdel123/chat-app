/**
 * نظام الإدارة والمشرفين - Admin System
 */

class AdminSystem {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.groups = [];
        this.reports = [];
        this.init();
    }

    init() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if(!this.isAdmin()) {
            console.error('Access denied: Admin only');
            return;
        }
        this.loadData();
    }

    isAdmin() {
        return this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.role === 'superadmin');
    }

    isSuperAdmin() {
        return this.currentUser && this.currentUser.role === 'superadmin';
    }

    loadData() {
        this.users = JSON.parse(localStorage.getItem('users') || '[]');
        this.groups = JSON.parse(localStorage.getItem('groups') || '[]');
        this.reports = JSON.parse(localStorage.getItem('reports') || '[]');
    }

    // إحصائيات النظام
    getDashboardStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const messages = JSON.parse(localStorage.getItem('messages') || '{}');
        let totalMessages = 0;
        Object.values(messages).forEach(msgs => totalMessages += msgs.length);

        return {
            users: {
                total: this.users.length,
                online: this.users.filter(u => u.isOnline).length,
                newToday: this.users.filter(u => new Date(u.createdAt) >= today).length,
                activeToday: this.users.filter(u => new Date(u.lastActive) >= today).length,
                blocked: this.users.filter(u => u.isBlocked).length,
                admins: this.users.filter(u => u.role === 'admin' || u.role === 'superadmin').length
            },
            groups: {
                total: this.groups.length,
                newToday: this.groups.filter(g => new Date(g.createdAt) >= today).length,
                totalMembers: this.groups.reduce((sum, g) => sum + g.members.length, 0)
            },
            messages: {
                total: totalMessages,
                today: this.getTodayMessages(messages, today)
            },
            reports: {
                pending: this.reports.filter(r => r.status === 'pending').length,
                resolved: this.reports.filter(r => r.status === 'resolved').length
            }
        };
    }

    getTodayMessages(messages, today) {
        let count = 0;
        Object.values(messages).forEach(msgs => {
            count += msgs.filter(m => new Date(m.time) >= today).length;
        });
        return count;
    }

    // إدارة المستخدمين
    getUsersList(filters = {}) {
        let result = this.users;

        if(filters.search) {
            const search = filters.search.toLowerCase();
            result = result.filter(u => 
                u.fullName.toLowerCase().includes(search) ||
                u.username.toLowerCase().includes(search) ||
                u.phone.includes(search) ||
                u.email?.toLowerCase().includes(search)
            );
        }

        if(filters.role) {
            result = result.filter(u => u.role === filters.role);
        }

        if(filters.status) {
            if(filters.status === 'online') result = result.filter(u => u.isOnline);
            if(filters.status === 'blocked') result = result.filter(u => u.isBlocked);
        }

        return result.map(u => ({
            id: u.id,
            fullName: u.fullName,
            username: u.username,
            phone: u.phone,
            email: u.email,
            avatar: u.avatar,
            role: u.role,
            isOnline: u.isOnline,
            isBlocked: u.isBlocked,
            createdAt: u.createdAt,
            lastActive: u.lastActive,
            stats: u.stats || {}
        }));
    }

    getUserDetails(userId) {
        const user = this.users.find(u => u.id === userId);
        if(!user) return null;

        const messages = JSON.parse(localStorage.getItem('messages') || '{}');
        let userMessages = 0;
        Object.values(messages).forEach(msgs => {
            userMessages += msgs.filter(m => m.sender === userId).length;
        });

        return {
            ...user,
            totalMessages: userMessages,
            groupsCount: user.groups?.length || 0,
            contactsCount: user.contacts?.length || 0,
            devices: user.devices || [],
            loginHistory: this.getLoginHistory(userId)
        };
    }

    getLoginHistory(userId) {
        const attempts = JSON.parse(localStorage.getItem('loginAttempts') || '[]');
        return attempts.filter(a => a.userId === userId).slice(-10);
    }

    // Actions
    blockUser(userId, reason = '') {
        if(!this.isAdmin()) return false;
        if(userId === this.currentUser.id) return false; // لا يمكن حظر نفسك

        const user = this.users.find(u => u.id === userId);
        if(user) {
            user.isBlocked = true;
            user.blockedReason = reason;
            user.blockedAt = new Date().toISOString();
            user.blockedBy = this.currentUser.id;
            user.isOnline = false;
            
            this.saveUsers();
            this.logAction('block_user', { targetId: userId, reason });
            return true;
        }
        return false;
    }

    unblockUser(userId) {
        if(!this.isAdmin()) return false;

        const user = this.users.find(u => u.id === userId);
        if(user) {
            user.isBlocked = false;
            delete user.blockedReason;
            delete user.blockedAt;
            delete user.blockedBy;
            
            this.saveUsers();
            this.logAction('unblock_user', { targetId: userId });
            return true;
        }
        return false;
    }

    deleteUser(userId) {
        if(!this.isSuperAdmin()) return false;
        if(userId === this.currentUser.id) return false;

        // حذف المستخدم
        this.users = this.users.filter(u => u.id !== userId);
        
        // حذف من جهات اتصال الآخرين
        this.users.forEach(u => {
            if(u.contacts) {
                u.contacts = u.contacts.filter(id => id !== userId);
            }
        });

        // حذف رسائله
        const messages = JSON.parse(localStorage.getItem('messages') || '{}');
        Object.keys(messages).forEach(key => {
            messages[key] = messages[key].filter(m => m.sender !== userId);
        });

        localStorage.setItem('messages', JSON.stringify(messages));
        this.saveUsers();
        this.logAction('delete_user', { targetId: userId });
        
        return true;
    }

    changeUserRole(userId, newRole) {
        if(!this.isSuperAdmin()) return false;
        if(userId === this.currentUser.id) return false;

        const validRoles = ['user', 'admin', 'superadmin'];
        if(!validRoles.includes(newRole)) return false;

        const user = this.users.find(u => u.id === userId);
        if(user) {
            user.role = newRole;
            this.saveUsers();
            this.logAction('change_role', { targetId: userId, newRole });
            return true;
        }
        return false;
    }

    // إدارة المجموعات
    getGroupsList() {
        return this.groups.map(g => ({
            id: g.id,
            name: g.name,
            membersCount: g.members.length,
            creator: this.getUserName(g.creator),
            createdAt: g.createdAt,
            isActive: g.members.length > 0
        }));
    }

    deleteGroup(groupId) {
        if(!this.isAdmin()) return false;

        const group = this.groups.find(g => g.id === groupId);
        if(!group) return false;

        // إزالة من جميع المستخدمين
        this.users.forEach(u => {
            if(u.groups) {
                u.groups = u.groups.filter(id => id !== groupId);
            }
        });

        // حذف الرسائل
        const messages = JSON.parse(localStorage.getItem('messages') || '{}');
        delete messages[`group_${groupId}`];

        // حذف المجموعة
        this.groups = this.groups.filter(g => g.id !== groupId);

        localStorage.setItem('groups', JSON.stringify(this.groups));
        localStorage.setItem('users', JSON.stringify(this.users));
        localStorage.setItem('messages', JSON.stringify(messages));
        
        this.logAction('delete_group', { groupId });
        return true;
    }

    // البلاغات
    getReports(status = 'all') {
        let result = this.reports;
        if(status !== 'all') {
            result = result.filter(r => r.status === status);
        }
        
        return result.map(r => ({
            ...r,
            reporterName: this.getUserName(r.reporterId),
            reportedName: this.getUserName(r.reportedId)
        }));
    }

    submitReport(reportedId, reason, evidence = '') {
        const report = {
            id: Date.now(),
            reporterId: this.currentUser.id,
            reportedId,
            reason,
            evidence,
            status: 'pending',
            createdAt: new Date().toISOString(),
            resolvedAt: null,
            resolvedBy: null,
            action: null
        };

        this.reports.push(report);
        this.saveReports();
        return true;
    }

    resolveReport(reportId, action) {
        if(!this.isAdmin()) return false;

        const report = this.reports.find(r => r.id === reportId);
        if(report) {
            report.status = 'resolved';
            report.resolvedAt = new Date().toISOString();
            report.resolvedBy = this.currentUser.id;
            report.action = action;

            // تنفيذ الإجراء
            if(action === 'block') {
                this.blockUser(report.reportedId, 'بلاغ: ' + report.reason);
            } else if(action === 'warn') {
                this.warnUser(report.reportedId, report.reason);
            }

            this.saveReports();
            return true;
        }
        return false;
    }

    warnUser(userId, reason) {
        const warnings = JSON.parse(localStorage.getItem('warnings') || '[]');
        warnings.push({
            userId,
            reason,
            by: this.currentUser.id,
            time: new Date().toISOString()
        });
        localStorage.setItem('warnings', JSON.stringify(warnings));
        
        // إشعار المستخدم
        this.notifyUser(userId, `تحذير: ${reason}`);
    }

    // رسالة عامة
    broadcastMessage(message, target = 'all') {
        if(!this.isAdmin()) return false;

        const broadcast = {
            id: Date.now(),
            message,
            target, // 'all', 'online', 'admins'
            sentBy: this.currentUser.id,
            sentAt: new Date().toISOString(),
            readBy: []
        };

        const broadcasts = JSON.parse(localStorage.getItem('broadcasts') || '[]');
        broadcasts.push(broadcast);
        localStorage.setItem('broadcasts', JSON.stringify(broadcasts));

        // إشعار المستخدمين المستهدفين
        this.users.forEach(u => {
            if(target === 'all' || 
               (target === 'online' && u.isOnline) ||
               (target === 'admins' && (u.role === 'admin' || u.role === 'superadmin'))) {
                this.notifyUser(u.id, `📢 إعلان: ${message.substring(0, 50)}...`);
            }
        });

        return true;
    }

    // النسخ الاحتياطي
    exportData() {
        if(!this.isSuperAdmin()) return null;

        return {
            users: this.users,
            groups: this.groups,
            messages: JSON.parse(localStorage.getItem('messages') || '{}'),
            reports: this.reports,
            exportedAt: new Date().toISOString(),
            exportedBy: this.currentUser.id
        };
    }

    importData(data) {
        if(!this.isSuperAdmin()) return false;

        if(data.users) {
            localStorage.setItem('users', JSON.stringify(data.users));
        }
        if(data.groups) {
            localStorage.setItem('groups', JSON.stringify(data.groups));
        }
        if(data.messages) {
            localStorage.setItem('messages', JSON.stringify(data.messages));
        }

        this.loadData();
        return true;
    }

    // سجل الأحداث
    logAction(action, details) {
        const logs = JSON.parse(localStorage.getItem('adminLogs') || '[]');
        logs.push({
            action,
            details,
            by: this.currentUser.id,
            time: new Date().toISOString(),
            ip: 'client-side'
        });
        localStorage.setItem('adminLogs', JSON.stringify(logs.slice(-1000))); // الاحتفاظ بآخر 1000
    }

    getLogs(limit = 50) {
        const logs = JSON.parse(localStorage.getItem('adminLogs') || '[]');
        return logs.slice(-limit).map(log => ({
            ...log,
            adminName: this.getUserName(log.by)
        }));
    }

    // Helpers
    getUserName(userId) {
        const user = this.users.find(u => u.id === userId);
        return user ? user.fullName : 'Unknown';
    }

    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    saveReports() {
        localStorage.setItem('reports', JSON.stringify(this.reports));
    }

    notifyUser(userId, message) {
        // في الإنتاج: Push Notification أو WebSocket
        console.log(`Notify ${userId}: ${message}`);
    }

    // مراقبة النظام
    startMonitoring() {
        if(!this.isAdmin()) return;

        setInterval(() => {
            this.loadData();
            
            // فحص المستخدمين المتصلين
            const now = new Date();
            this.users.forEach(u => {
                if(u.isOnline) {
                    const lastActive = new Date(u.lastActive);
                    const diff = (now - lastActive) / 1000 / 60; // دقائق
                    
                    if(diff > 5) { // 5 دقائق بدون نشاط
                        u.isOnline = false;
                    }
                }
            });
            
            this.saveUsers();
        }, 30000); // كل 30 ثانية
    }
}

const admin = new AdminSystem();
