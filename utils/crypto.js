// Clé statique locale pour simuler la clé du serveur (architecture 3-tiers)
// Comme le projet est purement front-end, cette clé permet au consommateur de chiffrer 
// et au nutritionniste de déchiffrer les données.
const SECRET_KEY = "NutriApp_SECURE_Master_Key_2026!";

/**
 * Chiffre un objet JSON en une chaîne AES-256 (Base64)
 * @param {Object} data 
 * @returns {string} Données chiffrées
 */
export function encryptData(data) {
    if (!data) return data;
    try {
        const jsonStr = JSON.stringify(data);
        return CryptoJS.AES.encrypt(jsonStr, SECRET_KEY).toString();
    } catch (e) {
        console.error("Erreur de chiffrement :", e);
        return null;
    }
}

/**
 * Déchiffre une chaîne AES-256 en objet JSON
 * @param {string} cipherText 
 * @returns {Object} Données déchiffrées
 */
export function decryptData(cipherText) {
    if (!cipherText) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
        const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedStr);
    } catch (e) {
        console.error("Erreur de déchiffrement :", e);
        return null;
    }
}
