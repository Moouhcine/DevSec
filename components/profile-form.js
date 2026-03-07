import { ALLERGIES, SYMPTOMS } from '../data/allergies.js';
import { DISEASES, OBJECTIVES, LIFESTYLES, PREFERENCES, PROFESSIONS, SEXES, PHYSICAL_ACTIVITIES, ACTIVITY_FREQUENCIES } from '../data/diseases.js';
import { saveProfile, getProfile } from '../utils/storage.js';

export function renderProfileForm(app, user, onSave) {
    const existing = getProfile(user.id) || {};

    app.innerHTML = `
    <div class="profile-container">
      <div class="profile-header glass">
        <h2>📋 Mon Profil Nutritionnel</h2>
        <p>Complétez votre profil pour recevoir des recommandations personnalisées</p>
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
              <label for="taille">Taille (m) <span class="required">*</span></label>
              <input type="number" id="taille" min="0.5" max="2.5" step="0.01" value="${existing.taille || ''}" required placeholder="ex: 1.75">
            </div>
          </div>
          <div class="bmi-display" id="bmi-display"></div>
        </div>

        <!-- Section Objectifs -->
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
            <label for="preference">Votre préférence alimentaire <span class="required">*</span></label>
            <select id="preference" required>
              <option value="">Sélectionnez</option>
              ${PREFERENCES.map(p => `<option value="${p}" ${existing.preference === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="recettesAimees">Recettes que vous aimez <span class="required">*</span></label>
              <textarea id="recettesAimees" placeholder="ex: Soupe, pizzas, tajine..." required>${existing.recettesAimees || ''}</textarea>
            </div>
            <div class="form-group">
              <label for="recettesNonAimees">Recettes que vous n'aimez pas <span class="required">*</span></label>
              <textarea id="recettesNonAimees" placeholder="ex: Sushi, brocoli..." required>${existing.recettesNonAimees || ''}</textarea>
            </div>
          </div>
          <div class="form-group">
            <label for="nbRepas">Combien de repas par jour ? <span class="required">*</span></label>
            <select id="nbRepas" required>
              <option value="">Sélectionnez</option>
              ${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${existing.nbRepas == n ? 'selected' : ''}>${n} repas</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Section Activité Physique -->
        <div class="form-section glass">
          <h3><span class="section-icon">🏃</span> Activité Physique</h3>
          <div class="form-group">
            <label for="activitePhysique">Pratiquez-vous une activité physique ? <span class="required">*</span></label>
            <select id="activitePhysique" required>
              <option value="">Sélectionnez</option>
              ${PHYSICAL_ACTIVITIES.map(a => `<option value="${a}" ${existing.activitePhysique === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" id="frequence-group" style="${existing.activitePhysique && existing.activitePhysique !== 'Aucune' ? '' : 'display:none'}">
            <label for="frequenceActivite">Fréquence par semaine</label>
            <select id="frequenceActivite">
              <option value="">Sélectionnez</option>
              ${ACTIVITY_FREQUENCIES.map(f => `<option value="${f}" ${existing.frequenceActivite === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Section Santé -->
        <div class="form-section glass">
          <h3><span class="section-icon">🏥</span> Santé</h3>
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
              <label for="maladie">Votre maladie chronique</label>
              <select id="maladie">
                <option value="">Sélectionnez</option>
                ${DISEASES.map(d => `<option value="${d}" ${existing.maladie === d ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="maladieAutre">Si non listée, précisez :</label>
              <input type="text" id="maladieAutre" value="${existing.maladieAutre || ''}" placeholder="Votre maladie">
            </div>
          </div>
          <div class="form-group">
            <label for="medicaments">Médicaments réguliers (laissez vide si aucun)</label>
            <textarea id="medicaments" placeholder="Listez vos médicaments...">${existing.medicaments || ''}</textarea>
          </div>
        </div>

        <!-- Section Allergies -->
        <div class="form-section glass">
          <h3><span class="section-icon">⚠️</span> Allergies Alimentaires</h3>
          <div class="form-group">
            <label>Avez-vous une allergie alimentaire ? <span class="required">*</span></label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" name="hasAllergie" value="oui" ${existing.hasAllergie === 'oui' ? 'checked' : ''}>
                <span>Oui</span>
              </label>
              <label class="radio-label">
                <input type="radio" name="hasAllergie" value="non" ${existing.hasAllergie !== 'oui' ? 'checked' : ''}>
                <span>Non</span>
              </label>
            </div>
          </div>
          <div id="allergie-details" style="${existing.hasAllergie === 'oui' ? '' : 'display:none'}">
            <div class="form-group">
              <label>Sélectionnez vos allergies :</label>
              <div class="checkbox-grid" id="allergies-grid">
                ${ALLERGIES.map(a => `
                  <label class="checkbox-label">
                    <input type="checkbox" name="allergies" value="${a}" ${(existing.allergies || []).includes(a) ? 'checked' : ''}>
                    <span>${a}</span>
                  </label>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label for="allergieAutre">Autre allergie non listée :</label>
              <input type="text" id="allergieAutre" value="${existing.allergieAutre || ''}" placeholder="Votre allergie">
            </div>
          </div>
        </div>

        <!-- Section Symptômes -->
        <div class="form-section glass">
          <h3><span class="section-icon">🩺</span> Symptômes</h3>
          <div class="form-group">
            <label>Sélectionnez vos symptômes (le cas échéant) :</label>
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
            <label for="symptomeAutre">Autre symptôme :</label>
            <input type="text" id="symptomeAutre" value="${existing.symptomeAutre || ''}" placeholder="Décrivez votre symptôme">
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-full btn-lg">
          💾 Enregistrer mon profil
        </button>
      </form>
    </div>
  `;

    // BMI calculator
    const poidsInput = document.getElementById('poids');
    const tailleInput = document.getElementById('taille');
    function updateBMI() {
        const poids = parseFloat(poidsInput.value);
        const taille = parseFloat(tailleInput.value);
        const bmiDisplay = document.getElementById('bmi-display');
        if (poids && taille && taille > 0) {
            const bmi = (poids / (taille * taille)).toFixed(1);
            let category = '';
            let color = '';
            if (bmi < 18.5) { category = 'Insuffisance pondérale'; color = '#3b82f6'; }
            else if (bmi < 25) { category = 'Poids normal'; color = '#10b981'; }
            else if (bmi < 30) { category = 'Surpoids'; color = '#f59e0b'; }
            else { category = 'Obésité'; color = '#ef4444'; }
            bmiDisplay.innerHTML = `<div class="bmi-result" style="border-left: 4px solid ${color}"><strong>IMC: ${bmi}</strong> — ${category}</div>`;
        } else {
            bmiDisplay.innerHTML = '';
        }
    }
    poidsInput.addEventListener('input', updateBMI);
    tailleInput.addEventListener('input', updateBMI);
    updateBMI();

    // Toggle activity frequency
    document.getElementById('activitePhysique').addEventListener('change', (e) => {
        document.getElementById('frequence-group').style.display = e.target.value !== 'Aucune' && e.target.value ? '' : 'none';
    });

    // Toggle maladie details
    document.querySelectorAll('input[name="hasMaladie"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('maladie-details').style.display = e.target.value === 'oui' ? '' : 'none';
        });
    });

    // Toggle allergie details
    document.querySelectorAll('input[name="hasAllergie"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('allergie-details').style.display = e.target.value === 'oui' ? '' : 'none';
        });
    });

    // Form submit
    document.getElementById('profile-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const profile = {
            nom: document.getElementById('nom').value,
            age: parseInt(document.getElementById('age').value),
            sexe: document.getElementById('sexe').value,
            profession: document.getElementById('profession').value,
            ville: document.getElementById('ville').value,
            modeDeVie: document.getElementById('modeDeVie').value,
            poids: parseFloat(document.getElementById('poids').value),
            taille: parseFloat(document.getElementById('taille').value),
            objectifs: document.getElementById('objectifs').value,
            preference: document.getElementById('preference').value,
            recettesAimees: document.getElementById('recettesAimees').value,
            recettesNonAimees: document.getElementById('recettesNonAimees').value,
            nbRepas: parseInt(document.getElementById('nbRepas').value),
            activitePhysique: document.getElementById('activitePhysique').value,
            frequenceActivite: document.getElementById('frequenceActivite').value,
            hasMaladie: document.querySelector('input[name="hasMaladie"]:checked')?.value || 'non',
            maladie: document.getElementById('maladie').value,
            maladieAutre: document.getElementById('maladieAutre').value,
            medicaments: document.getElementById('medicaments').value,
            hasAllergie: document.querySelector('input[name="hasAllergie"]:checked')?.value || 'non',
            allergies: Array.from(document.querySelectorAll('input[name="allergies"]:checked')).map(c => c.value),
            allergieAutre: document.getElementById('allergieAutre').value,
            symptomes: Array.from(document.querySelectorAll('input[name="symptomes"]:checked')).map(c => c.value),
            symptomeAutre: document.getElementById('symptomeAutre').value,
            updatedAt: new Date().toISOString()
        };

        saveProfile(user.id, profile);
        onSave(profile);
    });
}
