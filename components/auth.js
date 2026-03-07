export function renderAuth(app, onLogin) {
    let isLogin = true;

    function render() {
        app.innerHTML = `
      <div class="auth-container">
        <div class="auth-card glass">
          <div class="auth-logo">
            <span class="logo-icon">🥗</span>
            <h1>NutriApp</h1>
            <p class="auth-subtitle">Votre assistant nutritionnel intelligent</p>
          </div>
          
          <div class="auth-tabs">
            <button class="auth-tab ${isLogin ? 'active' : ''}" id="tab-login">Connexion</button>
            <button class="auth-tab ${!isLogin ? 'active' : ''}" id="tab-register">Inscription</button>
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
                      <span class="role-desc">Recevez des recommandations personnalisées</span>
                    </div>
                  </label>
                  <label class="role-option">
                    <input type="radio" name="role" value="nutritionist">
                    <div class="role-card">
                      <span class="role-icon">👨‍⚕️</span>
                      <span class="role-label">Nutritionniste</span>
                      <span class="role-desc">Validez les recommandations des consommateurs</span>
                    </div>
                  </label>
                </div>
              </div>
            ` : ''}

            <button type="submit" class="btn btn-primary btn-full">
              ${isLogin ? '🔑 Se connecter' : '✨ S\'inscrire'}
            </button>

            <div id="auth-error" class="auth-error hidden"></div>
          </form>
        </div>
      </div>
    `;

        document.getElementById('tab-login').addEventListener('click', () => {
            isLogin = true;
            render();
        });

        document.getElementById('tab-register').addEventListener('click', () => {
            isLogin = false;
            render();
        });

        document.getElementById('auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            const role = isLogin ? null : (document.querySelector('input[name="role"]:checked')?.value || 'consumer');

            onLogin(username, password, isLogin, role);
        });
    }

    render();
}

export function showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        setTimeout(() => errorEl.classList.add('hidden'), 4000);
    }
}
