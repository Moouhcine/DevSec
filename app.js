import { renderAuth, showAuthError } from './components/auth.js';
import { renderProfileForm } from './components/profile-form.js';
import { renderConsumerDashboard, generateRecommendations } from './components/consumer-dashboard.js';
import { renderNutritionistDashboard } from './components/nutritionist-dashboard.js';
import { registerUser, loginUser, logoutUser, getCurrentUser, getProfile } from './utils/storage.js';

class NutriApp {
    constructor() {
        this.app = document.getElementById('app');
        this.currentUser = getCurrentUser();

        // Cross-tab real-time sync is harder with SQL, we rely on standard refreshes
        // or we could implement polling. For now, we manually refresh on route.
        this.init();
    }

    async init() {
        if (this.currentUser) {
            await this.route();
        } else {
            this.showAuth();
        }
    }

    showAuth() {
        renderAuth(this.app, async (username, password, isLogin, role, totpCode, totpSecret) => {
            if (isLogin) {
                const result = await loginUser(username, password, totpCode);
                if (result.requireTotp) {
                    return { requireTotp: true };
                }
                if (result.success) {
                    this.currentUser = result.user;
                    await this.route();
                } else {
                    showAuthError(result.error);
                }
            } else {
                const result = await registerUser(username, password, role, totpSecret);
                if (result.success) {
                    this.currentUser = result.user;
                    // Auto-login after registration
                    await loginUser(username, password, totpCode); 
                    await this.route();
                } else {
                    showAuthError(result.error);
                }
            }
        });
    }

    async route() {
        if (!this.currentUser) {
            this.showAuth();
            return;
        }

        if (this.currentUser.role === 'nutritionist') {
            await this.showNutritionistDashboard();
        } else {
            // Consumer: check if profile exists
            const profile = await getProfile(this.currentUser.id);
            if (!profile) {
                this.showProfileForm();
            } else {
                await this.showConsumerDashboard();
            }
        }
    }

    showProfileForm() {
        renderProfileForm(this.app, this.currentUser, async (profile) => {
            // Generate recommendations after profile save (handled by server now)
            await generateRecommendations(this.currentUser.id);
            await this.showConsumerDashboard();
        });
    }

    async showConsumerDashboard() {
        await renderConsumerDashboard(this.app, this.currentUser, async (action) => {
            if (action === 'logout') {
                logoutUser();
                this.currentUser = null;
                this.showAuth();
            } else if (action === 'profile') {
                this.showProfileForm();
            }
        });
    }

    async showNutritionistDashboard() {
        await renderNutritionistDashboard(this.app, this.currentUser, async (action) => {
            if (action === 'logout') {
                logoutUser();
                this.currentUser = null;
                this.showAuth();
            }
        });
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new NutriApp();
});
