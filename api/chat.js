import admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "nelida-e89d3",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { message, contents, especialidad } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `Sos Nélida, una asistente virtual clara y directa. Tu especialidad es ${especialidad || 'asistente general'}.`
    });

    // Usamos el historial acumulado para que tenga memoria
    const result = await model.generateContent({
        contents: contents
    });

    const respuestaFinal = result.response.text();
    return res.status(200).json({ respuesta: respuestaFinal });

  } catch (error) {
    console.error("Error en el servidor:", error);
    return res.status(500).json({ error: error.message });
  }
}
