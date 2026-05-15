import admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicialización de Firebase (con protección para no iniciar dos veces)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "nelida-e89d3",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Esta línea es clave para que lea bien la llave en Vercel
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}

// Inicializamos Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  // Evitamos que bloquee por temas de permisos (CORS)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Recibimos los datos que manda tu interaccion.html
    const { message, contents, especialidad } = req.body;

    // Configuramos a Nélida con su faceta activa
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `Sos Nélida, una asistente virtual. Tu especialidad actual es: ${especialidad || 'ayuda'}. Hablá claro y directo.`
    });

    // Le pasamos el historial completo para que tenga memoria de la charla
    const result = await model.generateContent({
        contents: contents
    });

    const respuestaFinal = result.response.text();

    // Devolvemos la respuesta al chat
    return res.status(200).json({ respuesta: respuestaFinal });

  } catch (error) {
    console.error("Error interno:", error);
    return res.status(500).json({ error: error.message });
  }
}
