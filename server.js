const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: '*' }));
app.use(express.json());

app.post('/analyze', upload.array('photos', 25), async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

    const imageContents = req.files.map(file => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: file.mimetype,
        data: file.buffer.toString('base64')
      }
    }));

    imageContents.push({
      type: 'text',
      text: `You are a pet photography style analyst for Hair of the Dog Academy. Analyze these ${req.files.length} photos and identify the photographer's style traits across all 9 categories below.

For each category, identify:
- DOMINANT traits (clearly and consistently present)
- PRESENT traits (appear occasionally)
- GAP traits (notably absent — style opportunities)

Categories and their possible traits:
1. Subjects: Dog only / Pets & people posed / Pets & people candid
2. Light: Off-camera flash / Backlit / Soft light / Direct/harsh light / Dark (underexposed) / Light (overexposed)
3. Environment: Studio / In-home / Outdoors / Urban / Wooded/natural
4. Lens: Wide-angle / Telephoto / Mid-range / Shallow DOF
5. Vibe: Props / Adventure / Posed / Lifestyle / Action
6. Post-Processing: Clean / High contrast / Low contrast (matte) / Monochromatic / Black & white / Light & airy / Dark & moody
7. Color Temperature: Warm tones / Cool tones / Neutral/balanced / Mixed/varied
8. Subject Framing: Tight headshot / Half body / Full body / Environmental
9. Composition: Negative space / Rule of thirds / Centered/symmetry / Leading lines / Framing

Then write a 2-3 sentence personalized bridge that summarizes the photographer's overall style identity and naturally connects to why exploring the Editing Vault (a curated library of 40+ editing tutorials from pet photographers) could help them deepen or expand their style.

Respond ONLY with valid JSON in exactly this structure, no preamble, no markdown fences:
{
  "categories": [
    {
      "name": "Subjects",
      "dominant": ["trait1"],
      "present": ["trait2"],
      "gaps": ["trait3"]
    }
  ],
  "bridge": "Your personalized style summary and bridge sentence here."
}`
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: imageContents }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'API error' });

    const rawText = data.content.map(b => b.text || '').join('');
    const clean = rawText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
