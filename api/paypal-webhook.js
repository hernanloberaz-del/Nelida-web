// PayPal llama a esta dirección cuando una suscripción cambia (se activa, se renueva,
// se suspende por falta de pago o se cancela).
// SEGURIDAD: no le creemos al aviso; con el número de suscripción le preguntamos a PayPal
// (con nuestras credenciales) cuál es el estado real.
import { credencialesListas, sincronizarSuscripcion } from './_paypal.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).json({ ok: true });
    if (!credencialesListas()) return res.status(503).json({ error: 'PayPal no configurado' });

    const evento = req.body || {};
    const tipo = String(evento.event_type || '');
    const recurso = evento.resource || {};

    let idSuscripcion = null;
    if (tipo.startsWith('BILLING.SUBSCRIPTION.')) idSuscripcion = recurso.id;
    else if (tipo.startsWith('PAYMENT.SALE.')) idSuscripcion = recurso.billing_agreement_id;

    if (!idSuscripcion) return res.status(200).json({ ok: true, ignorado: true });

    try {
        const resultado = await sincronizarSuscripcion(String(idSuscripcion));
        return res.status(200).json({ ok: true, resultado });
    } catch (err) {
        console.error('Error en /api/paypal-webhook:', err);
        // 500 = PayPal vuelve a intentar más tarde
        return res.status(500).json({ ok: false });
    }
}
