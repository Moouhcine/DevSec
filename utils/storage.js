const KEYS = {
    USERS: 'nutriapp_users',
    CURRENT_USER: 'nutriapp_current_user',
    PROFILES: 'nutriapp_profiles',
    RECOMMENDATIONS: 'nutriapp_recommendations'
};

export function getUsers() {
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
}

export function saveUsers(users) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
}

export function getCurrentUser() {
    return JSON.parse(sessionStorage.getItem(KEYS.CURRENT_USER) || 'null');
}

export function setCurrentUser(user) {
    sessionStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
}

export function clearCurrentUser() {
    sessionStorage.removeItem(KEYS.CURRENT_USER);
}

export function getProfiles() {
    return JSON.parse(localStorage.getItem(KEYS.PROFILES) || '{}');
}

export function saveProfile(userId, profile) {
    const profiles = getProfiles();
    profiles[userId] = profile;
    localStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles));
}

export function getProfile(userId) {
    const profiles = getProfiles();
    return profiles[userId] || null;
}

export function getRecommendations() {
    return JSON.parse(localStorage.getItem(KEYS.RECOMMENDATIONS) || '[]');
}

export function saveRecommendations(recs) {
    localStorage.setItem(KEYS.RECOMMENDATIONS, JSON.stringify(recs));
}

export function addRecommendation(rec) {
    const recs = getRecommendations();
    recs.push(rec);
    saveRecommendations(recs);
}

export function updateRecommendation(recId, updates) {
    const recs = getRecommendations();
    const idx = recs.findIndex(r => r.id === recId);
    if (idx !== -1) {
        recs[idx] = { ...recs[idx], ...updates };
        saveRecommendations(recs);
    }
}

export function getRecommendationsForUser(userId) {
    return getRecommendations().filter(r => r.userId === userId);
}

export function getPendingRecommendations() {
    return getRecommendations().filter(r => r.status === 'pending');
}

export function registerUser(username, password, role) {
    const users = getUsers();
    if (users.find(u => u.username === username)) {
        return { success: false, error: 'Ce nom d\'utilisateur existe déjà' };
    }
    const user = {
        id: Date.now().toString(),
        username,
        password,
        role,
        createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    return { success: true, user };
}

export function loginUser(username, password) {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        setCurrentUser(user);
        return { success: true, user };
    }
    return { success: false, error: 'Identifiants incorrects' };
}

export function logoutUser() {
    clearCurrentUser();
}
