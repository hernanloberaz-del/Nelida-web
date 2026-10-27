// Mercado Pago llama a esta dirección cada vez que una suscripción cambia
// (se aprueba, se pausa o se cancela).
// SEGURIDAD: no le creemos al aviso. Con el número de suscripción, le preguntamos
// directamente a Mercado Pago (con nuestra llave) cuál es el estado real.
import { db } from './_firebase.js';

export default async function handler(req, res) {
    const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!MP_TOKEN) return res.status(500).json({ error: 'Falta MP_ACCESS_TOKEN' });

    const cuerpo = req.body || {};
    const q = req.query || {};
    const tipo = String(cuerpo.type || cuerpo.topic || q.type || q.topic || '');
    const id = (cuerpo.data && cuerpo.data.id) || q['data.id'] || q.id;

    // Solo nos interesan los avisos de suscripciones
    if (!id || !tipo.includes('preapproval')) {
        return res.status(200).json({ ok: true, ignorado: true });
    }

    try {
        const r = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(id)}`, {
            headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
        });
        if (!r.ok) {
            console.error('No se pudo consultar la suscripción', id, r.status);
            return res.status(200).json({ ok: false });
        }
        const sus = await r.json();
        const uid = sus.external_reference;
        if (!uid) return res.status(200).json({ ok: true, sinUsuario: true });

        const ref = db.collection('usuarios').doc(uid);
        const ficha = await ref.get();
        if (!ficha.exists) return res.status(200).json({ ok: true, usuarioInexistente: true });

        const actual = ficha.data().suscripcion || {};
        const estado = sus.status; // authorized | pending | paused | cancelled
        const cambios = {
            suscripcion: {
                proveedor: 'mercadopago',
                id: sus.id,
                estado,
                actualizado: new Date().toISOString()
            }
        };

        if (estado === 'authorized') {
            cambios.plan = 'PRO';
        } else if ((estado === 'cancelled' || estado === 'paused') && (!actual.id || actual.id === sus.id)) {
            // Solo lo bajamos a FREE si es la suscripción que tiene activa
            cambios.plan = 'FREE';
        } else if (estado === 'pending' && actual.id && actual.id !== sus.id) {
            // Un enlace viejo sin pagar no debe pisar una suscripción activa
            return res.status(200).json({ ok: true, ignorado: true });
        }

        await ref.set(cambios, { merge: true });
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('Error en /api/mp-webhook:', err);
        // Respondemos 500 para que Mercado Pago vuelva a intentar más tarde
        return res.status(500).json({ ok: false });
    }
}
