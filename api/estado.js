// Le dice al chat si el usuario es PRO y cuántos mensajes gratis le quedan.
import { db, verificarUsuario, calcularEstado } from './_firebase.js';

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');

    const usuario = await verificarUsuario(req);
    if (!usuario) return res.status(401).json({ error: 'Tenés que iniciar sesión.' });

    try {
        const ficha = await db.collection('usuarios').doc(usuario.uid).get();
        const estado = calcularEstado(ficha.exists ? ficha.data() : {});
        return res.status(200).json({
            plan: estado.esPro ? 'PRO' : 'FREE',
            mensajesRestantes: estado.restantes
        });
    } catch (err) {
        console.error('Error en /api/estado:', err);
        return res.status(500).json({ error: 'No se pudo leer tu cuenta.' });
    }
}
