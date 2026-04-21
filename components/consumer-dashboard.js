import { DISHES } from '../data/dishes.js';
import { getProfile, getRecommendationsForUser, saveRecommendations, updateRecommendation } from '../utils/storage.js';
import { renderSecurityAudit } from './security-audit.js';
import { api } from '../utils/api.js';

export async function generateRecommendations(userId) {
    const profile = await getProfile(userId);
    if (!profile) return [];

    const userAllergies = profile.allergies || [];
    const userObjective = profile.objectifs || '';
    const scored = DISHES.map(dish => {
        let score = 50;
        if (dish.allergens.some(a => userAllergies.includes(a))) return { dish, score: -1 };
        if (dish.objectives.includes(userObjective)) score += 30;
        return { dish, score };
    });

    const recommended = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);
    const newRecs = recommended.map((item, i) => ({
        id: `${userId}_${Date.now()}_${i}`,
        userId,
        dishId: item.dish.id,
        dishName: item.dish.name,
        dishCategory: item.dish.category,
        dishCalories: item.dish.calories,
        dishDescription: item.dish.description,
        dishAllergens: item.dish.allergens,
        status: 'pending',
        createdAt: new Date().toISOString()
    }));

    await saveRecommendations(newRecs);
    return newRecs;
}

export async function generateAIRecommendations(userId) {
    const profile = await getProfile(userId);
    if (!profile) return [];
    const result = await api.generateAIRecommendations(profile);
    if (result.success) {
        const newRecs = result.meals.map((meal, i) => ({
            id: `AI_${userId}_${Date.now()}_${i}`,
            userId,
            dishId: `AI_${i}`,
            dishName: meal.name,
            dishCategory: meal.category,
            dishCalories: meal.calories,
            dishDescription: meal.description,
            dishAllergens: meal.allergens,
            aiReasoning: meal.aiReasoning,
            status: 'pending',
            isAI: true,
            provider: result.provider,
            createdAt: new Date().toISOString()
        }));
        await saveRecommendations(newRecs);
        return newRecs;
    }
    return [];
}

export async function renderConsumerDashboard(app, user, onNavigate) {
    const profile = await getProfile(user.id);
    let filterStatus = 'all';

    if (!profile) {
        app.innerHTML = `
            <div class="auth-container">
                <div class="modular-pane" style="max-width: 500px; text-align: center; padding: 40px;">
                    <h2 style="margin-bottom: 20px; font-weight: 800;">Initialisation Requise</h2>
                    <p style="margin-bottom: 30px;">Veuillez compléter votre profil nutritionnel pour recevoir des recommandations personnalisées.</p>
                    <button class="btn btn-primary btn-lg" id="btn-fill-profile">Compléter mon profil</button>
                </div>
            </div>
        `;
        document.getElementById('btn-fill-profile').addEventListener('click', () => onNavigate('profile'));
        return;
    }

    async function render() {
        const recs = await getRecommendationsForUser(user.id);
        const bmi = (profile.poids / ((profile.taille/100) * (profile.taille/100))).toFixed(1);
        const approvedCount = recs.filter(r => r.status === 'approved').length;
        const pendingCount = recs.filter(r => r.status === 'pending').length;
        
        const filteredRecs = filterStatus === 'all' ? recs : recs.filter(r => r.status === filterStatus);

        app.innerHTML = `
            <div class="dashboard-v2">
                <!-- Row 1: Header -->
                <header class="dash-header">
                    <div class="dash-welcome">
                        <h1 style="font-size: 24px; font-weight: 800;">Bonjour, ${profile.nom}</h1>
                        <p style="font-size: 13px; color: var(--text-muted);">Voici votre suivi nutritionnel intelligent.</p>
                    </div>
                    <div class="dash-actions">
                        <button class="btn btn-gel" id="btn-generate-ai">🚀 Encore faim !</button>
                    </div>
                </header>

                <!-- Row 2: KPIs -->
                <section class="dash-kpis">
                    <div class="kpi-card-v2 imc">
                        <div class="kpi-value">${bmi}</div>
                        <div class="kpi-label">IMC Actuel</div>
                    </div>
                    <div class="kpi-card-v2 health">
                        <div class="kpi-value">${profile.hasMaladie === 'oui' ? 'Suivi' : 'RAS'}</div>
                        <div class="kpi-label">Statut Santé</div>
                    </div>
                    <div class="kpi-card-v2 valid">
                        <div class="kpi-value">${approvedCount}</div>
                        <div class="kpi-label">Plats Validés</div>
                    </div>
                </section>

                <!-- Row 3: Main Content -->
                <main class="dash-content">
                    <div class="modular-pane recommendations-v2" style="min-height: 500px;">
                        <div class="section-toolbar">
                            <h3>Mes Recommandations</h3>
                            <div class="status-filters">
                                <button class="status-filter ${filterStatus === 'all' ? 'active' : ''}" data-status="all">Toutes</button>
                                <button class="status-filter ${filterStatus === 'pending' ? 'active' : ''}" data-status="pending">Attente</button>
                                <button class="status-filter ${filterStatus === 'approved' ? 'active' : ''}" data-status="approved">Validées</button>
                                <!-- <button class="status-filter ${filterStatus === 'history' ? 'active' : ''}" data-status="history">Historique</button> -->
                            </div>
                        </div>

                        <div class="rec-list" style="display: flex; flex-direction: column; gap: 12px;">
                            ${filteredRecs.length === 0 ? `
                                <div style="text-align: center; padding: 60px; opacity: 0.5;">Aucun plat trouvé.</div>
                            ` : filteredRecs.map(rec => `
                                <article class="review-row ${rec.status === 'approved' ? 'is-approved' : ''}" style="margin-bottom: 0;">
                                    <div class="review-row-head">
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <span style="font-size: 24px;">${rec.isAI ? '🤖' : '🥗'}</span>
                                            <div>
                                                <h4 style="margin: 0;">${rec.dishName} ${rec.isAI ? `<span class="ai-badge-v2">Moteur: ${rec.provider || 'GPT-OSS'}</span>` : ''}</h4>
                                                <p style="margin: 2px 0 0; color: var(--text-muted); font-size: 12px;">${rec.dishCategory}</p>
                                            </div>
                                        </div>
                                        <span class="kcal-pill">${rec.dishCalories} kcal</span>
                                    </div>
                                    <div class="review-row-meta" style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
                                        <div class="rec-status-area">
                                            <span class="mini-pill status-pill status-${rec.status}">
                                                ${rec.status === 'pending' ? '⌛ En attente Nutri' : 
                                                  rec.status === 'approved' ? '✅ Validé par Nutri' : 
                                                  rec.status === 'accepted' ? '📋 Consommé' : '✕ Refusé'}
                                            </span>
                                            ${rec.finalizedAt ? `
                                                <span style="font-size: 10px; color: var(--text-muted); margin-left: 8px;">
                                                    le ${new Date(rec.finalizedAt).toLocaleDateString()}
                                                </span>
                                            ` : ''}
                                        </div>
                                        <div class="rec-actions-v2">
                                            ${rec.status === 'approved' ? `
                                                <button class="btn-icon approve" data-id="${rec.id}" title="Accepter ce plat">✓</button>
                                                <button class="btn-icon reject" data-id="${rec.id}" title="Refuser ce plat">✕</button>
                                            ` : ''}
                                        </div>
                                    </div>
                                    ${rec.nutritionistComment ? `
                                        <div class="nutritionist-note" style="margin-top: 12px; padding: 8px 12px; background: #f0fdf4; border-radius: 8px; border-left: 3px solid #22c55e; font-size: 13px;">
                                            <strong style="color: #166534;">Note du Nutritionniste :</strong> ${rec.nutritionistComment}
                                        </div>
                                    ` : ''}
                                    ${rec.aiReasoning ? `
                                        <div class="ai-reasoning-bubble" style="margin-top: 12px; font-size: 11px; font-style: italic; opacity: 0.9; line-height: 1.4; border-left: 2px solid var(--accent-primary); padding-left: 10px;">
                                            <strong>Analyse NutriAI :</strong> ${rec.aiReasoning}
                                        </div>
                                    ` : ''}
                                </article>
                            `).join('')}
                        </div>
                    </div>

                    <div id="security-audit-root" style="margin-top: auto;"></div>
                </main>

                <!-- Sidebar (Right) -->
                <aside class="dash-sidebar">
                    <div class="modular-pane profile-card-v2">
                        <div class="profile-header-v2">
                            <div class="profile-img-v2">
                                ${profile.sexe === 'Homme' ? '👨' : '👩'}
                            </div>
                            <h2 style="font-size: 18px; font-weight: 800;">${profile.nom}</h2>
                            <p style="font-size: 11px; color: var(--accent-primary); font-weight: 700; text-transform: uppercase; margin-top: 2px;">${profile.profession}</p>
                        </div>
                        <div class="profile-tags-v2">
                            <span class="mini-tag">📍 ${profile.ville}</span>
                            <span class="mini-tag">🎯 ${profile.objectifs}</span>
                            <span class="mini-tag">💼 ${profile.modeDeVie}</span>
                        </div>
                        <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 8px;">
                            <button class="btn btn-outline btn-full" id="btn-edit-profile" style="font-size: 12px; padding: 8px;">Modifier mon profil</button>
                            <button class="btn btn-outline btn-full" id="btn-logout" style="font-size: 12px; padding: 8px; color: var(--accent-danger);">Déconnexion</button>
                        </div>
                    </div>

                    <div class="modular-pane security-secondary-card" style="padding: 20px;">
                        <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
                            <span style="color: var(--accent-success);">🛡️</span> Supervision Sécurité
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 11px; color: var(--text-muted);">Pare-feu (WAF)</span>
                                <span style="font-size: 11px; font-weight: 700; color: var(--accent-success);">Active (Rate-Limited)</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 11px; color: var(--text-muted);">Chiffrement Rest</span>
                                <span style="font-size: 11px; font-weight: 700;">AES-256-CBC</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 11px; color: var(--text-muted);">Auth Standard</span>
                                <span style="font-size: 11px; font-weight: 700;">RFC 6238 (TOTP)</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 11px; color: var(--text-muted);">Accès ABAC</span>
                                <span style="font-size: 11px; font-weight: 700; color: var(--accent-info);">Enforced</span>
                            </div>
                        </div>
                    </div>

                    <div class="modular-pane" style="padding: 16px; font-size: 11px; line-height: 1.5; opacity: 0.8;">
                        <strong style="display: block; margin-bottom: 4px; font-size: 10px; color: var(--accent-primary);">MONITORING SÉCURISÉ</strong>
                        Vos données sont chiffrées localement et stockées de manière pseudonymisée. NutriApp ne stocke jamais vos informations de santé en clair.
                    </div>
                </aside>
            </div>
        `;

        setupListeners();
    }

    function setupListeners() {
        document.getElementById('btn-logout')?.addEventListener('click', () => onNavigate('logout'));
        document.getElementById('btn-edit-profile')?.addEventListener('click', () => onNavigate('profile'));
        document.getElementById('btn-fill-profile')?.addEventListener('click', () => onNavigate('profile'));
        
        document.getElementById('btn-generate-ai')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-generate-ai');
            btn.disabled = true;
            btn.innerText = 'Scanning...';
            await generateAIRecommendations(user.id);
            await render();
        });

        document.querySelectorAll('.status-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                filterStatus = btn.dataset.status;
                render();
            });
        });

        document.querySelectorAll('.btn-icon.approve').forEach(btn => {
            btn.addEventListener('click', async () => {
                await updateRecommendation(btn.dataset.id, { status: 'accepted' });
                await render();
            });
        });

        document.querySelectorAll('.btn-icon.reject').forEach(btn => {
            btn.addEventListener('click', async () => {
                await updateRecommendation(btn.dataset.id, { status: 'rejected_user' });
                await render();
            });
        });

        const securityRoot = document.getElementById('security-audit-root');
        if (securityRoot) renderSecurityAudit(securityRoot);
    }

    await render();
}
