/**
 * Royal & Dignitary Audience Chat Modal
 * Realistic social barriers, blunt political negotiation, secret treaties & official appointments
 */
import React, { useState, useEffect, useRef } from 'react';
import { Dignitary, Faction, GameState, Lord } from '../types/game';
import { sfx } from '../audio/soundFx';
import { 
  Crown, 
  Send, 
  ShieldAlert, 
  Coins, 
  Scroll, 
  Award, 
  X, 
  Sparkles, 
  Users, 
  Lock,
  MessageSquareQuote,
  CheckCircle2
} from 'lucide-react';

interface AudienceModalProps {
  targetType: 'king' | 'dignitary';
  faction: Faction;
  dignitary?: Dignitary;
  gameState: GameState;
  onClose: () => void;
  onSealSecretPact: (factionId: Faction['id'], titleKu: string, termsKu: string) => void;
  onGrantOffice: (officeId: string, titleKu: string, dailySalary: number, perkKu: string) => void;
  onBribeChamberlain: (cost: number) => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const AudienceModal: React.FC<AudienceModalProps> = ({
  targetType,
  faction,
  dignitary,
  gameState,
  onClose,
  onSealSecretPact,
  onGrantOffice,
  onBribeChamberlain,
}) => {
  const player = gameState.player;
  const targetNameKu = targetType === 'king' ? faction.rulerKu : dignitary?.nameKu || '';
  const targetTitleKu = targetType === 'king' ? `پاشای ${faction.nameKu}` : dignitary?.titleKu || '';
  const personalityKu = targetType === 'king' 
    ? 'سیاسەتمەدارێکی زیرەک، بەرژەوەندخواز، دووربین و قسەلەڕوو' 
    : dignitary?.personalityKu || '';

  // Check social standing check
  const chamberlainBribed = player.chamberlainBribes?.[faction.id] || false;
  const hasAccess = targetType === 'dignitary' || player.renown >= 45 || player.fiefIds.length > 0 || chamberlainBribed;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!hasAccess) return [];
    if (targetType === 'king') {
      return [
        {
          role: 'model',
          text: `سڵاو لە تۆ. ئێمە ئاگاداری ڕەوشی شانشینین. وەرە پێشەوە و ڕوون بیڵێ مەبەستت چییە؛ لەم کۆشکەدا کات بۆ پێچپێچە و قسەی بێ سوود نییە. چیت هەیە تا پێشکەشی تەختی پادشایەتی بکەیت؟`,
        },
      ];
    } else {
      return [
        {
          role: 'model',
          text: dignitary?.dialogueGreetingKu || 'بەخێربێیت. کارەکانت پەیوەستە بە بەشی دەسەڵاتی ئێمەوە؟ ڕوونی بکەرەوە چ بەرژەوەندییەکی هاوبەشمان کۆدەکاتەوە.',
        },
      ];
    }
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dealSuccessText, setDealSuccessText] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Send message to server / dynamic engine
  const handleSendMessage = async (textToSend: string, proposalType: string = 'free_talk') => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: textToSend };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsLoading(true);
    sfx.playClick();

    try {
      const response = await fetch('/api/diplomacy/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetNameKu,
          targetTitleKu,
          factionNameKu: faction.nameKu,
          personalityKu,
          playerRenown: player.renown,
          playerHonor: player.honor,
          playerDinars: player.dinars,
          playerTroopsCount: player.troops.reduce((a, b) => a + b.count, 0),
          playerFiefCount: player.fiefIds.length,
          hasChamberlainBribe: chamberlainBribed,
          relation: faction.relations['player_kingdom'] || 0,
          messages: newHistory,
          currentProposal: proposalType,
        }),
      });

      const data = await response.json();
      const reply = data.replyTextKu || 'نامەبەری دیپلۆماسی وەڵامی هێنایەوە.';
      setMessages([...newHistory, { role: 'model', text: reply }]);

      // If deal or office is successfully sealed
      if (data.pactSealed) {
        sfx.playVictory();
        onSealSecretPact(
          faction.id,
          `پەیمانی نهێنی لەگەڵ ${targetNameKu}`,
          'پابەندبوون بە هاوپەیمانی لە سێبەر و پارێزگاری لە بەرژەوەندی هاوبەش'
        );
        setDealSuccessText(`پەیمانی نهێنی بە مۆری تایبەتی پاشا ${targetNameKu} واژۆ کرا!`);
      } else if (data.officeGranted && dignitary) {
        sfx.playVictory();
        onGrantOffice(
          dignitary.id,
          dignitary.titleKu,
          85,
          dignitary.perkDescriptionKu
        );
        setDealSuccessText(`پلە و مۆڵەتی فەرمی لەلایەن ${dignitary.nameKu} پێت بەخشرا!`);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages([
        ...newHistory,
        {
          role: 'model',
          text: 'وەزیر بە تێڕامانەوە تەماشات دەکات: "باوەڕ بە هەموو قسەیەک ناکەین تا نەبینین قازانجی ڕاستەقینە بۆ خەزێنەمان دەگەڕێتەوە!"',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in pointer-events-auto">
      <div className="bg-stone-900 border border-stone-700/80 rounded-3xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-stone-800 bg-stone-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg font-bold border border-white/20"
              style={{ backgroundColor: faction.color }}
            >
              {targetType === 'king' ? <Crown className="w-5 h-5 text-amber-300" /> : <Award className="w-5 h-5 text-purple-300" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-100">{targetNameKu}</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-800 text-amber-300 border border-stone-700">
                  {targetTitleKu}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {targetType === 'king' ? faction.nameKu : `لە شاری ${faction.nameKu}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sfx.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Gate: If player is a nobody without renown/fief/bribe */}
        {!hasAccess ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-amber-950/60 border border-amber-600/50 flex items-center justify-center text-amber-400 shadow-xl">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-amber-300">
                پاسەوانانی کۆشک و کارگێڕی تەختی پاشا ڕێگەت لێدەگرن!
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                تۆ کەسێکی گەڕۆکیت و ناوبانگی پێویستت نییە (ناوبانگت: {player.renown}، پێویستە: ٤٥ یان خاوەنی قەڵایەک بیت). لە ژیانی ڕاستیدا پاشای دەستڕۆیشتوو چاوپێکەوتن لەگەڵ کەسی بێ پێگە ناکات!
              </p>
            </div>

            <div className="w-full space-y-3 pt-2">
              <button
                disabled={player.dinars < 200}
                onClick={() => {
                  sfx.playCoin();
                  onBribeChamberlain(200);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 text-stone-950 font-bold rounded-2xl text-xs transition shadow-xl flex items-center justify-center gap-2"
              >
                <Coins className="w-4 h-4" />
                <span>بەرتیلدان بە کارگێڕی کۆشک (۲۰۰ دینار) بۆ ڕێگەپێدانی نهێنی</span>
              </button>

              <button
                onClick={() => {
                  sfx.playClick();
                  onClose();
                }}
                className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-2xl text-xs transition"
              >
                گەڕانەوە بۆ مەیدانی جەنگ و بازرگانی بۆ بەدەستهێنانی ناوبانگ
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Success Deal Banner */}
            {dealSuccessText && (
              <div className="px-6 py-2.5 bg-emerald-950/90 border-b border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{dealSuccessText}</span>
              </div>
            )}

            {/* Chat Messages */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-stone-950/60"
            >
              {messages.map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        isUser
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-800 border border-stone-700 text-stone-200'
                      }`}
                    >
                      {isUser ? 'تۆ' : targetNameKu.slice(0, 1)}
                    </div>

                    <div
                      className={`max-w-[78%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-lg ${
                        isUser
                          ? 'bg-amber-600/90 text-stone-950 font-medium rounded-tr-none'
                          : 'bg-stone-900 border border-stone-800 text-stone-200 rounded-tl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-xs text-stone-400">
                    ...
                  </div>
                  <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 text-xs text-stone-400 italic flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>{targetNameKu} بیر لە پێشنیارەکەت دەکاتەوە...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Proposal Chips */}
            <div className="px-4 py-2 bg-stone-900/90 border-t border-stone-800 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[10px] text-stone-400 font-bold shrink-0">پێشنیارە خێراکان:</span>

              {targetType === 'king' ? (
                <>
                  <button
                    onClick={() =>
                      handleSendMessage(
                        'ئێمە پێشنیاری پەیمانێکی نهێنی (Secret Pact) دەکەین: دەستدرێژی نەکردنە سەر یەکتر و هاوبەشی لە دابەشکردنی باجی کەلوپەل.',
                        'secret_pact'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 shrink-0 font-medium border border-stone-700 transition"
                  >
                    🤝 پەیمانی نهێنی
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        'دەمەوێت هێرشێکی هاوبەشی نهێنی بکەینە سەر وڵاتێکی نەیار؛ ئێوە لە پێشەوە سوپا بجوڵێنن و من لە پشتەوە دەروازەکانیان بۆ دەکەمەوە.',
                        'secret_pact'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 shrink-0 font-medium border border-stone-700 transition"
                  >
                    🗡 هێرشی هاوبەش لە پشتەوە
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        'ئامادەم بڕی ۲,۰۰۰ دینار بخەمە خەزێنەی شەڕتان بەرامبەر مۆڵەتی تەواوی بازرگانی بەبێ باج.',
                        'bribe'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 shrink-0 font-medium border border-stone-700 transition"
                  >
                    💰 دابینکردنی خەرجی سەربازی پاشا
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() =>
                      handleSendMessage(
                        'داوای مۆڵەتی بازرگانی گشتی (Trade Charter) دەکەم بۆ کەمکردنەوەی باجی گومرگی شارەکەتان.',
                        'office_request'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 shrink-0 font-medium border border-stone-700 transition"
                  >
                    📜 مۆڵەتی بازرگانی گشتی
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        'داوا دەکەم ببمە سەرپەرشتیاری ئابووری شار؛ دڵسۆزی و ڕێکخستنی باجم مسۆگەرە بەرامبەر مووچەی فەرمی.',
                        'office_request'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 shrink-0 font-medium border border-stone-700 transition"
                  >
                    ⚖ پلەی سەرپەرشتیاری ئابووری
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        'داوای پلەی ئەفسەری سوپا و پاسەوانانی قەڵا دەکەم بۆ ڕاهێنانی سەربازانی تایبەت.',
                        'office_request'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 shrink-0 font-medium border border-stone-700 transition"
                  >
                    🛡 پلەی ئەفسەری سوپا
                  </button>
                </>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText, 'free_talk');
              }}
              className="p-4 bg-stone-950 border-t border-stone-800 flex items-center gap-3"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="قسە لەگەڵ پاشا یان وەزیر بکە (بۆ نموونە: دەمەوێت هاوپەیمان بین...)"
                className="flex-1 bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 text-xs text-stone-100 placeholder:text-stone-500 outline-none focus:border-amber-500 transition"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-stone-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shrink-0"
              >
                <span>ناردن</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
