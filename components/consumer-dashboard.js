import { DISHES } from '../data/dishes.js';
import { getProfile, getRecommendationsForUser, saveRecommendations, getRecommendations } from '../utils/storage.js';

export function generateRecommendations(userId) {
    const profile = getProfile(userId);
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

        if (liked.some(l => dishNameLower.includes(l) || dishCatLower.includes(l))) {
            score += 20;
        }

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

    const allRecs = getRecommendations().filter(r => r.userId !== userId);
    const newRecs = recommended.map((item, i) => ({
        id: `${userId}_${Date.now()}_${i}`,
        userId,
        dishId: item.dish.id,
        dishName: item.dish.name,
        dishImage: item.dish.image,
        dishCategory: item.dish.category,
        dishCalories: item.dish.calories,
        dishDescription: item.dish.description,
        dishAllergens: item.dish.allergens,
        score: item.score,
        status: 'pending',
        nutritionistComment: '',
        nutritionistId: null,
        createdAt: new Date().toISOString()
    }));

    saveRecommendations([...allRecs, ...newRecs]);
    return newRecs;
}

export function renderConsumerDashboard(app, user, onNavigate) {
    const profile = getProfile(user.id);
    let filterStatus = 'all';

    function getFilteredRecommendations(recs) {
        if (filterStatus === 'all') return recs;
        return recs.filter(r => r.status === filterStatus);
    }

    function render() {
        let recs = getRecommendationsForUser(user.id);

        if (recs.length === 0 && profile) {
            recs = generateRecommendations(user.id);
        }

        const bmi = profile ? (profile.poids / (profile.taille * profile.taille)).toFixed(1) : '-';
        const pendingCount = recs.filter(r => r.status === 'pending').length;
        const approvedCount = recs.filter(r => r.status === 'approved').length;
        const rejectedCount = recs.filter(r => r.status === 'rejected').length;
        const filteredRecs = getFilteredRecommendations(recs);

        app.innerHTML = `
      <div class="dashboard-container consumer-dashboard">
        <div class="dashboard-header glass">
          <div class="dashboard-welcome">
            <h2>Bonjour, ${profile?.nom || user.username}</h2>
            <p>Vue claire de votre suivi nutritionnel</p>
          </div>
          <div class="dashboard-actions">
            <button class="btn btn-outline" id="btn-edit-profile">Modifier profil</button>
            <button class="btn btn-outline" id="btn-refresh-recs">Actualiser</button>
            <button class="btn btn-danger" id="btn-logout">Déconnexion</button>
          </div>
        </div>

        ${!profile ? `
          <div class="empty-state glass">
            <span class="empty-icon">📝</span>
            <h3>Profil incomplet</h3>
            <p>Complétez votre profil pour obtenir des recommandations personnalisées.</p>
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
                  <span class="stat-icon">🍽️</span>
                  <div class="stat-value">${recs.length}</div>
                  <div class="stat-label">Recommandations</div>
                </div>
                <div class="stat-card glass">
                  <span class="stat-icon">✅</span>
                  <div class="stat-value approved-color">${approvedCount}</div>
                  <div class="stat-label">Validées</div>
                </div>
                <div class="stat-card glass">
                  <span class="stat-icon">⏳</span>
                  <div class="stat-value pending-color">${pendingCount}</div>
                  <div class="stat-label">En attente</div>
                </div>
              </div>

              <section class="recommendations-panel glass">
                <div class="section-head">
                  <h3>Vos recommandations</h3>
                  <div class="status-filters">
                    <button class="status-filter ${filterStatus === 'all' ? 'active' : ''}" data-status="all">Toutes (${recs.length})</button>
                    <button class="status-filter ${filterStatus === 'pending' ? 'active' : ''}" data-status="pending">En attente (${pendingCount})</button>
                    <button class="status-filter ${filterStatus === 'approved' ? 'active' : ''}" data-status="approved">Validées (${approvedCount})</button>
                    <button class="status-filter ${filterStatus === 'rejected' ? 'active' : ''}" data-status="rejected">Rejetées (${rejectedCount})</button>
                  </div>
                </div>

                ${filteredRecs.length === 0 ? `
                  <div class="empty-inline">
                    <p>Aucune recommandation pour ce filtre.</p>
                  </div>
                ` : `
                  <div class="recs-grid">
                    ${filteredRecs.map(rec => `
                      <article class="rec-card glass status-${rec.status}">
                        <div class="rec-header">
                          <span class="rec-image">${rec.dishImage}</span>
                          <div class="rec-info">
                            <h4>${rec.dishName}</h4>
                            <span class="rec-category">${rec.dishCategory}</span>
                          </div>
                          <span class="status-badge badge-${rec.status}">
                            ${rec.status === 'pending' ? 'En attente' : rec.status === 'approved' ? 'Validée' : 'Rejetée'}
                          </span>
                        </div>
                        <p class="rec-desc">${rec.dishDescription}</p>
                        <div class="rec-meta">
                          <span class="rec-calories">${rec.dishCalories} kcal</span>
                          ${rec.dishAllergens.length > 0 ? `<span class="rec-allergens">${rec.dishAllergens.join(', ')}</span>` : ''}
                        </div>
                        ${rec.nutritionistComment ? `
                          <div class="rec-comment">
                            <strong>Commentaire nutritionniste</strong>
                            <p>${rec.nutritionistComment}</p>
                          </div>
                        ` : ''}
                      </article>
                    `).join('')}
                  </div>
                `}
              </section>
            </main>

            <aside class="consumer-side">
              <div class="profile-summary glass">
                <h3>Profil</h3>
                <div class="profile-tags">
                  <span class="tag tag-blue">${profile.objectifs}</span>
                  <span class="tag tag-purple">${profile.preference}</span>
                  <span class="tag tag-green">${profile.activitePhysique}</span>
                  <span class="tag tag-orange">${profile.modeDeVie}</span>
                  ${profile.hasMaladie === 'oui' ? `<span class="tag tag-red">${profile.maladie || profile.maladieAutre}</span>` : ''}
                  ${(profile.allergies || []).length > 0 ? `<span class="tag tag-yellow">${(profile.allergies || []).length} allergie(s)</span>` : ''}
                </div>
              </div>

              <div class="quick-summary glass">
                <h3>Vue rapide</h3>
                <div class="summary-list">
                  <div class="summary-row"><span>Total recommandations</span><strong>${recs.length}</strong></div>
                  <div class="summary-row"><span>En attente</span><strong class="pending-color">${pendingCount}</strong></div>
                  <div class="summary-row"><span>Validées</span><strong class="approved-color">${approvedCount}</strong></div>
                  <div class="summary-row"><span>Rejetées</span><strong class="rejected-color">${rejectedCount}</strong></div>
                </div>
              </div>
            </aside>
          </div>
        `}
      </div>
    `;

        document.getElementById('btn-logout')?.addEventListener('click', () => onNavigate('logout'));
        document.getElementById('btn-edit-profile')?.addEventListener('click', () => onNavigate('profile'));
        document.getElementById('btn-fill-profile')?.addEventListener('click', () => onNavigate('profile'));

        document.getElementById('btn-refresh-recs')?.addEventListener('click', () => {
            generateRecommendations(user.id);
            render();
        });

        document.querySelectorAll('.status-filter').forEach((button) => {
            button.addEventListener('click', () => {
                filterStatus = button.dataset.status;
                render();
            });
        });
    }

    render();
}
