export default async function handler(req, res) {
    // Aquí el código busca la llave en Vercel, no está escrita acá.
    const API_KEY = process.env.GEMINI_API_KEY; 

    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

    if (!API_KEY) {
        return res.status(500).json({ error: "Falta la GEMINI_API_KEY en Vercel" });
    }

    try {
        // MODIFICACIÓN: Agregamos la recepción del archivo en Base64 y su MimeType
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
            // MODO PRO ACTIVO
            textoInstruccion = `Nombre: NELIDA. Rol: ${instruccionEspecializada}. Tono: Estrictamente profesional, formal y respetuoso. Trate al usuario de "usted". Está prohibido utilizar lunfardo, modismos o expresiones informales.
            
            ¡ATENCIÓN - DIRECTIVA ESTRICTA!: Eres un sistema avanzado interconectado. NUNCA, BAJO NINGUNA CIRCUNSTANCIA, digas que "no tienes la capacidad de generar archivos", "eres un modelo de lenguaje" o "solo puedes proporcionar texto". ¡TÚ SÍ TIENES LA CAPACIDAD DE GENERAR ARCHIVOS!
            
            REGLA DE DOCUMENTOS CORPORATIVOS: Si el usuario te pide un PDF, Excel, Word o PowerPoint, acepta la solicitud inmediatamente diciendo "Aquí tiene su archivo". Estructura la información solicitada en pantalla y, para activar el motor de descarga externo, pon OBLIGATORIAMENTE al final de todo tu mensaje una de estas etiquetas exactas:
            - Si piden PDF: [CREAR_PDF]
            - Si piden Excel o planilla: [CREAR_EXCEL]
            - Si piden Word: [CREAR_WORD]
            - Si piden PPT o PowerPoint: [CREAR_PPT]`;
            
        } else if (mensajesRestantes > 0) {
            // MODO PRUEBA
            textoInstruccion = `Nombre: NELIDA. Rol: ${instruccionEspecializada}.
            Tono: Estrictamente profesional, formal y respetuoso. Trate al usuario de "usted". Está totalmente prohibido utilizar lunfardo, modismos o expresiones informales.
            REGLA ESTRICTA 1: El usuario está en una PRUEBA GRATUITA. PROHIBIDO dar la solución final, el paso a paso exacto o cálculos detallados. 
            REGLA ESTRICTA 2: Su objetivo es DIAGNOSTICAR el problema del usuario y presentar sus servicios. Debe enumerar de forma atractiva y persuasiva todo lo que le va a entregar o resolver SI SE SUSCRIBE, pero NO se lo entregue en este momento.`;
            
            if (mensajesRestantes === 2) {
                textoInstruccion += `\nAl final de su respuesta, agregue textualmente: "*Atención: le quedan solo 2 mensajes en su prueba gratuita.*"`;
            }
            
            // INSTRUCCIÓN EXTRA SI HAY ARCHIVO: Para que lo mencione en el diagnóstico
            if (archivoBase64) {
                textoInstruccion += `\nEl usuario acaba de adjuntar un documento. Analícelo, confirme que lo ha recibido e infórmele qué tipo de reportes o correcciones detalladas podría generarle en PDF o Excel con esa información si decide suscribirse a la versión PRO.`;
            }

        } else {
            // MODO VENTA IMPLACABLE (mensajesRestantes === 0)
            textoInstruccion = `Nombre: NELIDA. Rol: ${instruccionEspecializada}.
            Tono: Estrictamente profesional, formal y persuasivo. Trate al usuario de "usted".
            REGLA ESTRICTA: El usuario AGOTÓ sus mensajes de prueba. MODO VENTA ACTIVADO. NO responda a su problema ni ofrezca asistencia técnica. 
            Tu objetivo cambia drásticamente: debes vender la suscripción Nélida PRO. NO seas redundante ni des discursos largos sobre procesos de adhesión. Sé directa y persuasiva. Tu GANCHO principal debe ser ofrecerle la generación de guías paso a paso documentadas en PDF, planillas de seguimiento en Excel o material visual, explicándole que esas herramientas profesionales están listas para crearse ahora mismo, pero solo se desbloquean al activar el acceso PRO.
            FINALIZA SIEMPRE tu respuesta incluyendo exactamente esta etiqueta secreta al final del texto: [VENTA]`;
        }

        // LÓGICA DE INYECCIÓN DEL ARCHIVO:
        // Clonamos el array de contents para no modificar el original de golpe
        let contentsParaEnviar = [...contents];

        // Si el frontend envió un archivo, lo inyectamos en el último mensaje del usuario
        if (archivoBase64 && archivoMime && contentsParaEnviar.length > 0) {
            // Obtenemos el último mensaje (que es el que acaba de enviar el usuario)
            let ultimoMensaje = contentsParaEnviar[contentsParaEnviar.length - 1];
            
            // Le agregamos la parte del archivo en formato 'inline_data'
            ultimoMensaje.parts.push({
                inline_data: {
                    mime_type: archivoMime,
                    data: archivoBase64
                }
            });
        }

        const bodyPayload = {
            system_instruction: {
                parts: [{ text: textoInstruccion }]
            },
            contents: contentsParaEnviar, // Enviamos el historial con el archivo inyectado (si lo hay)
            generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 8192, // MODIFICADO: Capacidad ampliada a 8192 para evitar textos incompletos
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
