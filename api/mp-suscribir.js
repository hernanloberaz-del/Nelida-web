// Crea una suscripción de Mercado Pago PERSONAL para el usuario que inició sesión.
// Así, cuando paga, Mercado Pago nos avisa con su "etiqueta" (external_reference = su usuario de Nélida).
import { db, verificarUsuario } from './_firebase.js';

const PRECIO_ARS = Number(process.env.MP_PRECIO_ARS) || 13999;

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

    const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!MP_TOKEN) return res.status(500).json({ error: 'Falta MP_ACCESS_TOKEN en Vercel' });

    const usuario = await verificarUsuario(req);
    if (!usuario) return res.status(401).json({ error: 'Tenés que iniciar sesión.' });

    // El email con el que la persona va a pagar en Mercado Pago (por defecto, el de su cuenta de Nélida)
    const { email } = req.body || {};
    const emailPagador = String(email || usuario.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPagador)) {
        return res.status(400).json({ error: 'Escribí el email de tu cuenta de Mercado Pago.' });
    }

    try {
        // Si ya es PRO, no creamos otra suscripción (evita cobros dobles)
        const ficha = await db.collection('usuarios').doc(usuario.uid).get();
        if (ficha.exists && ficha.data().plan === 'PRO') {
            return res.status(400).json({ error: 'Tu cuenta ya es Nélida PRO. No hace falta suscribirte de nuevo.' });
        }

        const respuesta = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason: 'Nélida PRO - Suscripción mensual',
                external_reference: usuario.uid,
                payer_email: emailPagador,
                auto_recurring: {
                    frequency: 1,
                    frequency_type: 'months',
                    transaction_amount: PRECIO_ARS,
                    currency_id: 'ARS'
                },
                back_url: 'https://nelida.com.ar/interaccion.html',
                status: 'pending'
            })
        });

        const datos = await respuesta.json();
        if (!respuesta.ok || !datos.init_point) {
            console.error('Mercado Pago rechazó la suscripción:', datos);
            return res.status(502).json({ error: 'Mercado Pago no pudo crear la suscripción: ' + (datos.message || 'error desconocido') });
        }

        // Guardamos que está "pendiente" (solo el servidor puede escribir este campo)
        await db.collection('usuarios').doc(usuario.uid).set({
            suscripcion: {
                proveedor: 'mercadopago',
                id: datos.id,
                estado: 'pending',
                actualizado: new Date().toISOString()
            }
        }, { merge: true });

        return res.status(200).json({ url: datos.init_point });
    } catch (err) {
        console.error('Error en /api/mp-suscribir:', err);
        return res.status(500).json({ error: 'No se pudo conectar con Mercado Pago. Probá de nuevo.' });
    }
}
