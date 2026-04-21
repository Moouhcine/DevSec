import { getRecommendations, getProfile, updateRecommendation } from '../utils/storage.js';
import { logAuditAction, sanitizeInput } from '../utils/security.js';
import { renderSecurityAudit } from './security-audit.js';

export async function renderNutritionistDashboard(app, user, onNavigate) {
  let filterStatus = 'pending';
  let filterObjective = 'all';
  let selectedRecId = null;
  let toastMessage = '';
  let actionError = '';
  const commentDrafts = {};
  let toastTimer = null;

  function getStatusLabel(status) {
    if (status === 'pending') return 'En attente';
    if (status === 'approved') return 'Validee';
    return 'Rejetee';
  }

  async function getRecContext(rec, users, profiles) {
    const profile = profiles[rec.userId] || null;
    const consumer = users.find(u => u.id === rec.userId);
    const consumerId = consumer?.username || profile?.nom || rec.userId.slice(-4);
    const objective = profile?.objectifs || 'Objectif non defini';
    const age = profile?.age ? `${profile.age} ans` : 'Age non renseigne';
    const sex = profile?.sexe || 'Non renseigne';
    const poids = profile?.poids ? `${profile.poids} kg` : '-';
    const taille = profile?.taille ? `${profile.taille} cm` : '-';
    const imc = profile?.poids && profile?.taille ? (profile.poids / ((profile.taille/100) * (profile.taille/100))).toFixed(1) : '-';

    return { consumerId, objective, age, sex, poids, taille, imc };
  }

  function getNextPendingId(recs, fromId) {
    if (!recs.some(r => r.status === 'pending')) return null;
    const startIndex = recs.findIndex(r => r.id === fromId);

    for (let i = startIndex + 1; i < recs.length; i += 1) {
      if (recs[i].status === 'pending') return recs[i].id;
    }

    for (let i = 0; i <= startIndex; i += 1) {
      if (recs[i]?.status === 'pending') return recs[i].id;
    }

    return null;
  }

  function showToast(message) {
    toastMessage = message;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = '';
      render();
    }, 2200);
  }

  async function handleStatusUpdate(status) {
    const allRecsData = await getRecommendations();
    const rec = allRecsData.find(r => r.id === selectedRecId);
    if (!rec) return;

    const comment = (commentDrafts[selectedRecId] || '').trim();
    if (status === 'rejected' && !comment) {
      const errorEl = document.getElementById('decision-error-msg');
      if (errorEl) {
        errorEl.textContent = 'Un commentaire est requis pour rejeter.';
        errorEl.style.display = 'block';
      }
      return;
    }

    actionError = '';
    const safeComment = sanitizeInput(comment);
    await updateRecommendation(selectedRecId, { status, nutritionistComment: safeComment, nutritionistId: user.id });
    await logAuditAction(user.id, status === 'approved' ? 'VALIDATE_REC' : 'REJECT_REC', selectedRecId);

    const updatedRecs = await getRecommendations();
    selectedRecId = getNextPendingId(updatedRecs, selectedRecId) || updatedRecs[0]?.id || null;

    showToast(`Recommandation ${status === 'approved' ? 'validee' : 'rejetee'}.`);
    await render();
  }

  async function render() {
    const allRecs = await getRecommendations();
    
    // Fetch unique user profiles needed
    const userIds = [...new Set(allRecs.map(r => r.userId))];
    const profiles = {};
    for(const id of userIds) {
        profiles[id] = await getProfile(id);
    }
    const fakeUsers = userIds.map(id => ({ id, username: `Utilisateur_${id.slice(-4)}` }));

    const filteredRecs = allRecs.filter(rec => {
        const profile = profiles[rec.userId];
        const statusOk = filterStatus === 'all' || rec.status === filterStatus;
        const objectiveOk = filterObjective === 'all' || (profile?.objectifs === filterObjective);
        return statusOk && objectiveOk;
    });

    const pendingCount = allRecs.filter(r => r.status === 'pending').length;
    const approvedCount = allRecs.filter(r => r.status === 'approved').length;
    const rejectedCount = allRecs.filter(r => r.status === 'rejected').length;

    const objectiveOptions = ['all', ...new Set(Object.values(profiles).map(p => p?.objectifs).filter(Boolean))];

    if (!selectedRecId || !allRecs.some(r => r.id === selectedRecId)) {
      selectedRecId = filteredRecs[0]?.id || allRecs[0]?.id || null;
    }

    const selectedRec = allRecs.find(r => r.id === selectedRecId);
    const selectedCtx = selectedRec ? await getRecContext(selectedRec, fakeUsers, profiles) : null;

    app.innerHTML = `
      <div class="dashboard-container nutrition-dashboard">
        <div class="review-header glass">
          <div>
            <h2>Review Nutritionnelle (MySQL Backend)</h2>
            <p>Expert: ${user.username}</p>
          </div>
          <button class="btn btn-outline" id="btn-logout">Deconnexion</button>
        </div>

        <div class="review-stats">
          <span class="review-chip chip-pending">En attente: ${pendingCount}</span>
          <span class="review-chip chip-approved">Validees: ${approvedCount}</span>
          <span class="review-chip chip-rejected">Rejetees: ${rejectedCount}</span>
        </div>
        ${toastMessage ? `<div class="review-toast">${toastMessage}</div>` : ''}

        <div class="review-layout">
          <section class="review-queue glass">
            <div class="review-queue-top">
              <button class="btn btn-primary" id="btn-validate-next">Prochaine recommandation</button>
              <div class="review-filters">
                <div class="status-filter-row">
                  <button class="status-filter ${filterStatus === 'all' ? 'active' : ''}" data-status="all">Tous</button>
                  <button class="status-filter ${filterStatus === 'pending' ? 'active' : ''}" data-status="pending">En attente</button>
                  <button class="status-filter ${filterStatus === 'approved' ? 'active' : ''}" data-status="approved">Validee</button>
                </div>
                <select id="objective-filter">
                  ${objectiveOptions.map((objective) => `
                    <option value="${objective}" ${filterObjective === objective ? 'selected' : ''}>
                      ${objective === 'all' ? 'Tous objectifs' : objective}
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="review-list">
              ${filteredRecs.length === 0
                ? '<div class="empty-inline"><p>Aucune recommandation.</p></div>'
                : filteredRecs.map((rec) => {
                    const selectedClass = selectedRecId === rec.id ? 'selected' : '';
                    return `
                      <article class="review-row ${selectedClass}" data-rec-id="${rec.id}">
                        <div class="review-row-head">
                          <div>
                            <h4>${rec.dishName}</h4>
                            <p>UID:${rec.userId.slice(-4)}</p>
                          </div>
                          <span class="kcal-pill">${rec.dishCalories} kcal</span>
                        </div>
                        <div class="review-row-meta">
                          <span class="mini-pill status-pill status-${rec.status}">${getStatusLabel(rec.status)}</span>
                        </div>
                      </article>
                    `;
                }).join('')}
            </div>
          </section>

          <section class="review-detail">
            ${selectedRec && selectedCtx
                ? `
                  <div class="review-detail-card glass">
                    <div class="dish-summary">
                      <div>
                        <h3>${selectedRec.dishName}</h3>
                        <span class="detail-sub">${selectedRec.dishCategory}</span>
                      </div>
                      <span class="kcal-pill">${selectedRec.dishCalories} kcal</span>
                    </div>

                    <div class="detail-section snapshot-card">
                      <h4>Profil consommateur (Déchiffré)</h4>
                      <div class="snapshot-grid">
                        <span><strong>Genre:</strong> ${selectedCtx.sex}</span>
                        <span><strong>IMC:</strong> ${selectedCtx.imc}</span>
                        <span><strong>Objectif:</strong> ${selectedCtx.objective}</span>
                      </div>
                    </div>

                    <div class="detail-section decision-zone">
                      ${selectedRec.status === 'accepted' || selectedRec.status === 'rejected_user' ? `
                        <div class="final-status-banner" style="margin-bottom: 20px; padding: 12px; border-radius: 8px; background: ${selectedRec.status === 'accepted' ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${selectedRec.status === 'accepted' ? '#10b981' : '#ef4444'};">
                            <h5 style="margin: 0; color: ${selectedRec.status === 'accepted' ? '#065f46' : '#991b1b'}; display: flex; align-items: center; gap: 8px;">
                                ${selectedRec.status === 'accepted' ? '✅ Accepté par le patient' : '✕ Refusé par le patient'}
                            </h5>
                            <p style="margin: 4px 0 0; font-size: 11px; opacity: 0.8;">Action réalisée le ${new Date(selectedRec.finalizedAt).toLocaleDateString()}</p>
                        </div>
                      ` : ''}
                      <label for="nutri-comment">Commentaire Expert</label>
                      <textarea id="nutri-comment" placeholder="Ajouter un commentaire..." ${selectedRec.status === 'accepted' || selectedRec.status === 'rejected_user' ? 'disabled' : ''}>${commentDrafts[selectedRec.id] || selectedRec.nutritionistComment || ''}</textarea>
                      <p class="decision-error" id="decision-error-msg" style="display: none;"></p>
                      ${selectedRec.status === 'pending' ? `
                        <div class="decision-actions">
                          <button class="btn btn-success" id="btn-approve">Approuver</button>
                          <button class="btn btn-danger" id="btn-reject">Rejeter</button>
                        </div>
                      ` : `
                        <div style="font-size: 12px; opacity: 0.6; font-style: italic; margin-top: 10px;">
                            Cette recommandation a déjà été traitée (Statut: ${selectedRec.status}).
                        </div>
                      `}
                    </div>
                  </div>
                `
                : `<div class="empty-state glass"><p>Sélectionnez une recommandation</p></div>`}
          </section>
        </div>
        <div id="security-audit-root" style="margin-top: var(--space-6);"></div>
      </div>
    `;

    document.getElementById('btn-logout')?.addEventListener('click', () => onNavigate('logout'));
    const securityRoot = document.getElementById('security-audit-root');
    if (securityRoot) renderSecurityAudit(securityRoot);

    document.getElementById('btn-validate-next')?.addEventListener('click', async () => {
      const nextId = getNextPendingId(allRecs, selectedRecId);
      if (nextId) selectedRecId = nextId;
      await render();
    });

    document.querySelectorAll('.status-filter').forEach((button) => {
      button.addEventListener('click', async () => {
        filterStatus = button.dataset.status;
        await render();
      });
    });

    document.getElementById('objective-filter')?.addEventListener('change', async (event) => {
      filterObjective = event.target.value;
      await render();
    });

    document.querySelectorAll('.review-row').forEach((row) => {
      row.addEventListener('click', async () => {
        selectedRecId = row.dataset.recId;
        await render();
      });
    });

    document.getElementById('nutri-comment')?.addEventListener('input', (event) => {
      if (selectedRecId) commentDrafts[selectedRecId] = event.target.value;
    });

    document.getElementById('btn-approve')?.addEventListener('click', () => handleStatusUpdate('approved'));
    document.getElementById('btn-reject')?.addEventListener('click', () => handleStatusUpdate('rejected'));
  }

  await render();
}
