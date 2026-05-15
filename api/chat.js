import admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

// 2. Inicializar Gemini
// Asegurate de tener tu variable GEMINI_API_KEY en Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 3. Función principal de Vercel
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'El mensaje está vacío' });
        }

        // Llamamos a Gemini (Nelida)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: "Sos Nelida, una asistente virtual clara y directa."
        });

        const result = await model.generateContent(message);
        const nelidaResponse = result.response.text();

        // Le devolvemos la respuesta al HTML
        return res.status(200).json({ respuesta: nelidaResponse });

    } catch (error) {
        console.error('Error de Gemini:', error);
        return res.status(500).json({ error: 'Error al procesar el mensaje con Nelida' });
    }
}
