import { getRecommendations, saveRecommendations, getProfile, getUsers } from '../utils/storage.js';

export function renderNutritionistDashboard(app, user, onNavigate) {
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

  function getSortedRecommendations() {
    return getRecommendations()
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  function getRecContext(rec, users) {
    const profile = getProfile(rec.userId);
    const consumer = users.find(u => u.id === rec.userId);
    const consumerId = consumer?.username || profile?.nom || 'inconnu';
    const objective = profile?.objectifs || 'Objectif non defini';
    const age = profile?.age ? `${profile.age} ans` : 'Age non renseigne';
    const sex = profile?.sexe || 'Non renseigne';
    const poids = profile?.poids ? `${profile.poids} kg` : '-';
    const taille = profile?.taille ? `${profile.taille} m` : '-';
    const imc = profile?.poids && profile?.taille ? (profile.poids / (profile.taille * profile.taille)).toFixed(1) : '-';

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

  function applyFilters(recs, users) {
    return recs.filter((rec) => {
      const ctx = getRecContext(rec, users);
      const statusOk = filterStatus === 'all' || rec.status === filterStatus;
      const objectiveOk = filterObjective === 'all' || ctx.objective === filterObjective;
      return statusOk && objectiveOk;
    });
  }

  function showToast(message) {
    toastMessage = message;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = '';
      render();
    }, 2200);
  }

  function handleStatusUpdate(status) {
    const allRecs = getSortedRecommendations();
    const rec = allRecs.find(r => r.id === selectedRecId);
    if (!rec) return;

    const comment = (commentDrafts[selectedRecId] || '').trim();
    if (status === 'rejected' && !comment) {
      actionError = 'Un commentaire est requis pour rejeter.';
      render();
      return;
    }

    actionError = '';
    updateRecStatus(selectedRecId, status, comment, user.id);

    const users = getUsers().filter(u => u.role === 'consumer');
    const consumerName = getRecContext(rec, users).consumerId;
    const updatedRecs = getSortedRecommendations();
    selectedRecId = getNextPendingId(updatedRecs, selectedRecId) || updatedRecs[0]?.id || null;

    showToast(`Recommandation ${status === 'approved' ? 'validee' : 'rejetee'} pour ${consumerName}.`);
    render();
  }

  function renderQueueRow(rec, ctx) {
    const selectedClass = selectedRecId === rec.id ? 'selected' : '';
    const doneClass = rec.status === 'approved' ? 'is-approved' : rec.status === 'rejected' ? 'is-rejected' : '';

    return `
      <article class="review-row ${selectedClass} ${doneClass}" data-rec-id="${rec.id}">
        <div class="review-row-head">
          <div>
            <h4>${rec.dishName}</h4>
            <p>${ctx.consumerId}, ${ctx.age}</p>
          </div>
          <span class="kcal-pill">${rec.dishCalories} kcal</span>
        </div>
        <div class="review-row-meta">
          <span class="mini-pill objective-pill">${ctx.objective}</span>
          <span class="mini-pill status-pill status-${rec.status}">${getStatusLabel(rec.status)}</span>
          ${(rec.dishAllergens || []).map(a => `<span class="mini-pill allergen-pill">${a}</span>`).join('')}
        </div>
      </article>
    `;
  }

  function renderDetail(rec, ctx) {
    const commentValue = commentDrafts[rec.id] ?? rec.nutritionistComment ?? '';
    return `
      <div class="review-detail-card glass">
        <div class="dish-summary">
          <div>
            <h3>${rec.dishName}</h3>
            <span class="detail-sub">${rec.dishCategory || 'Plat principal'}</span>
          </div>
          <span class="kcal-pill">${rec.dishCalories} kcal</span>
        </div>

        <p class="dish-description">${rec.dishDescription || 'Aucune description disponible.'}</p>

        <div class="detail-section">
          <h4>Allergenes</h4>
          <div class="chip-wrap">
            ${(rec.dishAllergens || []).length > 0
              ? rec.dishAllergens.map(a => `<span class="mini-pill allergen-pill">${a}</span>`).join('')
              : '<span class="detail-muted">Aucun allergene declare</span>'}
          </div>
        </div>

        <div class="detail-section snapshot-card">
          <h4>Profil consommateur</h4>
          <div class="snapshot-grid">
            <span><strong>Age:</strong> ${ctx.age}</span>
            <span><strong>Sexe:</strong> ${ctx.sex}</span>
            <span><strong>Poids:</strong> ${ctx.poids}</span>
            <span><strong>Taille:</strong> ${ctx.taille}</span>
            <span><strong>IMC:</strong> ${ctx.imc}</span>
            <span><strong>ID:</strong> ${ctx.consumerId}</span>
          </div>
          <div class="snapshot-goal">
            <strong>Objectif:</strong>
            <span class="mini-pill objective-pill">${ctx.objective}</span>
          </div>
        </div>

        <div class="detail-section decision-zone">
          <label for="nutri-comment">Commentaire</label>
          <textarea id="nutri-comment" placeholder="Ajouter un commentaire...">${commentValue}</textarea>
          ${actionError ? `<p class="decision-error">${actionError}</p>` : ''}
          <div class="decision-actions">
            <button class="btn btn-success" id="btn-approve">Valider la recommandation</button>
            <button class="btn btn-danger" id="btn-reject">Rejeter</button>
          </div>
        </div>
      </div>
    `;
  }

  function render() {
    const allRecs = getSortedRecommendations();
    const users = getUsers().filter(u => u.role === 'consumer');
    const filteredRecs = applyFilters(allRecs, users);

    const pendingCount = allRecs.filter(r => r.status === 'pending').length;
    const approvedCount = allRecs.filter(r => r.status === 'approved').length;
    const rejectedCount = allRecs.filter(r => r.status === 'rejected').length;

    const objectiveOptions = ['all', ...new Set(allRecs.map(rec => getRecContext(rec, users).objective))];

    if (!selectedRecId || !allRecs.some(r => r.id === selectedRecId)) {
      selectedRecId = filteredRecs[0]?.id || allRecs[0]?.id || null;
    }

    const selectedRec = allRecs.find(r => r.id === selectedRecId);
    const selectedCtx = selectedRec ? getRecContext(selectedRec, users) : null;

    app.innerHTML = `
      <div class="dashboard-container nutrition-dashboard">
        <div class="review-header glass">
          <div>
            <h2>Recommandations a valider</h2>
            <p>Revue rapide par ${user.username}</p>
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
              <button class="btn btn-primary" id="btn-validate-next">Valider la prochaine recommandation</button>
              <div class="review-filters">
                <div class="status-filter-row">
                  <button class="status-filter ${filterStatus === 'all' ? 'active' : ''}" data-status="all">Tous</button>
                  <button class="status-filter ${filterStatus === 'pending' ? 'active' : ''}" data-status="pending">En attente</button>
                  <button class="status-filter ${filterStatus === 'approved' ? 'active' : ''}" data-status="approved">Validee</button>
                  <button class="status-filter ${filterStatus === 'rejected' ? 'active' : ''}" data-status="rejected">Rejetee</button>
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
                ? '<div class="empty-inline"><p>Aucune recommandation pour ces filtres.</p></div>'
                : filteredRecs.map((rec) => renderQueueRow(rec, getRecContext(rec, users))).join('')}
            </div>
          </section>

          <section class="review-detail">
            ${pendingCount === 0
              ? `
                <div class="empty-state glass">
                  <h3>Aucune recommandation en attente</h3>
                  <p>Toutes les recommandations ont ete traitees.</p>
                </div>
              `
              : selectedRec && selectedCtx
                ? renderDetail(selectedRec, selectedCtx)
                : `
                  <div class="empty-state glass">
                    <h3>Selectionnez une recommandation</h3>
                    <p>Cliquez sur une ligne de la file de revue.</p>
                  </div>
                `}
          </section>
        </div>
      </div>
    `;

    document.getElementById('btn-logout')?.addEventListener('click', () => onNavigate('logout'));

    document.getElementById('btn-validate-next')?.addEventListener('click', () => {
      const nextId = getNextPendingId(allRecs, selectedRecId);
      if (!nextId) {
        showToast('Aucune recommandation en attente.');
      } else {
        selectedRecId = nextId;
        actionError = '';
      }
      render();
    });

    document.querySelectorAll('.status-filter').forEach((button) => {
      button.addEventListener('click', () => {
        filterStatus = button.dataset.status;
        actionError = '';
        render();
      });
    });

    document.getElementById('objective-filter')?.addEventListener('change', (event) => {
      filterObjective = event.target.value;
      actionError = '';
      render();
    });

    document.querySelectorAll('.review-row').forEach((row) => {
      row.addEventListener('click', () => {
        selectedRecId = row.dataset.recId;
        actionError = '';
        render();
      });
    });

    document.getElementById('nutri-comment')?.addEventListener('input', (event) => {
      if (selectedRecId) commentDrafts[selectedRecId] = event.target.value;
      if (actionError) actionError = '';
    });

    document.getElementById('btn-approve')?.addEventListener('click', () => {
      handleStatusUpdate('approved');
    });

    document.getElementById('btn-reject')?.addEventListener('click', () => {
      handleStatusUpdate('rejected');
    });
  }

  render();
}

function updateRecStatus(recId, status, comment, nutritionistId) {
  const recs = getRecommendations();
  const index = recs.findIndex(r => r.id === recId);
  if (index === -1) return;

  recs[index].status = status;
  recs[index].nutritionistComment = comment;
  recs[index].nutritionistId = nutritionistId;
  recs[index].validatedAt = new Date().toISOString();
  saveRecommendations(recs);
}
