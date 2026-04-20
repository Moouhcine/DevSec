import { ALLERGIES, SYMPTOMS } from '../data/allergies.js';
import { DISEASES, OBJECTIVES, LIFESTYLES, PREFERENCES, PROFESSIONS, SEXES, PHYSICAL_ACTIVITIES, ACTIVITY_FREQUENCIES } from '../data/diseases.js';
import { saveProfile, getProfile } from '../utils/storage.js';
import { sanitizeInput } from '../utils/security.js';

export async function renderProfileForm(app, user, onSave) {
    const existing = await getProfile(user.id) || {};

    app.innerHTML = `
    <div class="profile-container">
      <div class="profile-header glass">
        <h2>📋 Mon Profil Nutritionnel (Sécurisé SQL)</h2>
        <p>Toutes vos données (y compris profession, ville et symptômes) sont chiffrées en AES-256.</p>
      </div>
      
      <form id="profile-form" class="profile-form">
        <!-- Section Informations Personnelles -->
        <div class="form-section glass">
          <h3><span class="section-icon">👤</span> Informations Personnelles</h3>
          <div class="form-grid">
            <div class="form-group">
              <label for="nom">Nom <span class="required">*</span></label>
              <input type="text" id="nom" value="${existing.nom || ''}" required placeholder="Votre nom complet">
            </div>
            <div class="form-group">
              <label for="age">Âge <span class="required">*</span></label>
              <input type="number" id="age" min="1" max="120" value="${existing.age || ''}" required placeholder="Votre âge">
            </div>
            <div class="form-group">
              <label for="sexe">Sexe <span class="required">*</span></label>
              <select id="sexe" required>
                <option value="">Sélectionnez</option>
                ${SEXES.map(s => `<option value="${s}" ${existing.sexe === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="profession">Profession <span class="required">*</span></label>
              <select id="profession" required>
                <option value="">Sélectionnez</option>
                ${PROFESSIONS.map(p => `<option value="${p}" ${existing.profession === p ? 'selected' : ''}>${p}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="ville">Ville <span class="required">*</span></label>
              <input type="text" id="ville" value="${existing.ville || ''}" required placeholder="Votre ville">
            </div>
            <div class="form-group">
              <label for="modeDeVie">Mode de vie <span class="required">*</span></label>
              <select id="modeDeVie" required>
                <option value="">Sélectionnez</option>
                ${LIFESTYLES.map(l => `<option value="${l}" ${existing.modeDeVie === l ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Section Mesures Corporelles -->
        <div class="form-section glass">
          <h3><span class="section-icon">⚖️</span> Mesures Corporelles</h3>
          <div class="form-grid">
            <div class="form-group">
              <label for="poids">Poids (kg) <span class="required">*</span></label>
              <input type="number" id="poids" min="20" max="300" step="0.1" value="${existing.poids || ''}" required placeholder="ex: 70">
            </div>
            <div class="form-group">
              <label for="taille">Taille (cm) <span class="required">*</span></label>
              <input type="number" id="taille" min="50" max="250" step="1" value="${existing.taille || ''}" required placeholder="ex: 175">
            </div>
          </div>
          <div class="bmi-display" id="bmi-display"></div>
        </div>

        <!-- Section Objectifs & Préférences -->
        <div class="form-section glass">
          <h3><span class="section-icon">🎯</span> Objectifs & Préférences</h3>
          <div class="form-group">
            <label for="objectifs">Objectifs Nutritionnels <span class="required">*</span></label>
            <select id="objectifs" required>
              <option value="">Sélectionnez</option>
              ${OBJECTIVES.map(o => `<option value="${o}" ${existing.objectifs === o ? 'selected' : ''}>${o}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="preference">Préférence alimentaire <span class="required">*</span></label>
            <select id="preference" required>
              <option value="">Sélectionnez</option>
              ${PREFERENCES.map(p => `<option value="${p}" ${existing.preference === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="recettesAimees">Recettes aimées</label>
              <textarea id="recettesAimees" placeholder="ex: Soupe, pizzas...">${existing.recettesAimees || ''}</textarea>
            </div>
            <div class="form-group">
              <label for="recettesNonAimees">Recettes non aimées</label>
              <textarea id="recettesNonAimees" placeholder="ex: Sushi, brocoli...">${existing.recettesNonAimees || ''}</textarea>
            </div>
          </div>
        </div>

        <!-- Section Activité Physique -->
        <div class="form-section glass">
          <h3><span class="section-icon">🏃</span> Activité Physique</h3>
          <div class="form-group">
            <label for="activitePhysique">Pratiquez-vous une activité ? <span class="required">*</span></label>
            <select id="activitePhysique" required>
              <option value="">Sélectionnez</option>
              ${PHYSICAL_ACTIVITIES.map(a => `<option value="${a}" ${existing.activitePhysique === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" id="frequence-group" style="${existing.activitePhysique && existing.activitePhysique !== 'Aucune' ? '' : 'display:none'}">
            <label for="frequenceActivite">Fréquence hebdomadaire</label>
            <select id="frequenceActivite">
              <option value="">Sélectionnez</option>
              ${ACTIVITY_FREQUENCIES.map(f => `<option value="${f}" ${existing.frequenceActivite === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Section Santé & Symptômes -->
        <div class="form-section glass">
          <h3><span class="section-icon">🏥</span> Santé & Symptômes (Données Chiffrées)</h3>
          <div class="form-group">
            <label>Maladie chronique ?</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" name="hasMaladie" value="oui" ${existing.hasMaladie === 'oui' ? 'checked' : ''}>
                <span>Oui</span>
              </label>
              <label class="radio-label">
                <input type="radio" name="hasMaladie" value="non" ${existing.hasMaladie !== 'oui' ? 'checked' : ''}>
                <span>Non</span>
              </label>
            </div>
          </div>
          <div id="maladie-details" style="${existing.hasMaladie === 'oui' ? '' : 'display:none'}">
            <div class="form-group">
              <label for="maladie">Sélectionnez la maladie</label>
              <select id="maladie">
                <option value="">Sélectionnez</option>
                ${DISEASES.map(d => `<option value="${d}" ${existing.maladie === d ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Symptômes récents :</label>
            <div class="checkbox-grid">
              ${SYMPTOMS.map(s => `
                <label class="checkbox-label">
                  <input type="checkbox" name="symptomes" value="${s}" ${(existing.symptomes || []).includes(s) ? 'checked' : ''}>
                  <span>${s}</span>
                </label>
              `).join('')}
            </div>
          </div>
          <div class="form-group">
            <label>Allergies alimentaires :</label>
            <div class="checkbox-grid">
              ${ALLERGIES.map(a => `
                <label class="checkbox-label">
                  <input type="checkbox" name="allergies" value="${a}" ${(existing.allergies || []).includes(a) ? 'checked' : ''}>
                  <span>${a}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-full btn-lg" id="btn-save">
          💾 Enregistrer le profil complet (SQL Secure)
        </button>
      </form>
    </div>
  `;

    // Interactivité
    const poidsInput = document.getElementById('poids');
    const tailleInput = document.getElementById('taille');
    function updateBMI() {
        const poids = parseFloat(poidsInput.value);
        const taille = parseFloat(tailleInput.value) / 100;
        const bmiDisplay = document.getElementById('bmi-display');
        if (poids && taille && taille > 0) {
            const bmi = (poids / (taille * taille)).toFixed(1);
            let category = bmi < 18.5 ? 'Insuffisance' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Surpoids' : 'Obésité';
            bmiDisplay.innerHTML = `<div class="bmi-result"><strong>IMC: ${bmi}</strong> — ${category}</div>`;
        }
    }
    poidsInput.addEventListener('input', updateBMI);
    tailleInput.addEventListener('input', updateBMI);
    document.getElementById('activitePhysique').addEventListener('change', (e) => {
        document.getElementById('frequence-group').style.display = e.target.value !== 'Aucune' && e.target.value ? '' : 'none';
    });
    document.querySelectorAll('input[name="hasMaladie"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('maladie-details').style.display = e.target.value === 'oui' ? '' : 'none';
        });
    });
    updateBMI();

    // Soumission
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save');
        btn.disabled = true;
        btn.innerHTML = 'Hachage et Sync...';

        const profile = {
            nom: sanitizeInput(document.getElementById('nom').value),
            age: parseInt(document.getElementById('age').value),
            sexe: document.getElementById('sexe').value,
            profession: document.getElementById('profession').value,
            ville: sanitizeInput(document.getElementById('ville').value),
            modeDeVie: document.getElementById('modeDeVie').value,
            poids: parseFloat(document.getElementById('poids').value),
            taille: parseFloat(document.getElementById('taille').value),
            objectifs: document.getElementById('objectifs').value,
            preference: document.getElementById('preference').value,
            recettesAimees: sanitizeInput(document.getElementById('recettesAimees').value),
            recettesNonAimees: sanitizeInput(document.getElementById('recettesNonAimees').value),
            activitePhysique: document.getElementById('activitePhysique').value,
            frequenceActivite: document.getElementById('frequenceActivite').value,
            hasMaladie: document.querySelector('input[name="hasMaladie"]:checked')?.value || 'non',
            maladie: document.getElementById('maladie').value,
            allergies: Array.from(document.querySelectorAll('input[name="allergies"]:checked')).map(c => c.value),
            symptomes: Array.from(document.querySelectorAll('input[name="symptomes"]:checked')).map(c => c.value),
            updatedAt: new Date().toISOString()
        };

        await saveProfile(user.id, profile);
        await onSave(profile);
    });
}
