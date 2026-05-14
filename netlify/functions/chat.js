import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: "extreme-ability-464314-a3",
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY 
                    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
                    : undefined,
            })
        });
    } catch (error) {
        console.error('Error Firebase:', error);
    }
}

const db = admin.firestore();

export default async function handler(req, res) {

    // ─── CORS ────────────────────────────────────────────────────────
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
        const { contents, especialidad, userId } = req.body;

        // ✅ API Key desde variable de entorno (nunca hardcodeada)
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            return res.status(500).json({ error: "API Key no configurada en el servidor." });
        }

        if (!userId) return res.status(400).json({ error: "Falta userId" });

        // ─── Firestore — control de límite diario ────────────────────
        const userRef = db.collection('usuarios').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.exists ? userDoc.data() : { plan: 'gratis', mensajes_hoy: 0 };

        if (userData.plan !== 'pro' && (userData.mensajes_hoy || 0) >= 10) {
            return res.status(200).json({
                isPaywall: true,
                text: "Alcanzaste el límite diario gratuito de Nélida. ¡Pasate al plan Pro para seguir!"
            });
        }

        // ─── Llamada a Gemini ─────────────────────────────────────────
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ 
                            text: `Sos Nélida, una asistente virtual argentina de San Nicolás, experta en ${especialidad}. 
                                   Respondés siempre en español rioplatense, de forma cálida, profesional y empática. 
                                   Nunca rompés el personaje. Tu nombre es Nélida.` 
                        }]
                    },
                    contents: contents
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            console.error("Error Gemini:", data.error);
            return res.status(500).json({ error: data.error.message });
        }

        // ─── Actualizar contador de mensajes en Firestore ─────────────
        if (userData.plan !== 'pro') {
            await userRef.set({
                mensajes_hoy: (userData.mensajes_hoy || 0) + 1,
                ultima_interaccion: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        return res.status(200).json(data);

    } catch (err) {
        console.error("Error crítico:", err);
        return res.status(500).json({ error: "Error de servidor", details: err.message });
    }
}