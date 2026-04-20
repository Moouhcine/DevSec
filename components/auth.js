export function renderAuth(app, onLogin) {
    let isLogin = true;
    let requireTotpLogin = false;
    let currentUsername = "";
    let currentPassword = "";

    // Pour l'inscription
    let currentRole = "consumer";
    let currentTotpSecret = null;
    let qrCodeUrl = null;

    function resetState() {
        requireTotpLogin = false;
        currentUsername = "";
        currentPassword = "";
        currentTotpSecret = null;
        qrCodeUrl = null;
    }

    function render() {
        let content = '';

        if (requireTotpLogin) {
            content = `
              <div class="auth-container">
                <div class="auth-card glass">
                  <div class="security-header" style="margin-bottom: 0;">
                    <span class="vault-badge">
                        🔒 MFA SECURED
                        <div class="tooltip">Le jeton TOTP est validé côté serveur pour une sécurité maximale.</div>
                    </span>
                  </div>
                  <div class="auth-logo">
                    <span class="logo-icon">🔐</span>
                    <h1>Double Authentification</h1>
                    <p class="auth-subtitle">Ouvrez Google Authenticator et saisissez votre code</p>
                  </div>
                  <form id="auth-form" class="auth-form">
                    <div class="form-group">
                      <label for="totp">Code de vérification</label>
                      <input type="text" id="totp" placeholder="123456" required autocomplete="off" maxlength="6">
                    </div>
                    <button type="submit" class="btn btn-primary btn-full" id="btn-submit">Vérifier et se connecter</button>
                    <button type="button" class="btn btn-outline btn-full" id="btn-cancel" style="margin-top: 16px;">Annuler</button>
                    <div id="auth-error" class="auth-error hidden"></div>
                  </form>
                </div>
              </div>
            `;
        } else if (!isLogin && currentTotpSecret) {
            content = `
              <div class="auth-container">
                <div class="auth-card glass">
                  <div class="security-header" style="margin-bottom: 0;">
                    <span class="vault-badge">
                        🛡️ ONBOARDING SECURE
                        <div class="tooltip">Votre clef secrète MFA est générée localement puis synchronisée.</div>
                    </span>
                  </div>
                  <div class="auth-logo">
                    <span class="logo-icon">📱</span>
                    <h1>Sécurisez votre compte</h1>
                    <p class="auth-subtitle">Scannez ce QR Code avec Google Authenticator</p>
                  </div>
                  <div style="display: flex; justify-content: center; margin-bottom: 24px; padding: 16px; background: white; border-radius: 8px;">
                    <div id="qrcode"></div>
                  </div>
                  <form id="auth-form" class="auth-form">
                    <div class="form-group">
                      <label for="totp">Code d'activation généré</label>
                      <input type="text" id="totp" placeholder="123456" required autocomplete="off" maxlength="6">
                    </div>
                    <button type="submit" class="btn btn-primary btn-full" id="btn-submit">Terminer l'inscription</button>
                    <button type="button" class="btn btn-outline btn-full" id="btn-cancel" style="margin-top: 16px;">Annuler</button>
                    <div id="auth-error" class="auth-error hidden"></div>
                  </form>
                </div>
              </div>
            `;
        } else {
            content = `
              <div class="auth-container">
                <div class="auth-card glass">
                  <div class="security-header" style="margin-bottom: 0;">
                    <span class="vault-badge">
                        🔒 SQL SECURE
                        <div class="tooltip">Vos informations de connexion sont hachées et transmises via un tunnel sécurisé.</div>
                    </span>
                  </div>
                  <div class="auth-logo">
                    <span class="logo-icon">🥗</span>
                    <h1>NutriApp</h1>
                    <p class="auth-subtitle">Votre assistant nutritionnel sécurisé (AES-256)</p>
                  </div>
                  
                  <div class="auth-tabs">
                    <button type="button" class="auth-tab ${isLogin ? 'active' : ''}" id="tab-login">Connexion</button>
                    <button type="button" class="auth-tab ${!isLogin ? 'active' : ''}" id="tab-register">Inscription</button>
                  </div>

                  <form id="auth-form" class="auth-form">
                    <div class="form-group">
                      <label for="username">Nom d'utilisateur</label>
                      <input type="text" id="username" placeholder="Entrez votre nom d'utilisateur" required>
                    </div>
                    
                    <div class="form-group">
                      <label for="password">Mot de passe</label>
                      <input type="password" id="password" placeholder="Entrez votre mot de passe" required>
                    </div>

                    ${!isLogin ? `
                      <div class="form-group">
                        <label for="role">Rôle</label>
                        <div class="role-selector">
                          <label class="role-option">
                            <input type="radio" name="role" value="consumer" checked>
                            <div class="role-card">
                              <span class="role-icon">👤</span>
                              <span class="role-label">Consommateur</span>
                              <span class="role-desc">Recevez des recommandations</span>
                            </div>
                          </label>
                          <label class="role-option">
                            <input type="radio" name="role" value="nutritionist">
                            <div class="role-card">
                              <span class="role-icon">👨‍⚕️</span>
                              <span class="role-label">Nutritionniste</span>
                              <span class="role-desc">Validez les recommandations</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    ` : ''}

                    <button type="submit" class="btn btn-primary btn-full" id="btn-submit">
                      ${isLogin ? '🔑 Se connecter' : '✨ S\'inscrire'}
                    </button>

                    <div id="auth-error" class="auth-error hidden"></div>
                  </form>
                </div>
              </div>
            `;
        }

        app.innerHTML = content;

        if (!isLogin && currentTotpSecret && !requireTotpLogin) {
            setTimeout(() => {
                new QRCode(document.getElementById("qrcode"), { 
                    text: qrCodeUrl, 
                    width: 140, 
                    height: 140,
                    colorDark : "#000000",
                    colorLight : "#ffffff"
                });
            }, 0);
        }

        const tabLogin = document.getElementById('tab-login');
        if (tabLogin) {
            tabLogin.addEventListener('click', () => {
                resetState();
                isLogin = true;
                render();
            });
        }

        const tabRegister = document.getElementById('tab-register');
        if (tabRegister) {
            tabRegister.addEventListener('click', () => {
                resetState();
                isLogin = false;
                render();
            });
        }

        const btnCancel = document.getElementById('btn-cancel');
        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                resetState();
                render();
            });
        }

        document.getElementById('auth-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-submit');
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = 'Chargement...';
            
            if (requireTotpLogin) {
                const totpCode = document.getElementById('totp').value.trim();
                await onLogin(currentUsername, currentPassword, true, null, totpCode, null);
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = 'Vérifier et se connecter';
                return;
            } else if (!isLogin && currentTotpSecret) {
                const totpCode = document.getElementById('totp').value.trim();
                const isValid = window.otplib.authenticator.check(totpCode, currentTotpSecret);
                if (isValid) {
                    await onLogin(currentUsername, currentPassword, false, currentRole, totpCode, currentTotpSecret);
                } else {
                    showAuthError("Le code d'activation est incorrect.");
                }
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = "Terminer l'inscription";
                return;
            }

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            
            if (isLogin) {
                currentUsername = username;
                currentPassword = password;
                const result = await onLogin(username, password, true, null, null, null);
                if (result && result.requireTotp) {
                    requireTotpLogin = true;
                    render();
                } else {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = '🔑 Se connecter';
                }
            } else {
                currentUsername = username;
                currentPassword = password;
                currentRole = document.querySelector('input[name="role"]:checked')?.value || 'consumer';
                
                currentTotpSecret = window.otplib.authenticator.generateSecret();
                qrCodeUrl = window.otplib.authenticator.keyuri(username, 'NutriApp', currentTotpSecret);
                render();
            }
        });
    }

    render();
}

export function showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        setTimeout(() => { if (errorEl) errorEl.classList.add('hidden'); }, 5000);
    }
}
