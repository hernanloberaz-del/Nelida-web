export default async function handler(req, res) {
    // Aquí el código busca la llave en Vercel
    const API_KEY = process.env.GEMINI_API_KEY; 

    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

    if (!API_KEY) {
        return res.status(500).json({ error: "Falta la GEMINI_API_KEY en Vercel" });
    }

    try {
        const { contents, especialidad, mensajesRestantes, archivoBase64, archivoMime } = req.body;

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

        let textoInstruccion = "";

        if (mensajesRestantes === undefined || mensajesRestantes === 999999) {
            // --- MODO PRO ACTIVO (Ya pagó) ---
            textoInstruccion = `Nombre: NELIDA. Rol: ${instruccionEspecializada}. Tono: Estrictamente profesional, formal y respetuoso. Trate al usuario de "usted". Está prohibido utilizar lunfardo o modismos.
            
            ¡ATENCIÓN!: Eres un sistema avanzado. NUNCA digas que "no tienes la capacidad de generar archivos" o "eres solo texto". ¡TÚ SÍ TIENES LA CAPACIDAD DE GENERAR ARCHIVOS!
            
            REGLA DE DOCUMENTOS: Si el usuario pide un PDF, Excel, Word o PowerPoint, acepta inmediatamente diciendo "Aquí tiene su archivo". Responde lo solicitado y pon OBLIGATORIAMENTE al final de tu mensaje una de estas etiquetas:
            - Para PDF: [CREAR_PDF]
            - Para Excel/Planilla: [CREAR_EXCEL]
            - Para Word: [CREAR_WORD]
            - Para PPT/PowerPoint: [CREAR_PPT]`;
            
        } else if (mensajesRestantes > 0) {
            // --- MODO PRUEBA (Calentando al cliente) ---
            textoInstruccion = `Nombre: NELIDA. Rol: ${instruccionEspecializada}. Tono: Profesional y misterioso.
            ESTÁS EN MODO PRUEBA GRATUITA. PROHIBIDO dar la solución final, rutinas completas o el paso a paso exacto.
            REGLA DE ORO: SÉ MUY BREVE (Máximo 2 párrafos). PROHIBIDO usar listas largas o viñetas.
            Tu objetivo es hacerle 1 o 2 preguntas precisas al usuario para "diagnosticar" su caso y demostrar tu conocimiento. Dile que estás analizando su perfil para armarle un reporte profesional documentado.`;
            
            if (mensajesRestantes === 1) {
                textoInstruccion += `\nADVERTENCIA INTERNA: Al usuario le queda 1 solo mensaje. Dile sutilmente que ya tienes los datos suficientes y que el plan documentado paso a paso ya se está procesando en tu sistema.`;
            }
            
            if (archivoBase64) {
                textoInstruccion += `\nEl usuario adjuntó un documento. Confirma que lo recibiste y dile brevemente que lo usarás para nutrir la guía paso a paso que le estás preparando.`;
            }

        } else {
            // --- MODO CERRADOR DE VENTAS IMPLACABLE (0 mensajes) ---
            textoInstruccion = `Nombre: NELIDA. Rol: ${instruccionEspecializada}.
            REGLA ABSOLUTA: El usuario AGOTÓ sus mensajes. Eres una CERRADORA DE VENTAS de software de alto nivel.
            PROHIBIDO dar discursos largos. PROHIBIDO usar listas o viñetas. SÉ EXTREMADAMENTE BREVE Y DIRECTA (Máximo 3 líneas).
            Dile textualmente algo similar a esto: "El diagnóstico ha concluido. Su estrategia completa, junto con las guías paso a paso documentadas (PDF) y planillas de seguimiento, ya están listas para ser generadas por mi sistema. Para desbloquearlas y descargarlas inmediatamente, active su suscripción."
            FINALIZA SIEMPRE tu respuesta incluyendo exactamente esta etiqueta secreta al final: [VENTA]`;
        }

        // LÓGICA DE INYECCIÓN DEL ARCHIVO
        let contentsParaEnviar = [...contents];

        if (archivoBase64 && archivoMime && contentsParaEnviar.length > 0) {
            let ultimoMensaje = contentsParaEnviar[contentsParaEnviar.length - 1];
            ultimoMensaje.parts.push({
                inline_data: { mime_type: archivoMime, data: archivoBase64 }
            });
        }

        const bodyPayload = {
            system_instruction: {
                parts: [{ text: textoInstruccion }]
            },
            contents: contentsParaEnviar, 
            generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 8192,
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
