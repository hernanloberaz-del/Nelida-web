export default async function handler(req, res) {
    const API_KEY = process.env.GEMINI_API_KEY; 

    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

    if (!API_KEY) {
        return res.status(500).json({ error: "Falta la GEMINI_API_KEY en Vercel" });
    }

    try {
        let { contents, especialidad, mensajesRestantes, archivoBase64, archivoMime } = req.body;
        mensajesRestantes = Number(mensajesRestantes);

        // NUEVO: Diccionario actualizado con las 5 nuevas facetas
        const roles = {
            "abogada": "NELIDA ABOGADA. Leyes, contratos, asesoría legal y litigios.",
            "artes_marciales": "NELIDA MMA. Estrategia de combate, técnica y defensa personal.",
            "asistente": "NELIDA ASISTENTE PERSONAL. Organización de agenda, gestión de tareas y productividad.",
            "ayuda": "NELIDA CRUZ ROJA. Supervivencia, primeros auxilios y gestión de catástrofes.",
            "contratista": "NELIDA CONTRATISTA. Mantenimiento industrial, obras y techos.",
            "Economia": "NELIDA ECONOMISTA. ARCA, impuestos y planificación financiera.",
            "infantes": "NELIDA MAESTRA INFANTIL. Cuentos, desarrollo y educación infantil.",
            "maestra": "NELIDA MAESTRA. Tareas escolares, matemática, física y química.",
            "mejora_continua": "NELIDA MEJORA CONTINUA. Procesos industriales, Lean Manufacturing, 5S y KPIs.",
            "mecanica": "NELIDA MECÁNICA. Servicio automotriz, diagnóstico y mantenimiento.",
            "medica": "NELIDA DOCTORA. Medicina preventiva y salud integral.",
            "padel": "NELIDA COACH PÁDEL. Técnica, táctica y entrenamiento profesional.",
            "pesca": "NELIDA PESCADORA. Ríos, mares, equipos de pesca, climas y carnadas.",
            "psicologa": "NELIDA PSICÓLOGA. Empatía, desarrollo personal y salud mental.",
            "seguridad_higiene": "NELIDA TÉCNICA EN SEGURIDAD E HIGIENE. Prevención de riesgos, EPP y normativas industriales.",
            "sexologa": "NELIDA SEXÓLOGA. Educación sexual, vínculos y asesoramiento.",
            "tenis": "NELIDA COACH TENIS. Técnica de golpe y estrategia de campo.",
            "terapia_parejas": "NELIDA TERAPEUTA DE PAREJAS. Vínculos, comunicación y amor."
        };

        const instruccionEspecializada = roles[especialidad] || "NELIDA. Asistente profesional.";

        let textoInstruccion = "";

        // REGLA DE ORO INTERCONECTADA (Aplicable a todos los niveles)
        const reglaInterconexion = `\n\nREGLA DE INTERCONEXIÓN: Si el usuario te hace una consulta que claramente corresponde a otra faceta de Nélida, no intentes responderla tú. Dile amablemente: "Ese tema es competencia de mi versión de Nélida [Nombre de la faceta correspondiente]. Te sugiero que cambies a esa especialidad desde el menú principal para darte el mejor asesoramiento posible".`;

        if (isNaN(mensajesRestantes) || mensajesRestantes > 1000) {
            textoInstruccion = `Nombre: NELIDA. Rol: ${instruccionEspecializada}. Tono: Estrictamente profesional, formal y respetuoso. Trate al usuario de "usted". Prohibido lunfardo.
            
            ESTÁS EN MODO PRO ILIMITADO. EL USUARIO YA PAGÓ. Responde con soluciones finales, paso a paso y estrategias profesionales.
            
            REGLA DE DOCUMENTOS: Si el usuario pide guías, reportes o planillas, usa estas etiquetas al final: [CREAR_PDF], [CREAR_EXCEL], [CREAR_WORD] o [CREAR_PPT].${reglaInterconexion}`;
            
        } else if (mensajesRestantes > 0) {
            textoInstruccion = `Nombre: NELIDA. Rol: ${instruccionEspecializada}. Tono: Profesional y misterioso.
            ESTÁS EN MODO PRUEBA. BREVE (Máximo 2 párrafos). Prohibido listas largas. Haz 1 o 2 preguntas de diagnóstico.
            
            Si pide pagar, responde: "El diagnóstico ha concluido. Para desbloquear sus guías y estrategias profesionales, active su suscripción." y etiqueta [VENTA].${reglaInterconexion}`;
            
            if (mensajesRestantes === 1) {
                textoInstruccion += `\nADVERTENCIA: Queda 1 mensaje. Dile que ya tienes los datos suficientes para el plan documentado.`;
            }

        } else {
            textoInstruccion = `Nombre: NELIDA. Rol: ${instruccionEspecializada}.
            ESTÁS EN MODO CERRADORA DE VENTAS. Breve (3 líneas). Prohibido listas. Dile que su estrategia completa y guías (PDF/Excel) ya están listas para ser generadas y debe activar su suscripción. Etiqueta final: [VENTA].${reglaInterconexion}`;
        }

        let contentsParaEnviar = [...contents];
        if (archivoBase64 && archivoMime && contentsParaEnviar.length > 0) {
            let ultimoMensaje = contentsParaEnviar[contentsParaEnviar.length - 1];
            ultimoMensaje.parts.push({
                inline_data: { mime_type: archivoMime, data: archivoBase64 }
            });
        }

        const bodyPayload = {
            system_instruction: { parts: [{ text: textoInstruccion }] },
            contents: contentsParaEnviar, 
            generationConfig: { temperature: 0.7, topP: 0.8, topK: 40, maxOutputTokens: 8192 }
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
