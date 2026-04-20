import { DISHES } from '../data/dishes.js';
import { getProfile, getRecommendationsForUser, saveRecommendations } from '../utils/storage.js';
import { renderSecurityAudit } from './security-audit.js';
import { api } from '../utils/api.js';

export async function generateRecommendations(userId) {
    const profile = await getProfile(userId);
    if (!profile) return [];

    const userAllergies = profile.allergies || [];
    const userObjective = profile.objectifs || '';
    const disliked = (profile.recettesNonAimees || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const liked = (profile.recettesAimees || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

    const scored = DISHES.map(dish => {
        let score = 50;
        const hasAllergen = dish.allergens.some(a => userAllergies.includes(a));
        if (hasAllergen) return { dish, score: -1 };

        const dishNameLower = dish.name.toLowerCase();
        const dishCatLower = dish.category.toLowerCase();
        if (disliked.some(d => dishNameLower.includes(d) || dishCatLower.includes(d))) {
            return { dish, score: -1 };
        }

        if (dish.objectives.includes(userObjective)) score += 30;
        if (liked.some(l => dishNameLower.includes(l) || dishCatLower.includes(l))) score += 20;

        if (profile.modeDeVie === 'Sédentaire' && dish.calories > 500) score -= 15;
        if (profile.modeDeVie === 'Très actif' && dish.calories < 200) score -= 10;
        if (profile.modeDeVie === 'Très actif' && dish.calories >= 400) score += 10;

        if (userObjective === 'Perte de poids' && dish.calories > 500) score -= 20;
        if (userObjective === 'Perte de poids' && dish.calories <= 300) score += 15;
        if (userObjective === 'Prise de masse musculaire' && dish.calories >= 400) score += 15;

        return { dish, score };
    });

    const recommended = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

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
            aiReasoning: meal.aiReasoning, // Preuve de brain
            status: 'pending',
            isAI: true,
            provider: result.provider || 'Gemma 4 31B',
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

    function getFilteredRecommendations(recs) {
        if (filterStatus === 'all') return recs;
        return recs.filter(r => r.status === filterStatus);
    }

    async function render() {
        let recs = await getRecommendationsForUser(user.id);

        const bmi = profile ? (profile.poids / ((profile.taille/100) * (profile.taille/100))).toFixed(1) : '-';
        const pendingCount = recs.filter(r => r.status === 'pending').length;
        const approvedCount = recs.filter(r => r.status === 'approved').length;
        const filteredRecs = getFilteredRecommendations(recs);

        app.innerHTML = `
      <div class="dashboard-container consumer-dashboard">
        <div class="dashboard-header glass">
          <div class="dashboard-welcome">
            <h2>Bonjour, ${profile?.nom || user.username}</h2>
            <p>Intelligence Nutritionnelle Active</p>
          </div>
          <div class="dashboard-actions">
            <button class="btn btn-outline" id="btn-edit-profile">Modifier mon profil</button>
            <button class="btn btn-danger" id="btn-logout">Déconnexion</button>
          </div>
        </div>

        ${!profile ? `
          <div class="empty-state glass">
            <span class="empty-icon">📝</span>
            <h3>Profil requis</h3>
            <p>Veuillez remplir votre profil pour activer l'Agent NutriAI.</p>
            <button class="btn btn-primary" id="btn-fill-profile">Compléter mon profil</button>
          </div>
        ` : `
          <div class="consumer-layout">
            <main class="consumer-main">
              <div class="stats-grid consumer-stats">
                <div class="stat-card glass">
                  <span class="stat-icon">⚖️</span>
                  <div class="stat-value">${bmi}</div>
                  <div class="stat-label">IMC</div>
                </div>
                <div class="stat-card glass">
                  <span class="stat-icon">🏥</span>
                  <div class="stat-value" style="font-size: 0.9rem;">${profile.hasMaladie === 'oui' ? 'Suivi Médical' : 'RAS'}</div>
                  <div class="stat-label">Statut Santé</div>
                </div>
                <div class="stat-card glass">
                  <span class="stat-icon">✅</span>
                  <div class="stat-value approved-color">${approvedCount}</div>
                  <div class="stat-label">Plats validés</div>
                </div>
              </div>

              <section class="recommendations-panel glass">
                <div class="section-head">
                  <h3>Mes Recommandations</h3>
                  ${recs.length > 0 ? `
                    <div class="status-filters">
                      <button class="status-filter ${filterStatus === 'all' ? 'active' : ''}" data-status="all">Toutes</button>
                      <button class="status-filter ${filterStatus === 'pending' ? 'active' : ''}" data-status="pending">En attente</button>
                      <button class="status-filter ${filterStatus === 'approved' ? 'active' : ''}" data-status="approved">Validées</button>
                    </div>
                  ` : ''}
                </div>

                <div class="review-list">
                  ${recs.length === 0 ? `
                    <div class="empty-state-dashboard">
                      <div class="ai-brain-animation">🧠</div>
                      <h3>NutriAI est prêt à cuisiner pour vous</h3>
                      <p>Prêt à générer des menus adaptés à votre profil de <strong>${profile.profession}</strong> ?</p>
                      <button class="btn btn-ai btn-lg" id="btn-generate-ai">🚀 Je veux manger !</button>
                    </div>
                  ` : filteredRecs.length === 0 ? `
                    <div class="empty-inline"><p>Aucun plat trouvé pour ce filtre.</p></div>
                  ` : filteredRecs.map(rec => `
                    <article class="review-row ${rec.status === 'approved' ? 'is-approved' : ''}">
                      <div class="review-row-head">
                        <div>
                          <h4>${rec.dishName} ${rec.isAI ? `<span class="ai-badge">🤖 IA ${rec.provider || ''}</span>` : ''}</h4>
                          <p class="category-text">${rec.dishCategory} • ${rec.dishCalories} kcal</p>
                        </div>
                        <span class="status-indicator-mini status-${rec.status}"></span>
                      </div>
                      
                      <p class="rec-desc">${rec.dishDescription}</p>

                      ${rec.aiReasoning ? `
                        <div class="ai-reasoning-bubble">
                          <div class="bubble-header">🤖 L'analyse de NutriAI :</div>
                          <p>${rec.aiReasoning}</p>
                        </div>
                      ` : ''}

                      ${rec.nutritionistComment ? `
                        <div class="rec-comment">
                          <div class="bubble-header">👨‍⚕️ Avis de l'Expert :</div>
                          <p>${rec.nutritionistComment}</p>
                        </div>
                      ` : ''}
                    </article>
                  `).join('')}
                </div>

                ${recs.length > 0 ? `
                   <div class="panel-footer">
                     <button class="btn btn-ai btn-outline" id="btn-generate-more-ai">➕ Encore faim ! (Génération IA)</button>
                   </div>
                ` : ''}
              </section>
            </main>

            <aside class="consumer-side">
              <div class="profile-summary-card glass">
                <div class="profile-avatar-circle">
                   ${profile.sexe === 'Homme' ? '👨' : profile.sexe === 'Femme' ? '👩' : '👤'}
                </div>
                <h3>${profile.nom}</h3>
                <p class="profile-job">${profile.profession}</p>
                <div class="profile-details-mini">
                  <span>📍 ${profile.ville}</span>
                  <span>🍰 ${profile.age} ans</span>
                </div>
                <hr class="card-divider">
                <div class="profile-tags">
                  <span class="tag tag-target">🎯 ${profile.objectifs}</span>
                  <span class="tag tag-lifestyle">🏢 ${profile.modeDeVie}</span>
                </div>
                ${profile.symptomes.length > 0 ? `
                  <div class="symptom-list-mini">
                    <strong>Symptômes :</strong>
                    ${profile.symptomes.map(s => `<span class="symptom-tag">${s}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            </aside>
          </div>
        `}
        <div id="security-audit-root" style="margin-top: var(--space-6);"></div>
      </div>
    `;

        // Event Listeners
        document.getElementById('btn-logout')?.addEventListener('click', () => onNavigate('logout'));
        document.getElementById('btn-edit-profile')?.addEventListener('click', () => onNavigate('profile'));
        document.getElementById('btn-fill-profile')?.addEventListener('click', () => onNavigate('profile'));

        const handleAIGeneration = async (btnId) => {
            const btn = document.getElementById(btnId);
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '🤖 NutriAI concocte vos menus...';
            await generateAIRecommendations(user.id);
            await render();
        };

        document.getElementById('btn-generate-ai')?.addEventListener('click', () => handleAIGeneration('btn-generate-ai'));
        document.getElementById('btn-generate-more-ai')?.addEventListener('click', () => handleAIGeneration('btn-generate-more-ai'));

        document.querySelectorAll('.status-filter').forEach((button) => {
            button.addEventListener('click', async () => {
                filterStatus = button.dataset.status;
                await render();
            });
        });

        const securityRoot = document.getElementById('security-audit-root');
        if (securityRoot) renderSecurityAudit(securityRoot);
    }

    await render();
}
