import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000;

// Initialize Google GenAI client if key is available
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Route: Political & Diplomatic AI Chat for Kings and Realm Dignitaries
  app.post('/api/diplomacy/chat', async (req, res) => {
    try {
      const {
        targetType, // 'king' | 'dignitary'
        targetNameKu,
        targetTitleKu,
        factionNameKu,
        personalityKu,
        playerRenown,
        playerHonor,
        playerDinars,
        playerTroopsCount,
        playerFiefCount,
        hasChamberlainBribe,
        relation,
        messages, // [{ role: 'user' | 'model', text: string }]
        currentProposal, // 'secret_pact' | 'bribe' | 'trade_monopoly' | 'office_request' | 'free_talk'
        officeRequested,
      } = req.body;

      // Check social barrier: if target is king and player is a nobody with no bribe/renown
      if (targetType === 'king' && (playerRenown < 45 && playerFiefCount === 0 && !hasChamberlainBribe)) {
        return res.json({
          replyTextKu: 'پاسەوانانی کۆشک: بوەستە! کێیت تۆ؟ چۆن بەبێ ناوبانگ (کەمتر لە ٤٥) یان نامەی دەستنیشانکردنی فەرمی دەوێریت داوای دیداری پاشای مەزن بکەیت؟ یان بەخشیشێک بە کارگێڕی کۆشک بدە یان ناوبانگی خۆت لە گۆڕەپانی جەنگ بسەلمێنە!',
          audienceGranted: false,
          relationChange: 0,
        });
      }

      // If Gemini client is active and valid key is set, generate realistic, politically acute response
      if (aiClient && apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        try {
          const systemInstruction = `تۆ کارەکتەری ${targetTitleKu}یت بە ناوی ${targetNameKu} لە ${factionNameKu}.
کەسایەتی تۆ: ${personalityKu || 'سیاسەتمەدارێکی زیرەک، توند، بەرژەوەندخواز، دووربین و قسەلەڕوو'}.
ڕۆڵی تۆ لەم یارییەدا (هاوشێوەی Steel and Flesh):
- تۆ سیاسەتمەدارێکی دەستڕۆیشتوویت، بە هیچ شێوەیەک ساویلکە نیت و کەس ناتوانێت فێڵت لێبکات.
- یاریزان ناوبانگی: ${playerRenown}، دینار: ${playerDinars}، سەرباز: ${playerTroopsCount}، شار/قەڵا: ${playerFiefCount}، پەیوەندی دیپلۆماسی: ${relation}.
یاساکانی وەڵامدانەوەت:
1. بە زمانی کوردی سۆرانی جوان و ڕەوان و فەرمی سەردەمی ناوەڕاست قسە بکە.
2. زۆر قسە لە ڕوو بە! ئەگەر پێشنیارەکەی یاریزان تەنها لە مەسڵەحەتی خۆی بوو و هیچی بۆ تۆ و وڵاتەکەت تێدا نەبوو، ڕێک پێی بڵێ: دەزانم بۆچی ئەمە دەڵێیت و دەتەوێت چ قازانجێک بۆ خۆت ببەیت لە کاتێکدا سوپا و خەزێنەی ئێمە تووشی زەرەر دەبێت!
3. ئەگەر داوای پەیمانی نهێنی (Secret Treaty) یان پیلانگێڕی بۆ هێرشکردنە سەر وڵاتێکی تر دەکات: داوای مەرجی قورس بکە (پارەی بارمتە، قەربووکردنەوەی خەرجی سەربازەکانمان، یان هاوبەشی لە دەستکەوتەکان).
4. ئەگەر بۆ پلەدارێک قسە دەکرێت و داوای پۆست دەکرێت: داوای بەڵگە، سوێندی دڵسۆزی و بەشداری لە پاراستن یان باجدان بکە.
5. وەڵامەکەت پوخت، کاریگەر و لە نێوان ٢ بۆ ٤ ڕستە بێت بەبێ دەربڕینی هەڵە و لە شێوازی چاتی کەسایەتییەکەت دەربچێت.`;

          const conversationContents = messages.map((m: { role: string; text: string }) => ({
            role: m.role === 'model' ? 'model' : 'user',
            parts: [{ text: m.text }],
          }));

          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout')), 3500)
          );

          const geminiPromise = aiClient.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: conversationContents,
            config: {
              systemInstruction,
              temperature: 0.7,
              maxOutputTokens: 250,
            },
          });

          const response = (await Promise.race([geminiPromise, timeoutPromise])) as any;

          const replyText = response?.text || '';
          if (replyText.trim()) {
            return res.json({
              replyTextKu: replyText.trim(),
              audienceGranted: true,
              relationChange: relation > 0 ? 1 : 0,
            });
          }
        } catch (genError) {
          console.warn('Gemini generateContent error or timeout, falling back to dynamic rule engine:', genError);
        }
      }

      // Rule-based dynamic medieval diplomatic engine fallback
      let fallbackReply = '';
      let pactSealed = false;
      let officeGranted = false;
      let cost = 0;

      const lastUserMsg = messages[messages.length - 1]?.text || '';

      if (currentProposal === 'secret_pact' || lastUserMsg.includes('نهێنی') || lastUserMsg.includes('پەیمان')) {
        if (playerRenown < 30 && playerTroopsCount < 20) {
          fallbackReply = `ئێمە پاشایین، نەک خەیاڵپڵاو! پێت وایە سوپای شکۆدارمان گرێبەستی نهێنی لەگەڵ سەرگەردانێکدا دەبەستێت کە تەنانەت ٢٠ چەکداری بەدەستەوە نییە؟ بڕۆ سەرەتا ناوبانگێک لە مەیدانی جەنگ پەیدا بکە یان بە بارمتەیەکی ٣,٠٠٠ دیناری دڵسۆزیت بسەلمێنە!`;
        } else if (playerDinars >= 1500) {
          fallbackReply = `پێشنیارێکی سەرنجڕاکێشە، بەڵام مەترسیدارە. دەزانم دەتەوێت لەم هاوپەیمانییە نهێنییەدا سنوورەکانت بپارێزیت تا لە شوێنێکی تر فراوانخوازی بکەیت. ئەگەر بەڵێنی ٢,٠٠٠ دینار پشتیوانی دارایی بدەیت بۆ خەزێنەی شەڕ، ڕەزامەندی دەدەین بە پەیمانی هاوبەش!`;
          pactSealed = true;
        } else {
          fallbackReply = `سیاسەت بە قسەی ڕووت ناکرێت! دەتەوێت لەسەر پشتی سوارچاکەکانمان سواری دەسەڵات بیت؟ ئەگەر قازانجی خەزێنە و شەرەفی وڵاتەکەمان مسۆگەر نەکەیت، تەنانەت دێڕێکیش لەسەر ئەم پەیمانە نانووسینەوە.`;
        }
      } else if (currentProposal === 'office_request' || lastUserMsg.includes('پلە') || lastUserMsg.includes('پۆست')) {
        if (playerRenown < 25 && playerHonor < 10) {
          fallbackReply = `پلە و دەسەڵات لەم شارەدا هەڕەمەکی نادرێتە کەسێکی نەناسراو! دادوەری و خەڵک متمانەت پێ ناکەن تا ئەوکاتەی بەڵگەی سەلمێنراوی دڵسۆزی و بەرژەوەندی هاوبەش نەخەیتە سەر مێز.`;
        } else {
          fallbackReply = `تۆ نیشانت داوە کە کەسێکی ژیریت. ئێمە دەتوانین مۆڵەتی فەرمی بازرگانی و پۆستی دەستڕۆیشتوویی لەم شارەت پێببەخشین، بەو مەرجەی باجی یاسایی بە تەواوی ڕادەستی خەزێنە بکەیت و پابەندی ڕێنماییەکان بیت.`;
          officeGranted = true;
        }
      } else if (lastUserMsg.includes('پارە') || lastUserMsg.includes('دینار') || lastUserMsg.includes('قەرز')) {
        fallbackReply = `خەزێنەی شاهانە شوێنی خێرخوازی نییە! هەموو دینارێک کە لەم کۆشکە دەرچێت، دەبێت سێ ئەوەندە سوودی ستراتیژی یان باجی گومرگی بۆ پاشایەتی بگەڕێنێتەوە. چیت هەیە تا لە مەترسی بخەیت؟`;
      } else {
        fallbackReply = `سڵاو لە تۆ. لەم سەردەمە ئاڵۆزەدا، تەنها ئەوانە دەمێننەوە کە هەم زمانی شیرینی دیپلۆماسی و هەم شمشێری تیژیان هەیە. بە کورتی بڵێ مەبەستت چییە و چ خێرێک بە وڵاتی ئێمە دەگەیەنیت؟`;
      }

      return res.json({
        replyTextKu: fallbackReply,
        audienceGranted: true,
        pactSealed,
        officeGranted,
        cost,
        relationChange: 1,
      });
    } catch (error) {
      console.error('Diplomacy chat error:', error);
      return res.status(500).json({
        error: 'Failed to process diplomatic dialogue',
        replyTextKu: 'نامەبەری دیپلۆماسی نائامادەیە لەم کاتەدا.',
      });
    }
  });

  // Setup Vite dev server middleware in development
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
