import { db, verificarUsuario, calcularEstado, MENSAJES_GRATIS, probarLlave } from './_firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

// Respuesta armada con el mismo formato que Gemini (para cuando no hace falta llamarlo)
function respuestaFija(texto, estado) {
    return { candidates: [{ content: { parts: [{ text: texto }] } }], nelida: estado };
}

export default async function handler(req, res) {
    const API_KEY = process.env.GEMINI_API_KEY;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

    if (!API_KEY) {
        return res.status(500).json({ error: "Falta la GEMINI_API_KEY en Vercel" });
    }

    // SEGURIDAD 1: solo usuarios con sesión iniciada en Nélida
    const usuario = await verificarUsuario(req);
    if (!usuario) return res.status(401).json({ error: 'Tenés que iniciar sesión.' });

    try {
        let { contents, especialidad, archivoBase64, archivoMime } = req.body || {};

        if (!Array.isArray(contents) || contents.length === 0) {
            return res.status(400).json({ error: 'Mensaje vacío.' });
        }
        // Solo mandamos a Gemini la conversación reciente (evita abusos y costos altos)
        contents = contents.slice(-30);

        // SEGURIDAD 2: el servidor cuenta los mensajes y decide si es PRO (no el navegador)
        const refFicha = db.collection('usuarios').doc(usuario.uid);
        const estadoAntes = await db.runTransaction(async (t) => {
            const ficha = await t.get(refFicha);
            const estado = calcularEstado(ficha.exists ? ficha.data() : {});
            if (estado.esPro || estado.usados < MENSAJES_GRATIS) {
                const nuevosUsados = estado.usados + 1;
                const cambios = { mensajesUsados: FieldValue.increment(1) };
                if (!estado.esPro) cambios.mensajesRestantes = Math.max(0, MENSAJES_GRATIS - nuevosUsados);
                t.set(refFicha, cambios, { merge: true });
            }
            return estado;
        });

        // Ya usó todos los mensajes gratis: respondemos sin gastar Gemini
        if (!estadoAntes.esPro && estadoAntes.usados >= MENSAJES_GRATIS) {
            return res.status(200).json(respuestaFija(
                "Ya usaste tus mensajes de prueba. Tu estrategia completa y tus guías (PDF/Excel) están listas para generarse: activá tu suscripción Nélida PRO para continuar. [VENTA]",
                { plan: 'FREE', mensajesRestantes: 0 }
            ));
        }

        const mensajesRestantes = estadoAntes.esPro ? NaN : MENSAJES_GRATIS - (estadoAntes.usados + 1);
        const estadoNuevo = { plan: estadoAntes.esPro ? 'PRO' : 'FREE', mensajesRestantes: estadoAntes.esPro ? null : mensajesRestantes };

        // Diccionario optimizado con las facetas de Nélida (todo en minúsculas para evitar errores)
        const roles = {
            "abogada": "NELIDA ABOGADA. Leyes, contratos, asesoría legal y litigios.",
            "artes_marciales": "NELIDA MMA. Estrategia de combate, técnica y defensa personal.",
            "asistente": "NELIDA ASISTENTE PERSONAL. Organización de agenda, gestión de tareas y productividad.",
            "ayuda": "NELIDA CRUZ ROJA. Supervivencia, primeros auxilios y gestión de catástrofes.",
            "contratista": "NELIDA CONTRATISTA. Mantenimiento industrial, obras y techos.",
            "economia": "NELIDA ECONOMISTA. ARCA, impuestos y planificación financiera.",
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

        const especialidadLimpia = especialidad ? especialidad.toLowerCase() : "ayuda";
        const instruccionEspecializada = roles[especialidadLimpia] || "NELIDA. Asistente profesional.";

        let textoInstruccion = "";

        // REGLA DE ORO INTERCONECTADA (Aplicable a todos los niveles)
        const reglaInterconexion = `\n\nREGLA DE INTERCONEXIÓN: Si el usuario te hace una consulta que claramente corresponde a otra faceta de Nélida, no intentes responderla tú. Dile amablemente: "Ese tema es competencia de mi versión de Nélida [Nombre de la faceta correspondiente]. Te sugiero que cambies a esa especialidad desde el menú principal para darte el mejor asesoramiento posible".`;

        if (estadoAntes.esPro) {
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

        // URL ACTUALIZADA A LA VERSIÓN 2.5 FLASH
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
        });

        const data = await response.json();

        // Si Gemini falló, devolvemos el mensaje descontado para no perjudicar al usuario
        if (!response.ok || !data.candidates) {
            const devolver = { mensajesUsados: FieldValue.increment(-1) };
            if (!estadoAntes.esPro) devolver.mensajesRestantes = mensajesRestantes + 1;
            await refFicha.set(devolver, { merge: true });
            return res.status(502).json({ error: 'Nélida no pudo responder. Probá de nuevo.' });
        }

        data.nelida = estadoNuevo;
        return res.status(200).json(data);

    } catch (err) {
        console.error('Error en /api/chat:', err);
        const motivo = await probarLlave();
        return res.status(500).json({ error: motivo || err.message });
    }
}
