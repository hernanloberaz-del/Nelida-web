import admin from 'firebase-admin';
import OpenAI from 'openai';

// 1. Inicializar Firebase
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

// 2. Inicializar OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// 3. Función principal de Vercel
export default async function handler(req, res) {
    // Solo permitimos peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        // Agarramos el mensaje que mandás desde el HTML
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'El mensaje está vacío' });
        }

        // Llamamos a OpenAI (Nelida)
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", 
            messages: [
                { role: "system", content: "Sos Nelida, una asistente virtual clara y directa." },
                { role: "user", content: message }
            ],
        });

        // Extraemos la respuesta
        const nelidaResponse = completion.choices[0].message.content;

        // Le devolvemos la respuesta al HTML
        return res.status(200).json({ respuesta: nelidaResponse });

    } catch (error) {
        console.error('Error de OpenAI:', error);
        return res.status(500).json({ error: 'Error al procesar el mensaje con Nelida' });
    }
}
