import { getAuditLogs, getSecuritySystemState } from '../utils/security.js';

/**
 * Composant de supervision technique de la sécurité - Audit Logs Only
 */
export async function renderSecurityAudit(container) {
    const logsData = await getAuditLogs();
    const logs = [...logsData].reverse();
    
    const html = `
        <div class="security-audit-panel glass">
            <h3><span class="section-icon">📜</span> Registre d'Audit des Accès <span class="tech-badge status-active">LIVE</span></h3>
            
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
