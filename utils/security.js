import { api } from './api.js';

const KEYS = {
    FAILED_LOGINS: 'nutriapp_waf_failed_logins'
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000;

export function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

export function checkWafLockout(username) {
    const attemptsStr = localStorage.getItem(KEYS.FAILED_LOGINS) || '{}';
    const attempts = JSON.parse(attemptsStr);
    
    if (attempts[username]) {
        const { count, lastAttempt } = attempts[username];
        if (count >= MAX_FAILED_ATTEMPTS) {
            if (Date.now() - lastAttempt < LOCKOUT_DURATION_MS) {
                return { locked: true, remaining: Math.ceil((LOCKOUT_DURATION_MS - (Date.now() - lastAttempt)) / 1000) };
            } else {
                resetWafLockout(username);
            }
        }
    }
    return { locked: false };
}

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

export function resetWafLockout(username) {
    const attemptsStr = localStorage.getItem(KEYS.FAILED_LOGINS) || '{}';
    const attempts = JSON.parse(attemptsStr);
    if (attempts[username]) {
        delete attempts[username];
        localStorage.setItem(KEYS.FAILED_LOGINS, JSON.stringify(attempts));
    }
}

export async function logAuditAction(userId, action, resourceId) {
    const entry = {
        timestamp: new Date().toISOString(),
        userId,
        action,
        resourceId
    };
    
    const hashData = `${entry.timestamp}-${entry.userId}-${entry.action}-${entry.resourceId}-SECRET-PLATFORM-KEY`;
    entry.hash = CryptoJS.SHA256(hashData).toString().slice(0, 16);
    
    return await api.saveLog(entry);
}

export async function getAuditLogs() {
    return await api.getLogs();
}

export async function getSecuritySystemState() {
    const logs = await getAuditLogs();
    return {
        wafStatus: 'Active (Rate-Limited)',
        encryptionType: 'AES-256-CBC',
        mfaStandard: 'RFC 6238 (TOTP)',
        abacPolicy: 'Enforced',
        lastAudit: logs.length > 0 ? logs[0].timestamp : 'Aucun'
    };
}
