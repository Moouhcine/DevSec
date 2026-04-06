import { encryptData, decryptData } from './crypto.js';
import { checkWafLockout, recordFailedLogin, resetWafLockout } from './security.js';

const KEYS = {
    USERS: 'nutriapp_users',
    CURRENT_USER: 'nutriapp_current_user',
    PROFILES: 'nutriapp_profiles',
    RECOMMENDATIONS: 'nutriapp_recommendations'
};

export function getUsers() {
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
}

export function saveUsers(users) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
}

export function getCurrentUser() {
    return JSON.parse(sessionStorage.getItem(KEYS.CURRENT_USER) || 'null');
}

export function setCurrentUser(user) {
    sessionStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
}

export function clearCurrentUser() {
    sessionStorage.removeItem(KEYS.CURRENT_USER);
}

export function getProfiles() {
    return JSON.parse(localStorage.getItem(KEYS.PROFILES) || '{}');
}

export function saveProfile(userId, profile) {
    const currentUser = getCurrentUser();
    // Contrôle d'accès ABAC (Élévation de privilèges)
    if (currentUser && currentUser.role === 'consumer' && currentUser.id !== userId) {
        console.error("ABAC: Action bloquée. Impossible de modifier le profil d'un autre utilisateur.");
        return;
    }

    const profiles = getProfiles();
    // Chiffrement des données du profil avant sauvegarde
    profiles[userId] = encryptData(profile);
    localStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles));
}

export function getProfile(userId) {
    const currentUser = getCurrentUser();
    // Contrôle d'accès ABAC (Élévation de privilèges)
    if (currentUser && currentUser.role === 'consumer' && currentUser.id !== userId) {
        console.error("ABAC: Accès refusé. Vous ne pouvez lire que votre propre profil.");
        return null;
    }

    const profiles = getProfiles();
    if (!profiles[userId]) return null;
    
    // Déchiffrement à la volée (rétro-compatibilité s'il s'agit d'un objet non chiffré)
    if (typeof profiles[userId] === 'string') {
        return decryptData(profiles[userId]);
    }
    return profiles[userId];
}

export function getRecommendations() {
    return JSON.parse(localStorage.getItem(KEYS.RECOMMENDATIONS) || '[]');
}

export function saveRecommendations(recs) {
    localStorage.setItem(KEYS.RECOMMENDATIONS, JSON.stringify(recs));
}

export function addRecommendation(rec) {
    const recs = getRecommendations();
    recs.push(rec);
    saveRecommendations(recs);
}

export function updateRecommendation(recId, updates) {
    const recs = getRecommendations();
    const idx = recs.findIndex(r => r.id === recId);
    if (idx !== -1) {
        recs[idx] = { ...recs[idx], ...updates };
        saveRecommendations(recs);
    }
}

export function getRecommendationsForUser(userId) {
    return getRecommendations().filter(r => r.userId === userId);
}

export function getPendingRecommendations() {
    return getRecommendations().filter(r => r.status === 'pending');
}

export function registerUser(username, password, role, totpSecret) {
    const users = getUsers();
    if (users.find(u => u.username === username)) {
        return { success: false, error: 'Ce nom d\'utilisateur existe déjà' };
    }
    const user = {
        id: Date.now().toString(),
        username,
        password,
        role,
        totpSecret,
        createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    return { success: true, user };
}

export function loginUser(username, password, totpCode) {
    const wafCheck = checkWafLockout(username);
    if (wafCheck.locked) {
        return { success: false, error: `Compte bloqué (WAF). Réessayez dans ${wafCheck.remaining}s.` };
    }

    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        // Validation MFA TOTP
        if (user.totpSecret) {
            if (!totpCode) {
                return { success: false, requireTotp: true }; // Demande le code à la vue
            }
            
            try {
                // Utilisation d'otplib injecté globablement via CDN
                const isValid = window.otplib.authenticator.check(totpCode, user.totpSecret);
                if (!isValid) {
                    recordFailedLogin(username);
                    return { success: false, error: 'Code MFA incorrect' };
                }
            } catch (err) {
                return { success: false, error: 'Erreur lors de la vérification MFA' };
            }
        }

        resetWafLockout(username);
        setCurrentUser(user);
        return { success: true, user };
    }
    
    recordFailedLogin(username);
    return { success: false, error: 'Identifiants incorrects' };
}

export function logoutUser() {
    clearCurrentUser();
}
