export default async function handler(req, res) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo peticiones POST permitidas' });

    if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: "Falta la clave OPENAI_API_KEY en las variables de entorno de Vercel" });
    }

    try {
        const { texto } = req.body;

        if (!texto) {
            return res.status(400).json({ error: "No se proporcionó texto para leer" });
        }

        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "tts-1",
                voice: "nova", // "nova" es ideal: tono natural, profesional y versátil en múltiples idiomas
                input: texto.substring(0, 4000) // Protege el límite de envío
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Fallo en OpenAI: ${errorData}`);
        }

        // Convertimos el audio directamente a base64 para mandarlo rápido a la web
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const audioBase64 = buffer.toString('base64');

        return res.status(200).json({ audioBase64 });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}