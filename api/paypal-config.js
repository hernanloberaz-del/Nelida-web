// Le da a la página de pago los datos PÚBLICOS de PayPal (Client ID y número de plan).
// El Secret nunca sale del servidor.
import { credencialesListas, obtenerPlanId } from './_paypal.js';

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    if (!credencialesListas()) {
        return res.status(503).json({ error: 'PayPal todavía no está configurado.' });
    }
    try {
        const planId = await obtenerPlanId();
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.status(200).json({ clientId: process.env.PAYPAL_CLIENT_ID.trim(), planId });
    } catch (err) {
        console.error('Error en /api/paypal-config:', err);
        return res.status(500).json({ error: err.message });
    }
}
