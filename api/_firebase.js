// Conexión segura del servidor con Firebase.
// Usa las llaves guardadas en Vercel (FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY).
// Este archivo empieza con "_" para que Vercel NO lo publique como dirección.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const MENSAJES_GRATIS = 10;

function iniciar() {
    if (getApps().length) return;
    let clave = process.env.FIREBASE_PRIVATE_KEY || '';
    // La clave puede venir con comillas o con "\n" escritos como texto
    clave = clave.trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n');
    initializeApp({
        credential: cert({
            projectId: 'nelida-e89d3',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: clave
        })
    });
}

iniciar();

export const db = getFirestore();

// Devuelve el usuario que hace el pedido, o null si no inició sesión.
export async function verificarUsuario(req) {
    const encabezado = req.headers.authorization || '';
    const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : null;
    if (!token) return null;
    try {
        return await getAuth().verifyIdToken(token);
    } catch (e) {
        return null;
    }
}

// Lee la ficha del usuario y calcula su estado real (solo el servidor decide esto).
export function calcularEstado(datos) {
    const d = datos || {};
    const esPro = d.plan === 'PRO';
    const usados = Number(d.mensajesUsados) || 0;
    const restantes = esPro ? null : Math.max(0, MENSAJES_GRATIS - usados);
    return { esPro, usados, restantes };
}
