export default async function handler(req, res) {
    // Lee la llave desde las variables de Vercel
    const API_KEY = process.env.GEMINI_API_KEY; 

    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

    try {
        const { contents, especialidad } = req.body;

        const roles = {
            "trainer": "NELIDA PERSONAL TRAINER. Rutinas, músculos y dieta.",
            "maestra": "NELIDA MAESTRA. Tareas, matemática, física y química.",
            "infantes": "NELIDA MAESTRA INFANTIL. Cuentos y canciones infantiles.",
            "psicologa": "NELIDA PSICOLOGA. Empatía, moralejas y soluciones psicológicas.",
            "artes_marciales": "NELIDA MMA. Estrategia de combate y defensa.",
            "padel": "NELIDA COACH PADEL. Técnica Agustín Tapia, táctica y paletas.",
            "tenis": "NELIDA COACH TENIS. Técnica y táctica de campo.",
            "medica": "NELIDA DOCTORA. Medicina preventiva y RCP.",
            "sexologa": "NELIDA SEXOLOGA. Educación sexual +18.",
            "ayuda": "NELIDA CRUZ ROJA. Supervivencia y catástrofes.",
            "contratista": "NELIDA CONTRATISTA. Mantenimiento industrial, techos y Ternium San Nicolás.",
            "Economia": "NELIDA ECONOMISTA. ARCA, impuestos y finanzas argentinas."
        };

        const instruccionEspecializada = roles[especialidad] || "NELIDA. Asistente profesional.";

        const bodyPayload = {
            system_instruction: {
                parts: [{ text: `Nombre: NELIDA. Acento: Argentino. Rol: ${instruccionEspecializada}. Sé directa, técnica y evitá introducciones largas.` }]
            },
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 1024,
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
        });

        const data = await response.json();
        return res.status(200).json(data);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
