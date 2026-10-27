// Después de suscribirse con PayPal, la página nos manda el número de suscripción.
// SEGURIDAD: no le creemos al navegador; le preguntamos a PayPal si es real, si está activa
// y si es de este usuario. Recién ahí lo activamos como PRO.
import { verificarUsuario } from './_firebase.js';
import { credencialesListas, sincronizarSuscripcion } from './_paypal.js';

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });
    if (!credencialesListas()) return res.status(503).json({ error: 'PayPal todavía no está configurado.' });

    const usuario = await verificarUsuario(req);
    if (!usuario) return res.status(401).json({ error: 'Tenés que iniciar sesión.' });

    const { subscriptionID } = req.body || {};
    if (!subscriptionID) return res.status(400).json({ error: 'Falta el número de suscripción.' });

    try {
        const resultado = await sincronizarSuscripcion(String(subscriptionID), usuario.uid);
        if (resultado.ignorado) return res.status(400).json({ error: 'No se pudo validar la suscripción (' + resultado.motivo + ').' });
        return res.status(200).json(resultado);
    } catch (err) {
        console.error('Error en /api/paypal-confirmar:', err);
        return res.status(500).json({ error: 'No se pudo confirmar con PayPal. Si ya pagaste, tu PRO se activará en unos minutos.' });
    }
}
