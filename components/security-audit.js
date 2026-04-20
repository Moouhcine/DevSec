import { getAuditLogs, getSecuritySystemState } from '../utils/security.js';

/**
 * Composant de supervision technique de la sécurité (pour renforcer la crédibilité technique)
 */
export async function renderSecurityAudit(container) {
    const logsData = await getAuditLogs();
    const logs = [...logsData].reverse(); // Derniers logs en premier
    const state = await getSecuritySystemState();

    const html = `
        <div class="security-audit-panel glass">
            <h3><span class="section-icon">🛡️</span> Supervision Sécurité <span class="tech-badge status-active">LIVE</span></h3>
            
            <div class="security-grid">
                <div class="security-stat">
                    <div class="security-stat-label">Pare-feu (WAF)</div>
                    <div class="security-stat-value">${state.wafStatus}</div>
                </div>
                <div class="security-stat">
                    <div class="security-stat-label">Chiffrement Rest</div>
                    <div class="security-stat-value">${state.encryptionType}</div>
                </div>
                <div class="security-stat">
                    <div class="security-stat-label">Auth Standard</div>
                    <div class="security-stat-value">${state.mfaStandard}</div>
                </div>
                <div class="security-stat">
                    <div class="security-stat-label">Accès ABAC</div>
                    <div class="security-stat-value">${state.abacPolicy}</div>
                </div>
            </div>

            <div class="audit-log-container">
                ${logs.length === 0 ? '<div class="audit-log-entry">En attente d\'événements...</div>' : ''}
                ${logs.map(log => `
                    <div class="audit-log-entry">
                        <span class="log-time">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span class="log-user">UID:${log.userId.toString().slice(-4)}</span>
                        <span class="log-action">${log.action}</span>
                        <span class="log-hash">#sig:${(log.signature || log.hash || '').slice(0,8)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
}
