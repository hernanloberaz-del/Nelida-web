// Herramientas para hablar con PayPal desde el servidor.
// Usa PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET guardadas en Vercel.
// Este archivo empieza con "_" para que Vercel NO lo publique como dirección.
import { db } from './_firebase.js';

const API = process.env.PAYPAL_API || 'https://api-m.paypal.com';
export const PRECIO_USD = process.env.PAYPAL_PRECIO_USD || '9.99';

export function credencialesListas() {
    return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

// Pide a PayPal un permiso temporal para operar
async function tokenPaypal() {
    const id = (process.env.PAYPAL_CLIENT_ID || '').trim();
    const secreto = (process.env.PAYPAL_CLIENT_SECRET || '').trim();
    const r = await fetch(`${API}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${id}:${secreto}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    const d = await r.json();
    if (!r.ok || !d.access_token) throw new Error('PayPal rechazó las credenciales: ' + (d.error_description || d.error || r.status));
    return d.access_token;
}

export async function paypal(ruta, opciones = {}) {
    const token = await tokenPaypal();
    const r = await fetch(`${API}${ruta}`, {
        ...opciones,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(opciones.headers || {})
        }
    });
    const texto = await r.text();
    let datos = {};
    try { datos = texto ? JSON.parse(texto) : {}; } catch (e) { datos = { raw: texto }; }
    return { ok: r.ok, status: r.status, datos };
}

// Devuelve el plan mensual de Nélida PRO en PayPal. Si no existe, lo crea una sola vez
// y lo guarda en Firebase (config/paypal) para reutilizarlo.
export async function obtenerPlanId() {
    if (process.env.PAYPAL_PLAN_ID) return process.env.PAYPAL_PLAN_ID.trim();

    const ref = db.collection('config').doc('paypal');
    const guardado = await ref.get();
    if (guardado.exists && guardado.data().planId) return guardado.data().planId;

    const producto = await paypal('/v1/catalogs/products', {
        method: 'POST',
        body: JSON.stringify({
            name: 'Nélida PRO',
            description: 'Asistente de inteligencia artificial Nélida AI - acceso PRO',
            type: 'SERVICE',
            category: 'SOFTWARE'
        })
    });
    if (!producto.ok) throw new Error('No se pudo crear el producto en PayPal: ' + JSON.stringify(producto.datos).slice(0, 300));

    const plan = await paypal('/v1/billing/plans', {
        method: 'POST',
        body: JSON.stringify({
            product_id: producto.datos.id,
            name: 'Nélida PRO mensual',
            description: 'Suscripción mensual a Nélida PRO',
            status: 'ACTIVE',
            billing_cycles: [{
                frequency: { interval_unit: 'MONTH', interval_count: 1 },
                tenure_type: 'REGULAR',
                sequence: 1,
                total_cycles: 0,
                pricing_scheme: { fixed_price: { value: PRECIO_USD, currency_code: 'USD' } }
            }],
            payment_preferences: {
                auto_bill_outstanding: true,
                payment_failure_threshold: 2
            }
        })
    });
    if (!plan.ok) throw new Error('No se pudo crear el plan en PayPal: ' + JSON.stringify(plan.datos).slice(0, 300));

    await ref.set({ planId: plan.datos.id, productoId: producto.datos.id, precioUSD: PRECIO_USD, creado: new Date().toISOString() });
    return plan.datos.id;
}

// Consulta a PayPal el estado REAL de una suscripción y actualiza la ficha del usuario.
// Devuelve { estado, plan } o lanza error.
export async function sincronizarSuscripcion(idSuscripcion, uidEsperado) {
    const r = await paypal(`/v1/billing/subscriptions/${encodeURIComponent(idSuscripcion)}`);
    if (!r.ok) return { ignorado: true, motivo: 'no existe en PayPal' };
    const sus = r.datos;
    const uid = sus.custom_id;
    if (!uid) return { ignorado: true, motivo: 'sin usuario' };
    if (uidEsperado && uid !== uidEsperado) return { ignorado: true, motivo: 'pertenece a otro usuario' };

    // Solo aceptamos suscripciones a NUESTRO plan
    const planId = await obtenerPlanId();
    if (sus.plan_id !== planId) return { ignorado: true, motivo: 'otro plan' };

    const ref = db.collection('usuarios').doc(uid);
    const ficha = await ref.get();
    if (!ficha.exists) return { ignorado: true, motivo: 'usuario inexistente' };

    const actual = ficha.data().suscripcion || {};
    const estado = sus.status; // APPROVAL_PENDING | APPROVED | ACTIVE | SUSPENDED | CANCELLED | EXPIRED
    const cambios = {
        suscripcion: { proveedor: 'paypal', id: sus.id, estado, actualizado: new Date().toISOString() }
    };

    if (estado === 'ACTIVE') {
        cambios.plan = 'PRO';
    } else if (['SUSPENDED', 'CANCELLED', 'EXPIRED'].includes(estado)) {
        if (actual.id && actual.id !== sus.id) return { ignorado: true, motivo: 'no es la suscripción activa' };
        cambios.plan = 'FREE';
    } else if (actual.id && actual.id !== sus.id && ficha.data().plan === 'PRO') {
        return { ignorado: true, motivo: 'ya tiene otra suscripción activa' };
    }

    await ref.set(cambios, { merge: true });
    return { estado, plan: cambios.plan || ficha.data().plan || 'FREE' };
}
