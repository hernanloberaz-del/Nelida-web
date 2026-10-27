// Conexión segura del servidor con Firebase.
// Usa la llave guardada en Vercel. Preferimos FIREBASE_SERVICE_ACCOUNT (el archivo .json entero).
// Si no existe, usa FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
// Este archivo empieza con "_" para que Vercel NO lo publique como dirección.
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createPrivateKey } from 'crypto';

export const MENSAJES_GRATIS = 10;
let errorDeLlave = null;

function limpiarClave(clave) {
    return String(clave || '').trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n');
}

function leerCredenciales() {
    const jsonEntero = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (jsonEntero && jsonEntero.trim()) {
        let cuenta;
        try {
            cuenta = JSON.parse(jsonEntero);
        } catch (e) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT no es un .json válido (¿se copió entero, desde la primera { hasta la última }?)');
        }
        return {
            projectId: cuenta.project_id || 'nelida-e89d3',
            clientEmail: cuenta.client_email,
            privateKey: limpiarClave(cuenta.private_key),
            origen: 'FIREBASE_SERVICE_ACCOUNT'
        };
    }
    return {
        projectId: 'nelida-e89d3',
        clientEmail: (process.env.FIREBASE_CLIENT_EMAIL || '').trim().replace(/^"|"$/g, ''),
        privateKey: limpiarClave(process.env.FIREBASE_PRIVATE_KEY),
        origen: 'FIREBASE_PRIVATE_KEY'
    };
}

function iniciar() {
    if (getApps().length) return;
    try {
        const c = leerCredenciales();
        if (!c.clientEmail) throw new Error('Falta el client_email de Firebase (' + c.origen + ')');
        // Comprobamos que la llave esté bien copiada antes de usarla
        try { createPrivateKey(c.privateKey); }
        catch (e) { throw new Error('La llave privada de Firebase está mal copiada (' + c.origen + ')'); }
        initializeApp({ credential: cert({ projectId: c.projectId, clientEmail: c.clientEmail, privateKey: c.privateKey }) });
    } catch (e) {
        errorDeLlave = e.message;
        initializeApp({ projectId: 'nelida-e89d3' }); // permite seguir verificando sesiones
    }
}

iniciar();

export const db = getFirestore();

// Prueba la llave pidiendo un permiso a Google. Devuelve el motivo exacto si falla.
export async function probarLlave() {
    if (errorDeLlave) return errorDeLlave;
    try {
        await getApp().options.credential.getAccessToken();
        return null;
    } catch (e) {
        return 'Google rechazó la llave de Firebase: ' + (e.message || e);
    }
}

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
