export default async function handler(req, res) {
    // Aquí el código busca la llave en Vercel, no está escrita acá.
    const API_KEY = process.env.GEMINI_API_KEY; 

    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

    if (!API_KEY) {
        return res.status(500).json({ error: "Falta la GEMINI_API_KEY en Vercel" });
    }

    try {
        // MODIFICACIÓN 1: Agregamos "mensajesRestantes" a la recepción de datos
        const { contents, especialidad, mensajesRestantes } = req.body;

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
            "contratista": "NELIDA CONTRATISTA. Mantenimiento industrial y techos.",
            "Economia": "NELIDA ECONOMISTA. ARCA e impuestos."
        };

        const instruccionEspecializada = roles[especialidad] || "NELIDA. Asistente profesional.";

        // MODIFICACIÓN 2: Lógica del embudo de ventas con tono estrictamente formal y respetuoso
        let textoInstruccion = "";

        if (mensajesRestantes === undefined) {
            // SEGURO DE VIDA: Si no se manda el contador, funciona normal.
            textoInstruccion = `Nombre: NELIDA. Rol: ${instruccionEspecializada}. Tono: Estrictamente profesional, formal y respetuoso. Trate al usuario de "usted". Está prohibido utilizar lunfardo, modismos o expresiones informales.`;
        } else if (mensajesRestantes > 0) {
            // MODO DIAGNÓSTICO
            textoInstruccion = `Nombre: NELIDA. Rol: ${instruccionEspecializada}.
            Tono: Estrictamente profesional, formal y respetuoso. Trate al usuario de "usted". Está totalmente prohibido utilizar lunfardo, modismos o expresiones informales.
            REGLA ESTRICTA 1: El usuario está en una PRUEBA GRATUITA. PROHIBIDO dar la solución final, el paso a paso exacto o cálculos detallados. 
            REGLA ESTRICTA 2: Su objetivo es DIAGNOSTICAR el problema del usuario y presentar sus servicios. Debe enumerar de forma atractiva y persuasiva todo lo que le va a entregar o resolver SI SE SUSCRIBE, pero NO se lo entregue en este momento.`;
            
            // MODIFICACIÓN 3: Solo avisa cuando le quedan exactamente 2 mensajes (en tono formal)
            if (mensajesRestantes === 2) {
                textoInstruccion += `\nAl final de su respuesta, agregue textualmente: "*Atención: le quedan solo 2 mensajes en su prueba gratuita.*"`;
            }
        } else {
            // MODO VENTA (0 Mensajes)
            textoInstruccion = `Nombre: NELIDA. Rol: ${instruccionEspecializada}.
            Tono: Estrictamente profesional, formal y respetuoso. Trate al usuario de "usted". Está totalmente prohibido utilizar lunfardo, modismos o expresiones informales.
            REGLA ESTRICTA: El usuario AGOTÓ sus mensajes de prueba. MODO VENTA ACTIVADO. NO responda a su problema ni ofrezca asistencia técnica. 
            Infórmele de manera persuasiva y muy profesional que la prueba de cortesía ha finalizado y que debe suscribirse a Nélida PRO para obtener la solución exacta. Convéncalo de que la suscripción es la mejor inversión para resolver su situación de forma segura.`;
        }

        const bodyPayload = {
            system_instruction: {
                parts: [{ text: textoInstruccion }]
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
