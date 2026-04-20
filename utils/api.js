const API_URL = 'http://localhost:3000/api';

export const api = {
    async register(username, password, role, totpSecret) {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role, totpSecret })
        });
        return res.json();
    },

    async login(username, password) {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return res.json();
    },

    async getProfile(userId) {
        const res = await fetch(`${API_URL}/profile/${userId}`);
        return res.json();
    },

    async saveProfile(userId, data) {
        const res = await fetch(`${API_URL}/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, data })
        });
        return res.json();
    },

    async getRecommendations() {
        const res = await fetch(`${API_URL}/recommendations`);
        return res.json();
    },

    async saveRecommendations(recs) {
        const res = await fetch(`${API_URL}/recommendations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recs)
        });
        return res.json();
    },

    async updateRecommendation(id, status, comment, nutritionistId) {
        const res = await fetch(`${API_URL}/recommendations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, comment, nutritionistId })
        });
        return res.json();
    },

    async getLogs() {
        const res = await fetch(`${API_URL}/logs`);
        return res.json();
    },

    async saveLog(log) {
        const res = await fetch(`${API_URL}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: log.userId,
                action: log.action,
                resourceId: log.resourceId,
                signature: log.hash
            })
        });
        return res.json();
    },

    async generateAIRecommendations(profile) {
        const res = await fetch(`${API_URL}/ai/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile })
        });
        return res.json();
    }
};
