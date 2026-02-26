/**
 * نظام إدارة المجموعات - Group Management System
 */

class GroupSystem {
    constructor() {
        this.currentUser = null;
        this.groups = [];
        this.init();
    }

    init() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.loadGroups();
    }

    loadGroups() {
        this.groups = JSON.parse(localStorage.getItem('groups') || '[]');
    }

    saveGroups() {
        localStorage.setItem('groups', JSON.stringify(this.groups));
    }

    createGroup(name, description, members, options = {}) {
        // التحقق من الصلاحيات
        if(members.length < 2) {
            return { success: false, error: 'يجب إضافة عضو واحد على الأقل' };
        }

        const newGroup = {
            id: Date.now(),
            name: name.trim(),
            description: description?.trim() || '',
            avatar: options.avatar || this.generateGroupAvatar(name),
            creator: this.currentUser.id,
            admins: [this.currentUser.id],
            members: [this.currentUser.id, ...members],
            createdAt: new Date().toISOString(),
            settings: {
                onlyAdminsCanPost: false,
                onlyAdminsCanAdd: false,
                approvalRequired: false,
                disappearingMessages: false,
                disappearingTimer: 24 * 60 * 60 * 1000 // 24 ساعة
            },
            inviteLink: this.generateInviteLink(),
            banned: [],
            pinnedMessages: []
        };

        this.groups.push(newGroup);
        this.saveGroups();

        // إضافة للمستخدمين
        this.addGroupToUsers(newGroup.id, newGroup.members);

        return { success: true, group: newGroup };
    }

    generateGroupAvatar(name) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=150&bold=true`;
    }

    generateInviteLink() {
        const token = btoa(Date.now() + Math.random().toString()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
        return `${window.location.origin}/join/${token}`;
    }

    addGroupToUsers(groupId, memberIds) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        memberIds.forEach(memberId => {
            const user = users.find(u => u.id === memberId);
            if(user) {
                if(!user.groups) user.groups = [];
                if(!user.groups.includes(groupId)) {
                    user.groups.push(groupId);
                }
            }
        });

        localStorage.setItem('users', JSON.stringify(users));
        
        // تحديث المستخدم الحالي
        if(memberIds.includes(this.currentUser.id)) {
            this.currentUser.groups = users.find(u => u.id === this.currentUser.id).groups;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }
    }

    joinGroup(groupId, userId = this.currentUser.id) {
        const group = this.groups.find(g => g.id === groupId);
        if(!group) return false;

        if(group.banned.includes(userId)) {
            return { success: false, error: 'تم حظرك من هذه المجموعة' };
        }

        if(group.settings.approvalRequired && !group.pending) {
            group.pending = group.pending || [];
            if(!group.pending.includes(userId)) {
                group.pending.push(userId);
                this.saveGroups();
                return { success: true, pending: true };
            }
        }

        if(!group.members.includes(userId)) {
            group.members.push(userId);
            this.saveGroups();
            this.addGroupToUsers(groupId, [userId]);
        }

        return { success: true, pending: false };
    }

    leaveGroup(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if(!group) return false;

        // إزالة من الأعضاء والمشرفين
        group.members = group.members.filter(id => id !== this.currentUser.id);
        group.admins = group.admins.filter(id => id !== this.currentUser.id);

        // إذا لم يتبقَ مشرفون، تعيين أقدم عضو كمشرف
        if(group.admins.length === 0 && group.members.length > 0) {
            group.admins.push(group.members[0]);
        }

        // حذف المجموعة إذا لم يتبقَ أعضاء
        if(group.members.length === 0) {
            this.groups = this.groups.filter(g => g.id !== groupId);
        }

        this.saveGroups();

        // إزالة من قائمة المستخدم
        this.currentUser.groups = this.currentUser.groups.filter(id => id !== groupId);
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        // تحديث المستخدمين
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.id === this.currentUser.id);
        if(user) {
            user.groups = this.currentUser.groups;
        }
        localStorage.setItem('users', JSON.stringify(users));

        return true;
    }

    deleteGroup(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if(!group) return false;

        // التحقق من الصلاحيات
        if(group.creator !== this.currentUser.id && this.currentUser.role !== 'superadmin') {
            return { success: false, error: 'ليس لديك صلاحية حذف المجموعة' };
        }

        // إزالة من جميع المستخدمين
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        group.members.forEach(memberId => {
            const user = users.find(u => u.id === memberId);
            if(user && user.groups) {
                user.groups = user.groups.filter(id => id !== groupId);
            }
        });
        localStorage.setItem('users', JSON.stringify(users));

        // حذف رسائل المجموعة
        const messages = JSON.parse(localStorage.getItem('messages') || '{}');
        delete messages[`group_${groupId}`];
        localStorage.setItem('messages', JSON.stringify(messages));

        // حذف المجموعة
        this.groups = this.groups.filter(g => g.id !== groupId);
        this.saveGroups();

        // تحديث المستخدم الحالي
        this.currentUser.groups = this.currentUser.groups.filter(id => id !== groupId);
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        return { success: true };
    }

    // Admin Functions
    promoteToAdmin(groupId, userId) {
        const group = this.groups.find(g => g.id === groupId);
        if(!group || !this.isAdmin(groupId)) return false;

        if(!group.admins.includes(userId)) {
            group.admins.push(userId);
            this.saveGroups();
            
            // إرسال إشعار
            this.notifyUser(userId, `تم ترقيتك لمشرف في مجموعة ${group.name}`);
            return true;
        }
        return false;
    }

    demoteFromAdmin(groupId, userId) {
        const group = this.groups.find(g => g.id === groupId);
        if(!group || group.creator !== this.currentUser.id) return false;

        if(group.admins.includes(userId) && userId !== group.creator) {
            group.admins = group.admins.filter(id => id !== userId);
            this.saveGroups();
            return true;
        }
        return false;
    }

    removeMember(groupId, userId) {
        const group = this.groups.find(g => g.id === groupId);
        if(!group || !this.isAdmin(groupId)) return false;

        if(userId === group.creator) {
            return { success: false, error: 'لا يمكن إزالة منشئ المجموعة' };
        }

        group.members = group.members.filter(id => id !== userId);
        group.admins = group.admins.filter(id => id !== userId);
        this.saveGroups();

        // إزالة من قائمة المستخدم
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.id === userId);
        if(user) {
            user.groups = user.groups.filter(id => id !== groupId);
        }
        localStorage.setItem('users', JSON.stringify(users));

        return { success: true };
    }

    banMember(groupId, userId) {
        const group = this.groups.find(g => g.id === groupId);
        if(!group || !this.isAdmin(groupId)) return false;

        if(!group.banned) group.banned = [];
        if(!group.banned.includes(userId)) {
            group.banned.push(userId);
            this.removeMember(groupId, userId);
            return true;
        }
        return false;
    }

    unbanMember(groupId, userId) {
        const group = this.groups.find(g => g.id === groupId);
        if(!group || !this.isAdmin(groupId)) return false;

        group.banned = group.banned.filter(id => id !== userId);
        this.saveGroups();
        return true;
    }

    approveMember(groupId, userId) {
        const group = this.groups.find(g => g.id === groupId);
        if(!group || !this.isAdmin(groupId)) return false;

        if(group.pending) {
            group.pending = group.pending.filter(id => id !== userId);
            group.members.push(userId);
            this.saveGroups();
            this.addGroupToUsers(groupId, [userId]);
            return true;
        }
        return false;
    }

    rejectMember(groupId, userId) {
        const group = this.groups.find(g => g.id === groupId);
        if(!group || !this.isAdmin(groupId)) return false;

        if(group.pending) {
            group.pending = group.pending.filter(id => id !== userId);
            this.saveGroups();
            return true;
        }
        return false;
    }

    updateSettings(groupId, settings) {
        const group = this.groups.find(g => g.id === groupId);
        if(!group || !this.isAdmin(groupId)) return false;

        Object.assign(group.settings, settings);
        this.saveGroups();
        return true;
    }

    regenerateInviteLink(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if(!group || !this.isAdmin(groupId)) return false;

        group.inviteLink = this.generateInviteLink();
        this.saveGroups();
        return group.inviteLink;
    }

    // Helper Methods
    isAdmin(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        return group && (group.admins.includes(this.currentUser.id) || this.currentUser.role === 'superadmin');
    }

    isMember(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        return group && group.members.includes(this.currentUser.id);
    }

    getGroupInfo(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if(!group) return null;

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        return {
            ...group,
            membersList: group.members.map(id => {
                const user = users.find(u => u.id === id);
                return {
                    id,
                    name: user?.fullName || 'Unknown',
                    avatar: user?.avatar,
                    isAdmin: group.admins.includes(id),
                    isOnline: user?.isOnline || false
                };
            }),
            isAdmin: this.isAdmin(groupId),
            isCreator: group.creator === this.currentUser.id
        };
    }

    getMyGroups() {
        return this.groups.filter(g => 
            g.members.includes(this.currentUser.id)
        ).map(g => ({
            ...g,
            unreadCount: this.getUnreadCount(g.id)
        }));
    }

    getUnreadCount(groupId) {
        const messages = JSON.parse(localStorage.getItem('messages') || '{}');
        const groupMessages = messages[`group_${groupId}`] || [];
        
        return groupMessages.filter(m => 
            m.sender !== this.currentUser.id && !m.read
        ).length;
    }

    searchGroups(query) {
        return this.groups.filter(g => 
            g.name.toLowerCase().includes(query.toLowerCase()) ||
            g.description.toLowerCase().includes(query.toLowerCase())
        );
    }

    notifyUser(userId, message) {
        // في الإنتاج، استخدم Push Notifications
        console.log(`Notification to ${userId}: ${message}`);
    }
}

const groupSystem = new GroupSystem();
