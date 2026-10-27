// Recibe los pedidos del "Botón de Baja de Servicio" y del "Botón de Arrepentimiento".
// La ley pide que funcionen SIN iniciar sesión y que se entregue un código de trámite.
// Los pedidos quedan guardados en Firebase (colección "tramites") y el administrador los ve en el panel.
import { db } from './_firebase.js';
import { randomBytes } from 'crypto';

const TIPOS = { baja: 'BAJA', arrepentimiento: 'ARREP' };
const MEDIOS = ['mercadopago', 'paypal', 'nose'];

function limpiar(texto, max) {
    return String(texto || '').replace(/[<>]/g, '').trim().slice(0, max);
}

function generarCodigo(prefijo) {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin letras que se confunden (O/0, I/1)
    const bytes = randomBytes(6);
    let azar = '';
    for (const b of bytes) azar += letras[b % letras.length];
    const hoy = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    const fecha = String(hoy.getDate()).padStart(2, '0') + String(hoy.getMonth() + 1).padStart(2, '0') + String(hoy.getFullYear()).slice(-2);
    return `${prefijo}-${fecha}-${azar}`;
}

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

    const cuerpo = req.body || {};
    const tipo = String(cuerpo.tipo || '');
    if (!TIPOS[tipo]) return res.status(400).json({ error: 'Tipo de trámite inválido.' });

    const nombre = limpiar(cuerpo.nombre, 100);
    const email = limpiar(cuerpo.email, 150).toLowerCase();
    const medio = MEDIOS.includes(cuerpo.medio) ? cuerpo.medio : 'nose';
    const comentario = limpiar(cuerpo.comentario, 1000);

    if (nombre.length < 2) return res.status(400).json({ error: 'Escribí tu nombre.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Escribí un email válido (el de tu cuenta de Nélida).' });
    if (cuerpo.sitio) return res.status(200).json({ codigo: generarCodigo(TIPOS[tipo]) }); // trampa anti-robots

    try {
        const codigo = generarCodigo(TIPOS[tipo]);
        await db.collection('tramites').doc(codigo).set({
            codigo,
            tipo,
            nombre,
            email,
            medio,
            comentario,
            estado: 'pendiente',
            creado: new Date().toISOString()
        });
        return res.status(200).json({ codigo });
    } catch (err) {
        console.error('Error en /api/tramite:', err);
        return res.status(500).json({ error: 'No se pudo registrar el pedido. Escribinos a nelida.oficial.ar@gmail.com.' });
    }
}
