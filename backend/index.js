const path = require('path');
const fs = require('fs');

// Diagnostic de chargement .env
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (global.systemLog) {
    global.systemLog(`Chemin recherché pour .env : ${envPath}`);
    global.systemLog(`Fichier .env physiquement présent : ${envExists ? 'OUI' : 'NON'}`, envExists ? 'success' : 'error');
}

require('dotenv').config({ path: envPath });

if (global.systemLog) {
    global.systemLog(`Statut OpenRouter : ${process.env.OPENROUTER_API_KEY ? 'CONFIGURÉ' : 'MANQUANT'}`, process.env.OPENROUTER_API_KEY ? 'success' : 'error');
    global.systemLog(`Statut Gemini : ${process.env.GEMINI_API_KEY ? 'CONFIGURÉ' : 'MANQUANT'}`, process.env.GEMINI_API_KEY ? 'success' : 'error');
}

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
};

let pool;

async function initDB() {
    try {
        pool = mysql.createPool(dbConfig);
        console.log('Connected to SQL Database');

        // Initialization of tables
        const connection = await pool.getConnection();
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(50) PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('consumer', 'nutritionist') NOT NULL,
                totpSecret VARCHAR(100),
                createdAt DATETIME
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS profiles (
                userId VARCHAR(50) PRIMARY KEY,
                data TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS recommendations (
                id VARCHAR(50) PRIMARY KEY,
                userId VARCHAR(50) NOT NULL,
                dishId VARCHAR(50) NOT NULL,
                dishName VARCHAR(100),
                dishCategory VARCHAR(50),
                dishCalories INT,
                dishDescription TEXT,
                dishAllergens TEXT,
                status ENUM('pending', 'approved', 'rejected', 'accepted', 'rejected_user') DEFAULT 'pending',
                nutritionistComment TEXT,
                aiReasoning TEXT,
                nutritionistId VARCHAR(50),
                createdAt DATETIME,
                validatedAt DATETIME,
                finalizedAt DATETIME,
                FOREIGN KEY (userId) REFERENCES users(id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                timestamp DATETIME,
                userId VARCHAR(50),
                action VARCHAR(100),
                resourceId VARCHAR(50),
                signature VARCHAR(255)
            )
        `);

        connection.release();
        
        // Migration silencieuse pour les colonnes manquantes
        const [columns] = await pool.query('SHOW COLUMNS FROM recommendations');
        const hasFinalizedAt = columns.some(c => c.Field === 'finalizedAt');
        if (!hasFinalizedAt) {
            await pool.query('ALTER TABLE recommendations ADD COLUMN finalizedAt DATETIME');
        }
        // Mise à jour de l'ENUM (MySQL/MariaDB)
        await pool.query("ALTER TABLE recommendations MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'accepted', 'rejected_user') DEFAULT 'pending'");

        console.log('Database schema verified and updated');
    } catch (err) {
        console.error('Database connection failed:', err);
    }
}

// --- Auth Routes ---

app.post('/api/register', async (req, res) => {
    const { username, password, role, totpSecret } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = Date.now().toString();
        
        await pool.query(
            'INSERT INTO users (id, username, password, role, totpSecret, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
            [userId, username, hashedPassword, role, totpSecret]
        );
        
        res.json({ success: true, user: { id: userId, username, role, totpSecret } });
    } catch (err) {
        res.status(400).json({ success: false, error: 'User already exists or DB error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ success: false, error: 'User not found' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
            res.json({ success: true, user: { id: user.id, username: user.username, role: user.role, totpSecret: user.totpSecret } });
        } else {
            res.status(401).json({ success: false, error: 'Invalid password' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: 'Login error' });
    }
});

// --- Profiles ---

app.get('/api/profile/:userId', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT data FROM profiles WHERE userId = ?', [req.params.userId]);
        if (rows.length === 0) return res.json(null);
        res.json(JSON.parse(rows[0].data)); // The data is already an encrypted string in the DB
    } catch (err) {
        res.status(500).json({ error: 'Fetch profile error' });
    }
});

app.post('/api/profile', async (req, res) => {
    const { userId, data } = req.body;
    try {
        await pool.query(
            'INSERT INTO profiles (userId, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?',
            [userId, JSON.stringify(data), JSON.stringify(data)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Save profile error' });
    }
});

// --- Recommendations ---

app.get('/api/recommendations', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM recommendations ORDER BY createdAt DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Fetch recs error' });
    }
});

app.post('/api/recommendations', async (req, res) => {
    const recs = req.body; // Array of recs
    try {
        for (const rec of recs) {
            await pool.query(
                `INSERT INTO recommendations 
                (id, userId, dishId, dishName, dishCategory, dishCalories, dishDescription, dishAllergens, status, aiReasoning, createdAt) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [rec.id, rec.userId, rec.dishId, rec.dishName, rec.dishCategory, rec.dishCalories, rec.dishDescription, JSON.stringify(rec.dishAllergens), rec.status, rec.aiReasoning]
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Save recs error' });
    }
});

app.put('/api/recommendations/:id', async (req, res) => {
    const { status, comment, nutritionistId } = req.body;
    try {
        let query = '';
        let params = [];

        if (status === 'accepted' || status === 'rejected_user') {
            // Action du consommateur
            query = 'UPDATE recommendations SET status = ?, finalizedAt = NOW() WHERE id = ?';
            params = [status, req.params.id];
        } else {
            // Action du nutritionniste
            query = 'UPDATE recommendations SET status = ?, nutritionistComment = ?, nutritionistId = ?, validatedAt = NOW() WHERE id = ?';
            params = [status, comment, nutritionistId, req.params.id];
        }

        await pool.query(query, params);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update rec error' });
    }
});

// --- Audit Logs ---

app.get('/api/logs', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Fetch logs error' });
    }
});

app.post('/api/logs', async (req, res) => {
    const { userId, action, resourceId, signature } = req.body;
    try {
        await pool.query(
            'INSERT INTO audit_logs (timestamp, userId, action, resourceId, signature) VALUES (NOW(), ?, ?, ?, ?)',
            [userId, action, resourceId, signature]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Save log error' });
    }
});

// --- AI Agent Intelligence (Gemini) ---

const genAI = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_FREE_KEY_HERE' 
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) 
    : null;

app.post('/api/ai/generate', async (req, res) => {
    const { profile } = req.body;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (global.systemLog) {
        global.systemLog(`Demande de génération IA reçue pour l'utilisateur.`, 'info');
        global.systemLog(`Utilisation clef OpenRouter : ${!!openRouterKey}`, openRouterKey ? 'success' : 'error');
    }

    // 1. Priorité à OpenRouter si configuré
    if (openRouterKey && openRouterKey !== 'YOUR_OPENROUTER_KEY_HERE') {
        try {
            if (global.systemLog) global.systemLog(`Envoi de la requête à OpenRouter...`, 'info');
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${openRouterKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8080",
                    "X-Title": "NutriApp Secure"
                },
                body: JSON.stringify({
                    "model": "openai/gpt-oss-120b",
                    "messages": [
                        {
                            "role": "system",
                            "content": `Tu es NutriAI. Basé sur TOUT ce profil : ${JSON.stringify(profile)}, génère 3 repas adaptés. 
                            IMPORTANT : Exploite les champs Profession, Ville, Symptômes, IMC dans ton explication.
                            Réponds UNIQUEMENT en JSON : { "meals": [ { "name": "...", "category": "...", "calories": 0, "description": "...", "allergens": [], "aiReasoning": "Pourquoi pour ce profil spécifique (Mentionne métier/symptômes) ?" } ] }`
                        },
                        {
                            "role": "user",
                            "content": `Profil: ${JSON.stringify(profile)}`
                        }
                    ]
                })
            });

            if (global.systemLog) global.systemLog(`Réponse OpenRouter reçue (Status: ${response.status})`, response.ok ? 'success' : 'error');

            if (!response.ok) {
                const errorBody = await response.text();
                if (global.systemLog) global.systemLog(`Détails erreur OpenRouter : ${errorBody}`, 'error');
                throw new Error(`OpenRouter HTTP ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const jsonData = JSON.parse(jsonMatch ? jsonMatch[0] : content);
            return res.json({ success: true, isMock: false, meals: jsonData.meals, provider: 'GPT-OSS (OpenAI)' });
        } catch (err) {
            console.error('OpenRouter Error:', err);
        }
    }

    // 2. Repli vers Gemini Direct si configuré
    if (genAI) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Tu es NutriAI. Basé sur : ${JSON.stringify(profile)}, génère 3 plats adaptés. 
            Réponds UNIQUEMENT en JSON : { "meals": [ { "name": "...", "category": "...", "calories": 0, "description": "...", "allergens": [], "aiReasoning": "Analyse personnalisée (métier/symptômes/IMC)" } ] }`;
            const result = await model.generateContent(prompt);
            const jsonData = JSON.parse(result.response.text().match(/\{[\s\S]*\}/)[0]);
            return res.json({ success: true, isMock: false, meals: jsonData.meals, provider: 'Gemini' });
        } catch (err) {
            console.error('Gemini Error:', err);
        }
    }

    // 3. Fallback Mock de secours
    res.json({
        success: true,
        isMock: true,
        meals: [
            {
                name: "Salade de l'Agent intelligent (Mock)",
                category: "Légumes",
                calories: 250,
                description: "Veuillez configurer une clef OpenRouter ou Gemini dans le fichier backend/.env pour activer l'IA réelle.",
                allergens: []
            }
        ]
    });
});

const PORT = process.env.PORT || 3000;
initDB().then(() => {
    app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
});
