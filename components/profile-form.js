import { ALLERGIES, SYMPTOMS } from '../data/allergies.js';
import { DISEASES, OBJECTIVES, LIFESTYLES, PREFERENCES, PROFESSIONS, SEXES, PHYSICAL_ACTIVITIES, ACTIVITY_FREQUENCIES } from '../data/diseases.js';
import { saveProfile, getProfile } from '../utils/storage.js';
import { sanitizeInput } from '../utils/security.js';

export async function renderProfileForm(app, user, onSave) {
    const existing = await getProfile(user.id) || {};
    let activeSection = 'personnel';
    
    const profile = {
        nom: existing.nom || '',
        age: existing.age || '',
        sexe: existing.sexe || '',
        profession: existing.profession || '',
        ville: existing.ville || '',
        modeDeVie: existing.modeDeVie || '',
        poids: existing.poids || '',
        taille: existing.taille || '',
        objectifs: existing.objectifs || '',
        preference: existing.preference || '',
        recettesAimees: existing.recettesAimees || '',
        recettesNonAimees: existing.recettesNonAimees || '',
        activitePhysique: existing.activitePhysique || '',
        frequenceActivite: existing.frequenceActivite || '',
        hasMaladie: existing.hasMaladie || 'non',
        maladie: existing.maladie || '',
        allergies: existing.allergies || [],
        symptomes: existing.symptomes || []
    };

    function render() {
        app.innerHTML = `
        <div class="profile-manager">
            <!-- Sidebar Navigation -->
            <aside class="profile-sidebar glass">
                <div class="sidebar-content" style="padding: var(--space-4); flex: 1;">
                    <h2 style="font-size: 14px; margin-bottom: 24px; color: var(--accent-primary);">Mon Profil</h2>
                    <div class="sidebar-item ${activeSection === 'personnel' ? 'active' : ''} ${isSectionValid('personnel') ? 'valid' : ''}" data-section="personnel">
                        <span>👤 Personnel</span>
                        <span class="check">✓</span>
                    </div>
                    <div class="sidebar-item ${activeSection === 'mesures' ? 'active' : ''} ${isSectionValid('mesures') ? 'valid' : ''}" data-section="mesures">
                        <span>⚖️ Mesures</span>
                        <span class="check">✓</span>
                    </div>
                    <div class="sidebar-item ${activeSection === 'objectifs' ? 'active' : ''} ${isSectionValid('objectifs') ? 'valid' : ''}" data-section="objectifs">
                        <span>🎯 Objectifs</span>
                        <span class="check">✓</span>
                    </div>
                    <div class="sidebar-item ${activeSection === 'activite' ? 'active' : ''} ${isSectionValid('activite') ? 'valid' : ''}" data-section="activite">
                        <span>🏃 Activité</span>
                        <span class="check">✓</span>
                    </div>
                    <div class="sidebar-item ${activeSection === 'sante' ? 'active' : ''} ${isSectionValid('sante') ? 'valid' : ''}" data-section="sante">
                        <span>🏥 Santé</span>
                        <span class="check">✓</span>
                    </div>
                </div>

                <div class="sidebar-footer">
                    <span class="vault-badge">
                        🔒 SQL SECURE
                        <div class="tooltip">Toutes vos données sont chiffrées en AES-256 avant stockage.</div>
                    </span>
                </div>
            </aside>

            <!-- Main Content Area -->
            <main class="profile-main-content">
                <form id="profile-form" style="width: 100%;">
                    ${renderActiveSection()}
                </form>
            </main>

            <!-- Live Insights Panel -->
            <aside class="profile-insights glass">
                <div class="bmi-gauge-container">
                    <h3 style="font-size: 14px; margin-bottom: 20px;">Indicateurs Santé</h3>
                    <div class="gauge-svg-wrapper">
                        <svg class="gauge-svg" viewBox="0 0 200 120">
                            <!-- Background arcs as segments -->
                            <path class="gauge-segment seg-blue" d="M30,100 A70,70 0 0,1 60,45" opacity="0.3" />
                            <path class="gauge-segment seg-green" d="M65,42 A70,70 0 0,1 135,42" opacity="0.3" />
                            <path class="gauge-segment seg-yellow" d="M140,45 A70,70 0 0,1 170,100" opacity="0.3" />
                            
                            <circle cx="100" cy="100" r="5" fill="var(--text-primary)" />
                            <line id="gauge-needle" x1="100" y1="100" x2="100" y2="35" stroke="var(--text-primary)" stroke-width="4" stroke-linecap="round" />
                        </svg>
                        <span class="bmi-value-large" id="bmi-val">--</span>
                        <span class="bmi-label-large">VOTRE IMC</span>
                    </div>
                    <div id="bmi-status" class="bmi-status-badge"></div>
                    <p class="text-xs text-muted" style="margin-top:24px; text-align:left; line-height: 1.5;">
                        Votre IMC est un repère pour adapter votre programme alimentaire.
                    </p>
                </div>
                
                <div class="glass security-info-box">
                    <div class="title">CHIFFREMENT AES-256</div>
                    <div class="desc">Vos données de santé sont sécurisées par un tunnel chiffré et stockées sous forme cryptée en base de données.</div>
                </div>
            </aside>
        </div>

        <!-- Sticky Footer -->
        <footer class="sticky-profile-footer">
            <div class="container">
                <button type="button" class="btn btn-primary btn-lg" id="btn-save-sticky" style="min-width: 320px;">
                    Enregistrer mon profil
                </button>
            </div>
        </footer>
        `;

        setupListeners();
        updateBMIUI();
        updateSidebarValidIcons();
    }

    function isSectionValid(section) {
        // Return true only if the section is actually filled
        switch(section) {
            case 'personnel': return !!(profile.nom && profile.age && profile.sexe && profile.profession && profile.ville);
            case 'mesures': return !!(profile.poids && profile.taille);
            case 'objectifs': return !!(profile.objectifs && profile.preference);
            case 'activite': return !!profile.activitePhysique;
            case 'sante': return (profile.symptomes.length > 0 || profile.allergies.length > 0); 
            default: return false;
        }
    }

    function renderActiveSection() {
        switch(activeSection) {
            case 'personnel': return `
                <div class="form-section glass">
                    <h3><span class="section-icon">👤</span> Informations Personnelles</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Nom Complet <span class="required">*</span></label>
                            <input type="text" id="nom" value="${profile.nom}" required placeholder="Jean Dupont" tabindex="1">
                        </div>
                        <div class="form-group">
                            <label>Âge <span class="required">*</span></label>
                            <input type="number" id="age" value="${profile.age}" required placeholder="25" tabindex="2">
                        </div>
                    </div>
                    <div class="form-grid-3">
                        <div class="form-group">
                            <label>Sexe <span class="required">*</span></label>
                            <select id="sexe" required tabindex="3">
                                <option value="">Sélectionnez</option>
                                ${SEXES.map(s => `<option value="${s}" ${profile.sexe === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Profession <span class="required">*</span></label>
                            <select id="profession" required tabindex="4">
                                <option value="">Sélectionnez</option>
                                ${PROFESSIONS.map(p => `<option value="${p}" ${profile.profession === p ? 'selected' : ''}>${p}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Ville <span class="required">*</span></label>
                            <input type="text" id="ville" value="${profile.ville}" required placeholder="Paris" tabindex="5">
                        </div>
                    </div>
                </div>
            `;
            case 'mesures': return `
                <div class="form-section glass" style="max-width: 600px; margin: 0 auto;">
                    <h3><span class="section-icon">⚖️</span> Mesures Corporelles</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Poids (kg) <span class="required">*</span></label>
                            <input type="number" id="poids" min="20" max="300" step="0.1" value="${profile.poids}" required placeholder="70" tabindex="1">
                        </div>
                        <div class="form-group">
                            <label>Taille (cm) <span class="required">*</span></label>
                            <input type="number" id="taille" min="50" max="250" step="1" value="${profile.taille}" required placeholder="175" tabindex="2">
                        </div>
                    </div>
                </div>
            `;
            case 'objectifs': return `
                <div class="form-section glass">
                    <h3><span class="section-icon">🎯</span> Objectifs & Préférences</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Objectif Principal <span class="required">*</span></label>
                            <select id="objectifs" required tabindex="1">
                                <option value="">Sélectionnez</option>
                                ${OBJECTIVES.map(o => `<option value="${o}" ${profile.objectifs === o ? 'selected' : ''}>${o}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Régime Préféré <span class="required">*</span></label>
                            <select id="preference" required tabindex="2">
                                <option value="">Sélectionnez</option>
                                ${PREFERENCES.map(p => `<option value="${p}" ${profile.preference === p ? 'selected' : ''}>${p}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Recettes aimées</label>
                            <textarea id="recettesAimees" placeholder="Pâtes, Poulet, Salade..." tabindex="3">${profile.recettesAimees}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Recettes non aimées</label>
                            <textarea id="recettesNonAimees" placeholder="Sushi, Brocoli, Tofu..." tabindex="4">${profile.recettesNonAimees}</textarea>
                        </div>
                    </div>
                </div>
            `;
            case 'activite': return `
                <div class="form-section glass">
                    <h3><span class="section-icon">🏃</span> Activité Physique</h3>
                    <div class="form-group" style="max-width: 500px;">
                        <label>Activité Sportive <span class="required">*</span></label>
                        <select id="activitePhysique" required tabindex="1">
                            <option value="">Sélectionnez</option>
                            ${PHYSICAL_ACTIVITIES.map(a => `<option value="${a}" ${profile.activitePhysique === a ? 'selected' : ''}>${a}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" id="frequence-group" style="${profile.activitePhysique && profile.activitePhysique !== 'Aucune' ? 'max-width: 500px;' : 'display:none'}">
                        <label>Fréquence Hebdomadaire</label>
                        <select id="frequenceActivite" tabindex="2">
                            <option value="">Sélectionnez</option>
                            ${ACTIVITY_FREQUENCIES.map(f => `<option value="${f}" ${profile.frequenceActivite === f ? 'selected' : ''}>${f}</option>`).join('')}
                        </select>
                    </div>
                </div>
            `;
            case 'sante': return `
                <div class="form-section glass">
                    <h3><span class="section-icon">🏥</span> Santé & Symptômes</h3>
                    <div class="form-group">
                        <label>Souffrez-vous d'une maladie chronique ?</label>
                        <div class="radio-group" style="margin-top: 10px;">
                            <label class="radio-label">
                                <input type="radio" name="hasMaladie" value="oui" ${profile.hasMaladie === 'oui' ? 'checked' : ''}>
                                <span>Oui</span>
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="hasMaladie" value="non" ${profile.hasMaladie !== 'oui' ? 'checked' : ''}>
                                <span>Non</span>
                            </label>
                        </div>
                    </div>
                    
                    <div id="maladie-details" style="${profile.hasMaladie === 'oui' ? '' : 'display:none'}">
                        <div class="form-group">
                            <label>Sélectionnez la pathologie</label>
                            <select id="maladie" tabindex="3">
                                <option value="">Sélectionnez</option>
                                ${DISEASES.map(d => `<option value="${d}" ${profile.maladie === d ? 'selected' : ''}>${d}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Symptômes récents</label>
                        <div class="chip-cloud">
                            ${SYMPTOMS.map(s => `
                                <div class="chip ${profile.symptomes.includes(s) ? 'selected' : ''}" data-type="symptomes" data-value="${s}">
                                    ${s}
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Allergies alimentaires</label>
                        <div class="chip-cloud">
                            ${ALLERGIES.map(a => `
                                <div class="chip ${profile.allergies.includes(a) ? 'selected' : ''}" data-type="allergies" data-value="${a}">
                                    ${a}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            default: return '';
        }
    }

    function setupListeners() {
        // Sidebar Navigation
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                activeSection = item.dataset.section;
                render();
            });
        });

        // Input sync
        const inputs = app.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const id = e.target.id;
                if (id) profile[id] = e.target.value;
                if (id === 'poids' || id === 'taille') updateBMIUI();
                updateSidebarValidIcons();
            });
        });

        app.querySelectorAll('input[name="hasMaladie"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                profile.hasMaladie = e.target.value;
                const details = document.getElementById('maladie-details');
                if (details) details.style.display = e.target.value === 'oui' ? '' : 'none';
                updateSidebarValidIcons();
            });
        });

        app.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const type = chip.dataset.type;
                const value = chip.dataset.value;
                if (profile[type].includes(value)) {
                    profile[type] = profile[type].filter(v => v !== value);
                    chip.classList.remove('selected');
                } else {
                    profile[type].push(value);
                    chip.classList.add('selected');
                }
                updateSidebarValidIcons();
            });
        });

        document.getElementById('btn-save-sticky').addEventListener('click', async () => {
            const btn = document.getElementById('btn-save-sticky');
            btn.disabled = true;
            btn.innerHTML = '🛡️ Chiffrement...';

            const currentInputs = document.getElementById('profile-form').querySelectorAll('input, select, textarea');
            currentInputs.forEach(i => { if(i.id) profile[i.id] = i.value; });

            const finalProfile = { ...profile, updatedAt: new Date().toISOString() };
            for (let key in finalProfile) {
                if (typeof finalProfile[key] === 'string') {
                    finalProfile[key] = sanitizeInput(finalProfile[key]);
                }
            }

            await saveProfile(user.id, finalProfile);
            await onSave(finalProfile);
        });
    }

    function updateSidebarValidIcons() {
        const items = document.querySelectorAll('.sidebar-item');
        items.forEach(item => {
            const section = item.dataset.section;
            if (isSectionValid(section)) {
                item.classList.add('valid');
            } else {
                item.classList.remove('valid');
            }
        });
    }

    function updateBMIUI() {
        const peso = parseFloat(profile.poids);
        const altura = parseFloat(profile.taille) / 100;
        const bmiVal = document.getElementById('bmi-val');
        const bmiStatus = document.getElementById('bmi-status');
        const needle = document.getElementById('gauge-needle');

        if (peso && altura && altura > 0) {
            const bmi = (peso / (altura * altura)).toFixed(1);
            bmiVal.innerText = bmi;

            let color = '#3c8d69';
            let label = 'Normal';
            let angle = -90;

            if (bmi < 18.5) {
                label = 'Insuffisance';
                color = '#6f9ccf';
                angle = -75;
            } else if (bmi < 25) {
                label = 'Poids Santé';
                color = '#3c8d69';
                angle = -15;
            } else if (bmi < 30) {
                label = 'Surpoids';
                color = '#e8ab5e';
                angle = 40;
            } else {
                label = 'Obésité';
                color = '#c9584b';
                angle = 75;
            }

            bmiStatus.innerText = label;
            bmiStatus.style.background = color + '22';
            bmiStatus.style.color = color;
            bmiStatus.style.border = `1px solid ${color}44`;
            
            if (needle) {
                needle.setAttribute('transform', `rotate(${angle}, 100, 100)`);
                needle.style.stroke = color;
            }
        } else {
            bmiVal.innerText = '--';
            bmiStatus.innerText = 'En attente...';
            bmiStatus.style.background = 'var(--bg-secondary)';
            bmiStatus.style.color = 'var(--text-muted)';
            if (needle) needle.style.transform = `rotate(-180deg)`;
        }
    }

    render();
}
