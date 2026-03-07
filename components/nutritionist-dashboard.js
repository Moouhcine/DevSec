import { getPendingRecommendations, getRecommendations, saveRecommendations, getProfile, getUsers } from '../utils/storage.js';

export function renderNutritionistDashboard(app, user, onNavigate) {
  let filterStatus = 'all';
  let selectedRec = null;

  function render() {
    // Re-read from localStorage on every render to get fresh data after approve/reject
    const allRecs = getRecommendations();
    const users = getUsers().filter(u => u.role === 'consumer');

    let filteredRecs = allRecs;
    if (filterStatus === 'pending') filteredRecs = allRecs.filter(r => r.status === 'pending');
    else if (filterStatus === 'approved') filteredRecs = allRecs.filter(r => r.status === 'approved');
    else if (filterStatus === 'rejected') filteredRecs = allRecs.filter(r => r.status === 'rejected');

    const pendingCount = allRecs.filter(r => r.status === 'pending').length;
    const approvedCount = allRecs.filter(r => r.status === 'approved').length;
    const rejectedCount = allRecs.filter(r => r.status === 'rejected').length;

    app.innerHTML = `
      <div class="dashboard-container">
        <div class="dashboard-header glass">
          <div class="dashboard-welcome">
            <h2>👨‍⚕️ Espace Nutritionniste</h2>
            <p>Bienvenue, Dr. ${user.username}</p>
          </div>
          <div class="dashboard-actions">
            <button class="btn btn-danger" id="btn-logout">🚪 Déconnexion</button>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card glass">
            <span class="stat-icon">👥</span>
            <div class="stat-value">${users.length}</div>
            <div class="stat-label">Consommateurs</div>
          </div>
          <div class="stat-card glass">
            <span class="stat-icon">📋</span>
            <div class="stat-value">${allRecs.length}</div>
            <div class="stat-label">Total recommandations</div>
          </div>
          <div class="stat-card glass">
            <span class="stat-icon">⏳</span>
            <div class="stat-value pending-color">${pendingCount}</div>
            <div class="stat-label">En attente</div>
          </div>
          <div class="stat-card glass">
            <span class="stat-icon">✅</span>
            <div class="stat-value approved-color">${approvedCount}</div>
            <div class="stat-label">Validées</div>
          </div>
          <div class="stat-card glass">
            <span class="stat-icon">❌</span>
            <div class="stat-value rejected-color">${rejectedCount}</div>
            <div class="stat-label">Rejetées</div>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="filter-tabs glass">
          <button class="filter-tab ${filterStatus === 'all' ? 'active' : ''}" data-filter="all">Toutes (${allRecs.length})</button>
          <button class="filter-tab ${filterStatus === 'pending' ? 'active' : ''}" data-filter="pending">⏳ En attente (${pendingCount})</button>
          <button class="filter-tab ${filterStatus === 'approved' ? 'active' : ''}" data-filter="approved">✅ Validées (${approvedCount})</button>
          <button class="filter-tab ${filterStatus === 'rejected' ? 'active' : ''}" data-filter="rejected">❌ Rejetées (${rejectedCount})</button>
        </div>

        <!-- Recommendations List -->
        <div class="nutri-layout">
          <div class="recs-list">
            ${filteredRecs.length === 0 ? `
              <div class="empty-state glass">
                <span class="empty-icon">📭</span>
                <h3>Aucune recommandation</h3>
                <p>Aucune recommandation à afficher pour ce filtre.</p>
              </div>
            ` : filteredRecs.map(rec => {
      const consumer = users.find(u => u.id === rec.userId);
      const profile = getProfile(rec.userId);
      return `
                <div class="nutri-rec-card glass ${selectedRec === rec.id ? 'selected' : ''}" data-rec-id="${rec.id}">
                  <div class="nutri-rec-header">
                    <span class="rec-image">${rec.dishImage}</span>
                    <div class="nutri-rec-info">
                      <h4>${rec.dishName}</h4>
                      <span class="rec-for">Pour: <strong>${profile?.nom || consumer?.username || 'Inconnu'}</strong></span>
                    </div>
                    <span class="status-badge badge-${rec.status}">
                      ${rec.status === 'pending' ? '⏳' : rec.status === 'approved' ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
              `;
    }).join('')}
          </div>

          <!-- Detail Panel -->
          <div class="detail-panel" id="detail-panel">
            ${selectedRec ? renderDetailPanel(selectedRec, allRecs, users) : `
              <div class="empty-state glass">
                <span class="empty-icon">👈</span>
                <h3>Sélectionnez une recommandation</h3>
                <p>Cliquez sur une recommandation pour voir les détails et valider/rejeter.</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById('btn-logout')?.addEventListener('click', () => onNavigate('logout'));

    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        filterStatus = tab.dataset.filter;
        render();
      });
    });

    document.querySelectorAll('.nutri-rec-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedRec = card.dataset.recId;
        render();
      });
    });

    // Approve / Reject buttons
    document.getElementById('btn-approve')?.addEventListener('click', () => {
      const comment = document.getElementById('nutri-comment')?.value || '';
      updateRecStatus(selectedRec, 'approved', comment, user.id);
      render();
    });

    document.getElementById('btn-reject')?.addEventListener('click', () => {
      const comment = document.getElementById('nutri-comment')?.value || '';
      updateRecStatus(selectedRec, 'rejected', comment, user.id);
      render();
    });
  }

  render();
}

function renderDetailPanel(recId, allRecs, users) {
  const rec = allRecs.find(r => r.id === recId);
  if (!rec) return '<div class="empty-state glass"><p>Recommandation introuvable</p></div>';

  const profile = getProfile(rec.userId);
  const consumer = users.find(u => u.id === rec.userId);
  const bmi = profile ? (profile.poids / (profile.taille * profile.taille)).toFixed(1) : '—';

  return `
    <div class="detail-content glass">
      <div class="detail-dish">
        <div class="detail-dish-header">
          <span class="detail-dish-image">${rec.dishImage}</span>
          <div>
            <h3>${rec.dishName}</h3>
            <span class="rec-category">${rec.dishCategory} — 🔥 ${rec.dishCalories} kcal</span>
          </div>
        </div>
        <p class="rec-desc">${rec.dishDescription}</p>
        ${rec.dishAllergens.length > 0 ? `
          <div class="allergen-warning">
            <strong>⚠️ Allergènes :</strong> ${rec.dishAllergens.join(', ')}
          </div>
        ` : '<div class="allergen-safe">✅ Aucun allergène identifié</div>'}
      </div>

      ${profile ? `
        <div class="detail-profile">
          <h4>👤 Profil du consommateur : ${profile.nom}</h4>
          <div class="profile-detail-grid">
            <div class="detail-item"><strong>Âge:</strong> ${profile.age} ans</div>
            <div class="detail-item"><strong>Sexe:</strong> ${profile.sexe}</div>
            <div class="detail-item"><strong>Poids:</strong> ${profile.poids} kg</div>
            <div class="detail-item"><strong>Taille:</strong> ${profile.taille} m</div>
            <div class="detail-item"><strong>IMC:</strong> ${bmi}</div>
            <div class="detail-item"><strong>Objectif:</strong> ${profile.objectifs}</div>
            <div class="detail-item"><strong>Mode de vie:</strong> ${profile.modeDeVie}</div>
            <div class="detail-item"><strong>Activité:</strong> ${profile.activitePhysique}</div>
            <div class="detail-item"><strong>Préférence:</strong> ${profile.preference}</div>
            <div class="detail-item"><strong>Repas/jour:</strong> ${profile.nbRepas}</div>
          </div>
          ${profile.hasMaladie === 'oui' ? `
            <div class="detail-warning">
              <strong>🏥 Maladie chronique :</strong> ${profile.maladie || profile.maladieAutre || 'Non précisée'}
            </div>
          ` : ''}
          ${profile.medicaments ? `
            <div class="detail-info">
              <strong>💊 Médicaments :</strong> ${profile.medicaments}
            </div>
          ` : ''}
          ${(profile.allergies || []).length > 0 ? `
            <div class="detail-warning">
              <strong>⚠️ Allergies :</strong> ${profile.allergies.join(', ')}
            </div>
          ` : ''}
          ${(profile.symptomes || []).length > 0 ? `
            <div class="detail-info">
              <strong>🩺 Symptômes :</strong> ${profile.symptomes.join(', ')}
            </div>
          ` : ''}
        </div>
      ` : '<div class="detail-warning">⚠️ Profil du consommateur non disponible</div>'}

      <div class="detail-actions">
        <div class="form-group">
          <label for="nutri-comment">💬 Commentaire (optionnel)</label>
          <textarea id="nutri-comment" placeholder="Ajoutez un commentaire pour le consommateur...">${rec.nutritionistComment || ''}</textarea>
        </div>
        <div class="action-buttons">
          <button class="btn btn-success btn-lg" id="btn-approve">✅ Valider cette recommandation</button>
          <button class="btn btn-danger btn-lg" id="btn-reject">❌ Rejeter cette recommandation</button>
        </div>
        ${rec.status !== 'pending' ? `
          <div class="current-status">
            Statut actuel : <span class="status-badge badge-${rec.status}">
              ${rec.status === 'approved' ? '✅ Validé' : '❌ Rejeté'}
            </span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function updateRecStatus(recId, status, comment, nutritionistId) {
  const recs = getRecommendations();
  const idx = recs.findIndex(r => r.id === recId);
  if (idx !== -1) {
    recs[idx].status = status;
    recs[idx].nutritionistComment = comment;
    recs[idx].nutritionistId = nutritionistId;
    recs[idx].validatedAt = new Date().toISOString();
    saveRecommendations(recs);
  }
}
