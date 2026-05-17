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

        // MODIFICACIÓN 2: Lógica del embudo de ventas y contador
        let textoInstruccion = "";

        if (mensajesRestantes === undefined) {
            // SEGURO DE VIDA: Si no se manda el contador, funciona normal.
            textoInstruccion = `Nombre: NELIDA. Acento: Argentino. Rol: ${instruccionEspecializada}. Sé directa.`;
        } else if (mensajesRestantes > 0) {
            // MODO DIAGNÓSTICO
            textoInstruccion = `Nombre: NELIDA. Acento: Argentino. Rol: ${instruccionEspecializada}.
            REGLA ESTRICTA 1: El usuario está en una PRUEBA GRATUITA. PROHIBIDO dar la solución final, el paso a paso exacto o cálculos detallados. 
            REGLA ESTRICTA 2: Tu objetivo es DIAGNOSTICAR su problema y VENDER tu servicio. Debes enumerar de forma muy atractiva y persuasiva todo lo que le vas a entregar o resolver SI PAGA la suscripción, pero NO se lo entregues ahora. Haz que desee pagarte.`;
            
            // MODIFICACIÓN 3: Solo avisa cuando le quedan exactamente 2 mensajes
            if (mensajesRestantes === 2) {
                textoInstruccion += `\nAl final de tu respuesta, agrega textualmente: "*Atenti: te quedan solo 2 mensajes en tu prueba gratuita.*"`;
            }
        } else {
            // MODO VENTA (0 Mensajes)
            textoInstruccion = `Nombre: NELIDA. Acento: Argentino. Rol: ${instruccionEspecializada}.
            REGLA ESTRICTA: El usuario AGOTÓ sus mensajes. MODO VENTA ACTIVADO. NO respondas a su problema. 
            Dile de forma persuasiva y muy vendedora que la prueba terminó y debe suscribirse a Nélida PRO para obtener la solución exacta. Convéncelo de que pagar es la mejor inversión para resolver su problema.`;
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
