// Mini WAF (Web Application Firewall) & Sanitisation & Audit Logging

const KEYS = {
    FAILED_LOGINS: 'nutriapp_waf_failed_logins',
    AUDIT_LOGS: 'nutriapp_audit_logs'
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 1 minute pour l'exemple

/**
 * Sanitisation simple pour empêcher les injections XSS
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

/**
 * Vérifie si l'utilisateur est bloqué par le WAF (Rate Limiting)
 */
export function checkWafLockout(username) {
    const attemptsStr = localStorage.getItem(KEYS.FAILED_LOGINS) || '{}';
    const attempts = JSON.parse(attemptsStr);
    
    if (attempts[username]) {
        const { count, lastAttempt } = attempts[username];
        if (count >= MAX_FAILED_ATTEMPTS) {
            if (Date.now() - lastAttempt < LOCKOUT_DURATION_MS) {
                return { locked: true, remaining: Math.ceil((LOCKOUT_DURATION_MS - (Date.now() - lastAttempt)) / 1000) };
            } else {
                // Déverrouiller si le temps est écoulé
                resetWafLockout(username);
            }
        }
    }
    return { locked: false };
}

/**
 * Enregistre un échec de connexion (Rate Limiting)
 */
export function recordFailedLogin(username) {
    const attemptsStr = localStorage.getItem(KEYS.FAILED_LOGINS) || '{}';
    const attempts = JSON.parse(attemptsStr);
    
    if (!attempts[username]) {
        attempts[username] = { count: 0, lastAttempt: Date.now() };
    }
    
    attempts[username].count += 1;
    attempts[username].lastAttempt = Date.now();
    
    localStorage.setItem(KEYS.FAILED_LOGINS, JSON.stringify(attempts));
    
    return attempts[username].count >= MAX_FAILED_ATTEMPTS;
}

/**
 * Réinitialise le compteur d'échecs après un succès
 */
export function resetWafLockout(username) {
    const attemptsStr = localStorage.getItem(KEYS.FAILED_LOGINS) || '{}';
    const attempts = JSON.parse(attemptsStr);
    if (attempts[username]) {
        delete attempts[username];
        localStorage.setItem(KEYS.FAILED_LOGINS, JSON.stringify(attempts));
    }
}

/**
 * Audit Log : Enregistre une action non-répudiable
 */
export function logAuditAction(userId, action, resourceId) {
    const logsStr = localStorage.getItem(KEYS.AUDIT_LOGS) || '[]';
    const logs = JSON.parse(logsStr);
    
    const entry = {
        timestamp: new Date().toISOString(),
        userId,
        action,
        resourceId
    };
    
    // Simple hash (pour simuler la non-répudiation)
    const hashData = `${entry.timestamp}-${entry.userId}-${entry.action}-${entry.resourceId}-SECRET`;
    let hash = 0;
    for (let i = 0; i < hashData.length; i++) {
        const char = hashData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    entry.hash = hash.toString(16);
    
    logs.push(entry);
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(logs));
}
