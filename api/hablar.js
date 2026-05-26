export default async function handler(req, res) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
                model: "tts-1", // Usar tts-1 (y no tts-1-hd) es clave porque está optimizado para baja latencia
                voice: "nova", 
                input: texto.substring(0, 4000) 
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Fallo en OpenAI: ${errorData}`);
        }

        // LA MAGIA: Extraemos el audio crudo y lo mandamos directamente sin convertir a Base64
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        res.setHeader('Content-Type', 'audio/mpeg'); // Le avisamos a la web que viene un MP3 puro
        return res.status(200).send(buffer);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
