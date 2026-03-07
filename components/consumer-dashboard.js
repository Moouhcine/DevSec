import { DISHES } from '../data/dishes.js';
import { getProfile, getRecommendationsForUser, addRecommendation, saveRecommendations, getRecommendations } from '../utils/storage.js';

export function generateRecommendations(userId) {
    const profile = getProfile(userId);
    if (!profile) return [];

    const userAllergies = profile.allergies || [];
    const userObjective = profile.objectifs || '';
    const disliked = (profile.recettesNonAimees || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const liked = (profile.recettesAimees || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

    // Score each dish
    const scored = DISHES.map(dish => {
        let score = 50; // base score

        // HARD FILTER: exclude dishes containing user's allergens
        const hasAllergen = dish.allergens.some(a => userAllergies.includes(a));
        if (hasAllergen) return { dish, score: -1 };

        // HARD FILTER: exclude explicitly disliked
        const dishNameLower = dish.name.toLowerCase();
        const dishCatLower = dish.category.toLowerCase();
        if (disliked.some(d => dishNameLower.includes(d) || dishCatLower.includes(d))) {
            return { dish, score: -1 };
        }

        // Bonus for matching objectives
        if (dish.objectives.includes(userObjective)) score += 30;

        // Bonus for liked recipes
        if (liked.some(l => dishNameLower.includes(l) || dishCatLower.includes(l))) {
            score += 20;
        }

        // Adjust for calorie needs based on activity
        if (profile.modeDeVie === 'Sédentaire' && dish.calories > 500) score -= 15;
        if (profile.modeDeVie === 'Très actif' && dish.calories < 200) score -= 10;
        if (profile.modeDeVie === 'Très actif' && dish.calories >= 400) score += 10;

        // Adjust for weight goals
        if (userObjective === 'Perte de poids' && dish.calories > 500) score -= 20;
        if (userObjective === 'Perte de poids' && dish.calories <= 300) score += 15;
        if (userObjective === 'Prise de masse musculaire' && dish.calories >= 400) score += 15;

        return { dish, score };
    });

    // Filter out excluded dishes and sort by score
    const recommended = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    // Clear old recommendations for this user and create new ones
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
        status: 'pending', // pending | approved | rejected
        nutritionistComment: '',
        nutritionistId: null,
        createdAt: new Date().toISOString()
    }));

    saveRecommendations([...allRecs, ...newRecs]);
    return newRecs;
}

export function renderConsumerDashboard(app, user, onNavigate) {
    const profile = getProfile(user.id);
    let recs = getRecommendationsForUser(user.id);

    // Generate recommendations if none exist
    if (recs.length === 0 && profile) {
        recs = generateRecommendations(user.id);
    }

    const bmi = profile ? (profile.poids / (profile.taille * profile.taille)).toFixed(1) : '—';
    const pendingCount = recs.filter(r => r.status === 'pending').length;
    const approvedCount = recs.filter(r => r.status === 'approved').length;
    const rejectedCount = recs.filter(r => r.status === 'rejected').length;

    app.innerHTML = `
    <div class="dashboard-container">
      <div class="dashboard-header glass">
        <div class="dashboard-welcome">
          <h2>👋 Bonjour, ${profile?.nom || user.username}</h2>
          <p>Votre tableau de bord nutritionnel</p>
        </div>
        <div class="dashboard-actions">
          <button class="btn btn-outline" id="btn-edit-profile">✏️ Modifier profil</button>
          <button class="btn btn-outline" id="btn-refresh-recs">🔄 Nouvelles recommandations</button>
          <button class="btn btn-danger" id="btn-logout">🚪 Déconnexion</button>
        </div>
      </div>

      ${!profile ? `
        <div class="empty-state glass">
          <span class="empty-icon">📝</span>
          <h3>Profil incomplet</h3>
          <p>Veuillez compléter votre profil nutritionnel pour recevoir des recommandations personnalisées</p>
          <button class="btn btn-primary" id="btn-fill-profile">Compléter mon profil</button>
        </div>
      ` : `
        <!-- Stats Cards -->
        <div class="stats-grid">
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
          <div class="stat-card glass">
            <span class="stat-icon">❌</span>
            <div class="stat-value rejected-color">${rejectedCount}</div>
            <div class="stat-label">Rejetées</div>
          </div>
        </div>

        <!-- Profile Summary -->
        <div class="profile-summary glass">
          <h3>📊 Résumé de votre profil</h3>
          <div class="profile-tags">
            <span class="tag tag-blue">🎯 ${profile.objectifs}</span>
            <span class="tag tag-purple">🍴 ${profile.preference}</span>
            <span class="tag tag-green">🏃 ${profile.activitePhysique}</span>
            <span class="tag tag-orange">🏠 ${profile.modeDeVie}</span>
            ${profile.hasMaladie === 'oui' ? `<span class="tag tag-red">🏥 ${profile.maladie || profile.maladieAutre}</span>` : ''}
            ${(profile.allergies || []).length > 0 ? `<span class="tag tag-yellow">⚠️ ${profile.allergies.length} allergie(s)</span>` : ''}
          </div>
        </div>

        <!-- Recommendations -->
        <div class="recommendations-section">
          <h3>🍽️ Vos Recommandations</h3>
          <div class="recs-grid">
            ${recs.map(rec => `
              <div class="rec-card glass status-${rec.status}">
                <div class="rec-header">
                  <span class="rec-image">${rec.dishImage}</span>
                  <div class="rec-info">
                    <h4>${rec.dishName}</h4>
                    <span class="rec-category">${rec.dishCategory}</span>
                  </div>
                  <span class="status-badge badge-${rec.status}">
                    ${rec.status === 'pending' ? '⏳ En attente' : rec.status === 'approved' ? '✅ Validé' : '❌ Rejeté'}
                  </span>
                </div>
                <p class="rec-desc">${rec.dishDescription}</p>
                <div class="rec-meta">
                  <span class="rec-calories">🔥 ${rec.dishCalories} kcal</span>
                  ${rec.dishAllergens.length > 0 ? `<span class="rec-allergens">⚠️ ${rec.dishAllergens.join(', ')}</span>` : ''}
                </div>
                ${rec.nutritionistComment ? `
                  <div class="rec-comment">
                    <strong>💬 Commentaire du nutritionniste :</strong>
                    <p>${rec.nutritionistComment}</p>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `}
    </div>
  `;

    // Event listeners
    document.getElementById('btn-logout')?.addEventListener('click', () => onNavigate('logout'));
    document.getElementById('btn-edit-profile')?.addEventListener('click', () => onNavigate('profile'));
    document.getElementById('btn-fill-profile')?.addEventListener('click', () => onNavigate('profile'));
    document.getElementById('btn-refresh-recs')?.addEventListener('click', () => {
        generateRecommendations(user.id);
        renderConsumerDashboard(app, user, onNavigate);
    });
}
