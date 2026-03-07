import { renderAuth, showAuthError } from './components/auth.js';
import { renderProfileForm } from './components/profile-form.js';
import { renderConsumerDashboard, generateRecommendations } from './components/consumer-dashboard.js';
import { renderNutritionistDashboard } from './components/nutritionist-dashboard.js';
import { registerUser, loginUser, logoutUser, getCurrentUser, getProfile } from './utils/storage.js';

class NutriApp {
    constructor() {
        this.app = document.getElementById('app');
        this.currentUser = getCurrentUser();

        // Cross-tab real-time sync: when another tab changes localStorage
        // (e.g. nutritionist validates), auto-refresh this tab's dashboard
        window.addEventListener('storage', (e) => {
            if (e.key === 'nutriapp_recommendations' && this.currentUser) {
                this.route();
            }
        });

        this.init();
    }

    init() {
        if (this.currentUser) {
            this.route();
        } else {
            this.showAuth();
        }
    }

    showAuth() {
        renderAuth(this.app, (username, password, isLogin, role) => {
            if (isLogin) {
                const result = loginUser(username, password);
                if (result.success) {
                    this.currentUser = result.user;
                    this.route();
                } else {
                    showAuthError(result.error);
                }
            } else {
                const result = registerUser(username, password, role);
                if (result.success) {
                    this.currentUser = result.user;
                    loginUser(username, password);
                    this.route();
                } else {
                    showAuthError(result.error);
                }
            }
        });
    }

    route() {
        if (!this.currentUser) {
            this.showAuth();
            return;
        }

        if (this.currentUser.role === 'nutritionist') {
            this.showNutritionistDashboard();
        } else {
            // Consumer: check if profile exists
            const profile = getProfile(this.currentUser.id);
            if (!profile) {
                this.showProfileForm();
            } else {
                this.showConsumerDashboard();
            }
        }
    }

    showProfileForm() {
        renderProfileForm(this.app, this.currentUser, (profile) => {
            // Generate recommendations after profile save
            generateRecommendations(this.currentUser.id);
            this.showConsumerDashboard();
        });
    }

    showConsumerDashboard() {
        renderConsumerDashboard(this.app, this.currentUser, (action) => {
            if (action === 'logout') {
                logoutUser();
                this.currentUser = null;
                this.showAuth();
            } else if (action === 'profile') {
                this.showProfileForm();
            }
        });
    }

    showNutritionistDashboard() {
        renderNutritionistDashboard(this.app, this.currentUser, (action) => {
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
