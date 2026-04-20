import { encryptData, decryptData } from './crypto.js';
import { checkWafLockout, recordFailedLogin, resetWafLockout } from './security.js';
import { api } from './api.js';

const KEYS = {
    CURRENT_USER: 'nutriapp_current_user'
};

export function getCurrentUser() {
    return JSON.parse(sessionStorage.getItem(KEYS.CURRENT_USER) || 'null');
}

export function setCurrentUser(user) {
    sessionStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
}

export function clearCurrentUser() {
    sessionStorage.removeItem(KEYS.CURRENT_USER);
}

export async function saveProfile(userId, profile) {
    const currentUser = getCurrentUser();
    // Contrôle d'accès ABAC (Élévation de privilèges)
    if (currentUser && currentUser.role === 'consumer' && currentUser.id !== userId) {
        throw new Error("ABAC: Action bloquée. Impossible de modifier le profil d'un autre utilisateur.");
    }

    // Chiffrement des données du profil avant sauvegarde sur le serveur
    const encryptedData = encryptData(profile);
    return await api.saveProfile(userId, encryptedData);
}

export async function getProfile(userId) {
    const currentUser = getCurrentUser();
    // Contrôle d'accès ABAC
    if (currentUser && currentUser.role === 'consumer' && currentUser.id !== userId) {
        return null;
    }

    const profilesData = await api.getProfile(userId);
    if (!profilesData) return null;
    
    // Déchiffrement
    if (typeof profilesData === 'string') {
        return decryptData(profilesData);
    }
    return profilesData;
}

export async function getRecommendations() {
    const recs = await api.getRecommendations();
    // Parse allergens string back to array if needed (handled by API mostly)
    return recs.map(r => ({
        ...r,
        dishAllergens: typeof r.dishAllergens === 'string' ? JSON.parse(r.dishAllergens) : r.dishAllergens
    }));
}

export async function saveRecommendations(recs) {
    return await api.saveRecommendations(recs);
}

export async function updateRecommendation(recId, updates) {
    // updates contains status, nutritionistComment, etc.
    return await api.updateRecommendation(recId, updates.status, updates.nutritionistComment, updates.nutritionistId);
}

export async function getRecommendationsForUser(userId) {
    const all = await getRecommendations();
    return all.filter(r => r.userId === userId);
}

export async function registerUser(username, password, role, totpSecret) {
    const result = await api.register(username, password, role, totpSecret);
    return result;
}

export async function loginUser(username, password, totpCode) {
    const wafCheck = checkWafLockout(username);
    if (wafCheck.locked) {
        return { success: false, error: `Compte bloqué (WAF). Réessayez dans ${wafCheck.remaining}s.` };
    }

    const result = await api.login(username, password);
    
    if (result.success) {
        const user = result.user;
        // Validation MFA TOTP
        if (user.totpSecret) {
            if (!totpCode) {
                return { success: false, requireTotp: true };
            }
            
            try {
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
    return { success: false, error: result.error || 'Identifiants incorrects' };
}

export function logoutUser() {
    clearCurrentUser();
}
