/* server.js */
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini (Use the official SDK, it's safer/easier)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* server.js */
// ... imports ...

app.post('/api/analyze-image', async (req, res) => {
  try {
    let { image, imageUrl, mimeType } = req.body;

    // 1. If we received a URL instead of Base64, let the Server download it
    if (imageUrl && !image) {
      try {
        console.log(`Downloading image from URL: ${imageUrl.substring(0, 50)}...`);
        
        // FIX: Add headers to look like a legitimate browser request
        const imgRes = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        });
        
        if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.statusText}`);
        
        const arrayBuffer = await imgRes.arrayBuffer();
        image = Buffer.from(arrayBuffer).toString('base64');
        
        // IMPORTANT: Update mimeType based on the actual downloaded file
        const contentType = imgRes.headers.get('content-type');
        if (contentType) mimeType = contentType;

    }catch (downloadError) {
            console.error("Server download failed:", downloadError.message);
            // Don't crash, just skip this image
            return res.status(400).json({ error: 'Could not download image source' });
        }
    }

    if (!image) return res.status(400).json({ error: 'No image data provided' });

    // 2. Setup Gemini Model (Using Stable 2.5-flash)
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview", 
        safetySettings: [
             { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
             { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
             { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
             { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    });

    // 3. Send to Gemini
    const result = await model.generateContent([
        `Analyze this image for child safety. 
        Respond ONLY with this JSON: { "isSafe": boolean, "confidence": number, "recommendation": "SAFE" | "BLOCK" }`,
        { inlineData: { data: image, mimeType: mimeType || "image/jpeg"} }
    ]);

    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonResponse = JSON.parse(cleanedText);

    res.json({ result: jsonResponse });

  } catch (error) {
    console.error('Analysis Error:', error.message);
    if (error.message.includes('429')) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ SafeSurf Server running on http://localhost:${PORT}`);
});