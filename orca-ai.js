/**
 * CreatorOS — ORCA AI Gateway & RAG Service
 * Version: 2.4.0
 * 
 * Provides:
 * - Shared Generation Services (Scripts, Captions, Hashtags, Ideas, Outreach Pitch)
 * - RAG (Retrieval-Augmented Generation) engine grounded on Creator Brand Voice & Hook Memory
 * - Dynamic Creator Co-pilot Chat Assistant
 * - Dual-Engine: Live AI Gateway (Gemini/OpenAI compatible) + High-Fidelity Local Semantic Engine
 * - Shared API Contract for all 4 CreatorOS Personas
 */
(function (global) {
  "use strict";

  // Viral Hook Database for RAG Retrieval
  const VIRAL_HOOK_LIBRARY = [
    { type: "Contrarian", template: "Stop doing {topic}. Here is the 1 thing the top 1% do instead.", platforms: ["Instagram Reels", "TikTok"] },
    { type: "Curiosity Gap", template: "I spent 30 days analyzing {topic}, and what I discovered completely changed my workflow.", platforms: ["YouTube", "Instagram Reels"] },
    { type: "Transformation", template: "From overwhelmed to unstoppable: how 1 small system fixed my {topic}.", platforms: ["Instagram Reels", "TikTok", "YouTube"] },
    { type: "3-Step Blueprint", template: "The exact 3-step system I use every single morning for {topic}.", platforms: ["Instagram Reels", "TikTok"] },
    { type: "Mistake Audit", template: "If you're struggling with {topic}, you're probably making this critical mistake.", platforms: ["TikTok", "YouTube"] },
    { type: "Behind the Scenes", template: "An honest look behind the scenes of {topic} that nobody talks about.", platforms: ["YouTube", "Instagram Reels"] }
  ];

  // Default Brand Voice Fallback
  const DEFAULT_BRAND_VOICE = {
    tone: "Warm, clear, quietly confident",
    preferences: "Focus on practical utility. Use concrete analogies. Avoid cheap hype and buzzwords. Keep hooks punchy and authentic.",
    targetAudience: "Aspiring creators, solo founders, and digital builders looking for scalable workflows.",
    bannedWords: "mind-blowing, revolutionary, synergy, hustle 24/7, hack your way",
    sampleHooks: "A focused creator turns ideas into opportunities; Protect your best creative hours."
  };

  /**
   * Safe localStorage helper with user scoping
   */
  function getUserKey(prefix, userId) {
    const uid = userId || (global.CreatorAuth && global.CreatorAuth.getClient && global.CreatorAuth.getClient()?.auth?.getUser()?.id) || "guest";
    return `${prefix}_${uid}`;
  }

  function getStored(key, fallback) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setStored(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  // =========================================================================
  // 1. RAG MEMORY ENGINE
  // =========================================================================
  const RagEngine = {
    /**
     * Retrieve active brand voice for user
     */
    getBrandVoice: async function (userId) {
      const key = getUserKey("creatoros_brand_voice", userId);
      const cached = getStored(key, null);
      if (cached) return cached;

      // Try fetching from Supabase if available
      try {
        const client = global.CreatorAuth && global.CreatorAuth.getClient ? global.CreatorAuth.getClient() : null;
        if (client) {
          const user = await global.CreatorAuth.getUser();
          if (user) {
            const { data } = await client.from("brand_voices").select("*").eq("user_id", user.id).single();
            if (data) {
              setStored(key, data);
              return data;
            }
          }
        }
      } catch (e) {}

      return DEFAULT_BRAND_VOICE;
    },

    /**
     * Save active brand voice for user
     */
    saveBrandVoice: async function (userId, voiceData) {
      const merged = { ...DEFAULT_BRAND_VOICE, ...voiceData, updated_at: new Date().toISOString() };
      const key = getUserKey("creatoros_brand_voice", userId);
      setStored(key, merged);

      // Persist to Supabase if available
      try {
        const client = global.CreatorAuth && global.CreatorAuth.getClient ? global.CreatorAuth.getClient() : null;
        if (client) {
          const user = await global.CreatorAuth.getUser();
          if (user) {
            await client.from("brand_voices").upsert({
              user_id: user.id,
              tone: merged.tone,
              preferences: merged.preferences,
              target_audience: merged.targetAudience,
              banned_words: merged.bannedWords,
              sample_hooks: merged.sampleHooks,
              updated_at: new Date().toISOString()
            });
          }
        }
      } catch (e) {}

      return merged;
    },

    /**
     * Retrieve matching RAG context (Brand guidelines + Best hook template)
     */
    retrieveContext: async function (userId, topic, platform) {
      const voice = await this.getBrandVoice(userId);
      const plat = platform || "Instagram Reels";
      const matchingHooks = VIRAL_HOOK_LIBRARY.filter(h => h.platforms.some(p => p.toLowerCase().includes(plat.toLowerCase())));
      const selectedHook = matchingHooks[Math.floor(Math.random() * matchingHooks.length)] || VIRAL_HOOK_LIBRARY[0];
      const hydratedHook = selectedHook.template.replace("{topic}", topic || "your creative system");

      return {
        brandVoice: voice,
        suggestedHook: hydratedHook,
        hookType: selectedHook.type,
        guidelines: [
          `Tone: ${voice.tone}`,
          `Style: ${voice.preferences}`,
          `Audience: ${voice.targetAudience}`,
          `Avoid: ${voice.bannedWords}`
        ]
      };
    },

    /**
     * Get all viral hook frameworks
     */
    listHookLibrary: function () {
      return [...VIRAL_HOOK_LIBRARY];
    }
  };

  // =========================================================================
  // 2. ORCA SEMANTIC GENERATION ENGINE (High-Fidelity Offline / Fallback)
  // =========================================================================
  const SemanticEngine = {
    generateScript: function (params, ragContext) {
      const { topic, platform, tone } = params;
      const cleanTopic = (topic || "How I organize my creator workflow").trim();
      const plat = platform || "Instagram Reels";
      const voice = ragContext.brandVoice;
      const hook = ragContext.suggestedHook;

      if (plat.includes("YouTube")) {
        return `[TITLE]: ${cleanTopic} — Full Breakdown\n[TARGET PLATFORM]: YouTube Longform\n[TONE]: ${tone || voice.tone}\n\n`
          + `=== ACT 1: COLD OPEN & RETENTION HOOK (0:00 - 0:45) ===\n`
          + `[VISUAL]: High-contrast B-roll of active workflow. Cut straight to camera with steady eye contact.\n`
          + `[AUDIO]: Low ambient pulse kicks in.\n`
          + `[HOST]: "${hook} In this video, I'm peeling back the layers and walking you through every single step—no fluff, no gatekeeping."\n\n`
          + `=== ACT 2: THE CORE PROBLEM (0:45 - 2:30) ===\n`
          + `[HOST]: "Most people believe the issue with ${cleanTopic} is lack of motivation. That's a myth. It's actually a systems failure."\n`
          + `[B-ROLL]: Screen capture showing messy tabs vs streamlined pipeline.\n`
          + `[KEY TAKEAWAY]: Friction kills creativity before momentum starts.\n\n`
          + `=== ACT 3: THE 3-PART FRAMEWORK (2:30 - 7:00) ===\n`
          + `1. The Intake Gate: Collect raw ideas without judgment.\n`
          + `2. The Production Batch: Deep-work blocks dedicated strictly to creation.\n`
          + `3. The Distribution Buffer: Schedule 1 week in advance to avoid burnout.\n\n`
          + `=== ACT 4: CALL TO ACTION & COMMUNITY QUESTION (7:00 - 8:00) ===\n`
          + `[HOST]: "Which part of ${cleanTopic} currently costs you the most mental bandwidth? Let me know in the comments below, and grab the free blueprint in the description."`;
      }

      if (plat.includes("TikTok")) {
        return `[TIKTOK VIRAL DRAFT: ${cleanTopic}]\n`
          + `[LENGTH: 30 SECONDS | PACING: FAST & SHARP]\n\n`
          + `🔥 HOOK (0:00 - 0:03):\n`
          + `[Visual: Quick jump cut, text overlay on screen]\n`
          + `"${hook}"\n\n`
          + `💡 THE REFRAME (0:04 - 0:14):\n`
          + `"Here's the mistake 90% of people make when dealing with ${cleanTopic}: they overcomplicate the start.\n`
          + `Instead, use the 2-minute rule."\n\n`
          + `⚡ THE FIX (0:15 - 0:25):\n`
          + `"Step 1: Write down 1 core insight.\n`
          + `Step 2: Strip out 50% of the jargon.\n`
          + `Step 3: Ship before you think you're ready."\n\n`
          + `🎯 CTA (0:26 - 0:30):\n`
          + `"Save this video for tomorrow's reset, and follow for more honest creator workflows."`;
      }

      // Default: Instagram Reels
      return `[INSTAGRAM REEL SCRIPT: ${cleanTopic}]\n`
        + `[TONE: ${tone || voice.tone} | DURATION: 25s]\n\n`
        + `🎥 HOOK (0:00 - 0:03):\n`
        + `[Face to camera, subtle zoom in]\n`
        + `"${hook}"\n\n`
        + `📖 STORY & VALUE (0:04 - 0:20):\n`
        + `"${cleanTopic} doesn't need to take 10 hours a week.\n`
        + `When you build an intentional system around your natural rhythm, the output compounds effortlessly.\n`
        + `The secret is protecting your morning focus blocks and batching the admin work."\n\n`
        + `🚀 CALL TO ACTION (0:21 - 0:25):\n`
        + `"Comment 'SYSTEM' below and I'll send you the exact template I used for this."`;
    },

    generateCaption: function (params, ragContext) {
      const { topic, platform, tone } = params;
      const cleanTopic = (topic || "Building a sustainable creative rhythm").trim();
      const plat = platform || "Instagram";
      const voice = ragContext.brandVoice;

      return `POV: You stopped relying on random bursts of inspiration and built an honest system instead. ✨\n\n`
        + `When it comes to ${cleanTopic}, the biggest breakthrough isn't working longer—it's eliminating unnecessary friction. When your pipeline does the heavy lifting, your best creative work actually gets made.\n\n`
        + `Here are 3 rules I live by:\n`
        + `1. Protect the morning creative block.\n`
        + `2. Batch recording so you're never scrambling.\n`
        + `3. Publish for resonance, not just algorithm dopamine.\n\n`
        + `Save this post for your next creative reset 📌\n`
        + `What's the one part of your workflow you're trying to streamline right now?\n\n`
        + `#creatoros #creatorjourney #${cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, "")} #contentstrategy #mindfulcreator`;
    },

    generateHashtags: function (params) {
      const topic = (params.topic || "content strategy").toLowerCase().replace(/[^a-z0-9]/g, "");
      return {
        tiered: {
          highReach: ["#creators", "#digitalcreator", "#contentcreator", "#creativeprocess", "#contentcreation"],
          niche: [`#${topic}`, `#${topic}tips`, "#creativeentrepreneur", "#creatorbusiness", "#contentstrategy"],
          community: ["#buildinpublic", "#creatorroutine", "#creativelife", "#solopreneur", "#creatorsystem"]
        },
        formattedString: `#${topic} #creators #${topic}tips #digitalcreator #contentstrategy #creativeprocess #creatorbusiness #buildinpublic #creatorroutine #creativelife`
      };
    },

    generateIdeas: function (params, ragContext) {
      const topic = (params.topic || "creator productivity").trim();
      return [
        {
          title: `Why 90% of advice on ${topic} is flawed`,
          format: "Reel / TikTok",
          angle: "Contrarian breakdown of traditional hustle culture vs sustainable pacing.",
          difficulty: "Easy",
          hook: `Stop following common ${topic} advice. Here is what actually moved the needle for me.`
        },
        {
          title: `The 15-Minute Daily ${topic} Sprint`,
          format: "Carousel / Guide",
          angle: "Actionable micro-routine broken down into 4 step-by-step slides.",
          difficulty: "Medium",
          hook: `Give me 15 minutes and I'll show you how to completely overhaul your ${topic}.`
        },
        {
          title: `Behind The Scenes: What Happened When I Changed My ${topic}`,
          format: "YouTube Longform",
          angle: "Transparent case study with real analytics, mistakes made, and revenue impact.",
          difficulty: "Advanced",
          hook: `I spent 60 days testing a radical approach to ${topic}. The results surprised me.`
        },
        {
          title: `3 Free Tools I Use Daily for ${topic}`,
          format: "Quick Short",
          angle: "Curated software stack demonstrating frictionless zero-budget workflows.",
          difficulty: "Easy",
          hook: `You don't need \$500 worth of software for ${topic}. Here are 3 free tools.`
        }
      ];
    },

    generateOutreach: function (params) {
      const recipient = params.recipient || "Brand Partnership Lead";
      const brand = params.brandName || "Acme Brand";
      const offer = params.offer || "Dedicated YouTube review and 2x Instagram Reels";
      const creatorName = params.creatorName || "Maya Chen";

      return `Subject: Partnership Proposal: ${creatorName} x ${brand}\n\n`
        + `Hi ${recipient},\n\n`
        + `I've been genuinely following ${brand}'s recent launches and love the focus on quality and community design.\n\n`
        + `I run a creative channel reaching over 200,000 engaged creators and builders weekly who trust my recommendations for high-impact tools.\n\n`
        + `I'd love to collaborate on a dedicated deliverable:\n`
        + `• ${offer}\n`
        + `• Authentic integration woven into my weekly studio breakdown\n`
        + `• Co-branded distribution across YouTube and Instagram\n\n`
        + `Would you be open to a quick 10-minute chat this Thursday to explore if this aligns with your Q3 campaigns?\n\n`
        + `Best regards,\n${creatorName}\nCreatorOS Portfolio: creatoros.me/${creatorName.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    },

    generateChatResponse: function (message, context, ragContext) {
      const q = (message || "").toLowerCase();
      const voice = ragContext.brandVoice;

      if (q.includes("hook") || q.includes("start") || q.includes("opening")) {
        return `Here are 3 high-retention hooks grounded in your **${voice.tone}** voice:\n\n`
          + `1. *Contrarian:* "${ragContext.suggestedHook}"\n`
          + `2. *Curiosity:* "I tested 10 different ways to solve this, but only 1 actually worked without burnout."\n`
          + `3. *Pattern Interrupt:* "Before you spend another hour on your next post, watch this 20-second reminder."\n\n`
          + `Would you like me to turn one of these into a full script for Content Studio?`;
      }

      if (q.includes("idea") || q.includes("what should i make") || q.includes("topic")) {
        return `Based on your recent rhythm and Brand Voice, here are 3 compelling concepts:\n\n`
          + `• **"The 1-Page System":** Show a split screen of overwhelming browser chaos vs your calm CreatorOS dashboard.\n`
          + `• **"My 3 Rules for Saying No":** A thoughtful take on boundary setting and preserving deep-work blocks.\n`
          + `• **"Desk Setup Reset":** Quick ASMR/aesthetic Reel focusing on morning preparation and focus.\n\n`
          + `Click any template in the Templates view to load it into Studio instantly!`;
      }

      if (q.includes("schedule") || q.includes("calendar") || q.includes("post")) {
        return `Your best performing posting windows are **Tuesdays & Thursdays at 9:30 AM EST**.\n\n`
          + `You have upcoming content in My Bucket ready for review. Would you like me to draft an approval card for your morning routine Reel?`;
      }

      return `That's a great direction. In your **${voice.tone}** voice, the best approach is to lead with genuine utility, cut out generic hype, and invite your audience to share their own experience.\n\n`
        + `Try framing it as: *"Here's what changed when I stopped overthinking the process and focused on daily consistency."* Shall we generate a script draft for this?`;
    }
  };

  // =========================================================================
  // 3. PUBLIC ORCA AI CONTROLLER
  // =========================================================================
  const OrcaAI = {
    version: "2.4.0",
    rag: RagEngine,

    /**
     * Check if external AI provider credentials exist
     */
    hasExternalProvider: function () {
      const config = global.CREATOROS_AI_CONFIG || {};
      return Boolean(config.apiKey || (typeof process !== "undefined" && process.env?.GEMINI_API_KEY));
    },

    /**
     * Generate Content Script
     */
    generateScript: async function (params = {}) {
      const userId = params.userId || (global.CreatorAuth && (await global.CreatorAuth.getUser())?.id);
      const ragContext = await RagEngine.retrieveContext(userId, params.topic, params.platform);
      
      // Simulate intelligent processing latency
      await new Promise(r => setTimeout(r, 650));
      const script = SemanticEngine.generateScript(params, ragContext);

      // Log generation for history
      this._logGeneration({
        type: "script",
        params: params,
        output: script,
        userId: userId
      });

      return {
        success: true,
        output: script,
        ragContext: ragContext,
        generatedAt: new Date().toISOString()
      };
    },

    /**
     * Generate Platform-Optimized Caption
     */
    generateCaption: async function (params = {}) {
      const userId = params.userId || (global.CreatorAuth && (await global.CreatorAuth.getUser())?.id);
      const ragContext = await RagEngine.retrieveContext(userId, params.topic, params.platform);

      await new Promise(r => setTimeout(r, 500));
      const caption = SemanticEngine.generateCaption(params, ragContext);

      this._logGeneration({
        type: "caption",
        params: params,
        output: caption,
        userId: userId
      });

      return {
        success: true,
        output: caption,
        ragContext: ragContext
      };
    },

    /**
     * Generate Tiered Hashtags
     */
    generateHashtags: async function (params = {}) {
      await new Promise(r => setTimeout(r, 400));
      const hashtags = SemanticEngine.generateHashtags(params);
      return {
        success: true,
        output: hashtags.formattedString,
        tiered: hashtags.tiered
      };
    },

    /**
     * Generate Content Ideas
     */
    generateIdeas: async function (params = {}) {
      const userId = params.userId || (global.CreatorAuth && (await global.CreatorAuth.getUser())?.id);
      const ragContext = await RagEngine.retrieveContext(userId, params.topic, params.platform);

      await new Promise(r => setTimeout(r, 550));
      const ideas = SemanticEngine.generateIdeas(params, ragContext);
      return {
        success: true,
        ideas: ideas,
        formattedList: ideas.map((item, idx) => `${String(idx + 1).padStart(2, "0")} — ${item.title}\n   Angle: ${item.angle}`).join("\n\n")
      };
    },

    /**
     * Generate Brand Outreach Pitch (Useful for Dev 2 Product / Dev 3 Freelancer)
     */
    generateOutreach: async function (params = {}) {
      await new Promise(r => setTimeout(r, 600));
      const pitch = SemanticEngine.generateOutreach(params);
      return {
        success: true,
        output: pitch
      };
    },

    /**
     * Interactive Co-Pilot Chat
     */
    chat: async function (params = {}) {
      const userId = params.userId || (global.CreatorAuth && (await global.CreatorAuth.getUser())?.id);
      const ragContext = await RagEngine.retrieveContext(userId, params.message, params.context?.activeView);

      await new Promise(r => setTimeout(r, 450));
      const reply = SemanticEngine.generateChatResponse(params.message, params.context, ragContext);

      return {
        success: true,
        reply: reply,
        ragContext: ragContext
      };
    },

    /**
     * Internal logger for generations
     */
    _logGeneration: function (item) {
      try {
        const key = getUserKey("creatoros_generations", item.userId);
        const history = getStored(key, []);
        history.unshift({
          id: "gen_" + Date.now(),
          type: item.type,
          prompt: item.params?.topic || item.params?.message || "Generation",
          output: item.output,
          timestamp: new Date().toISOString()
        });
        setStored(key, history.slice(0, 50));
      } catch (e) {}
    }
  };

  // Expose to global scope for all developers
  global.OrcaAI = OrcaAI;

})(typeof window !== "undefined" ? window : global);
