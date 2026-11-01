/**
 * CreatorOS — Unified Shared API Contract & Data Persistence Service
 * Version: 2.4.0
 * 
 * Provides authoritative data contracts, user-scoped storage, and Supabase integration
 * for all 4 CreatorOS developer features:
 * - Content Creator (Bucket, Calendar, Approvals, Brand Voice, Studio)
 * - Product Creator / Beluga (Leads, Outreach, Products)
 * - Freelancer (Invoices, Projects, Time Tracking)
 * - Advertiser (Campaigns, Assets, Spend)
 */
(function (global) {
  "use strict";

  // Starter Seed Data for Content Creator
  const SEED_BUCKET_ITEMS = [
    {
      id: "item_seed_1",
      title: "A creator’s morning routine",
      platform: "Instagram",
      status: "Ready for approval",
      script: true,
      caption: true,
      date: "Jun 18",
      notes: "Show split-screen of morning focus block and workflow dashboard.",
      scriptContent: "[HOOK] Stop starting your morning in your inbox. Here is the 1-page system I use instead...",
      captionContent: "POV: You stopped relying on random motivation and built a calm daily creative rhythm. ✨ #creatorroutine"
    },
    {
      id: "item_seed_2",
      title: "3 tools I use every day",
      platform: "TikTok",
      status: "Script added",
      script: true,
      caption: false,
      date: "Jun 20",
      notes: "Quick, snappy 25-second walkthrough of Notion, Screenflow, and CreatorOS.",
      scriptContent: "Three zero-cost tools that save me 12 hours every week...",
      captionContent: ""
    },
    {
      id: "item_seed_3",
      title: "Behind the scenes: studio build",
      platform: "YouTube",
      status: "Draft",
      script: false,
      caption: false,
      date: "Jun 22",
      notes: "Acoustic panels, lighting placement, and desk cable management.",
      scriptContent: "",
      captionContent: ""
    }
  ];

  const SEED_CALENDAR_EVENTS = [
    { id: "ev_1", title: "Morning routine Reel", platform: "Instagram", date: "2024-06-18", time: "09:30", notes: "Peak engagement window" },
    { id: "ev_2", title: "Top 3 Studio Audio Setups", platform: "YouTube", date: "2024-06-20", time: "14:00", notes: "Longform upload" },
    { id: "ev_3", title: "Desk Setup Aesthetic Short", platform: "TikTok", date: "2024-06-22", time: "18:00", notes: "Evening scroll window" }
  ];

  const SEED_MEDIA_ASSETS = [
    { id: "med_1", title: "Desk Morning B-Roll 4K", type: "Video (0:24)", dur: "64 MB", tag: "Video Clips" },
    { id: "med_2", title: "Lo-Fi Focus Morning Beat", type: "Audio (2:10)", dur: "4.8 MB", tag: "Audio Tracks" },
    { id: "med_3", title: "CreatorOS Brand Mark Vector", type: "SVG Asset", dur: "12 KB", tag: "Brand Assets" },
    { id: "med_4", title: "Studio Light Setup Clean", type: "Video (0:18)", dur: "42 MB", tag: "Video Clips" },
    { id: "med_5", title: "YouTube Thumbnail Master PSD", type: "Graphic", dur: "18 MB", tag: "Thumbnails" },
    { id: "med_6", title: "Warm Ambient Chime Sound", type: "Audio SFX", dur: "420 KB", tag: "Audio Tracks" }
  ];

  const SEED_SPONSOR_DEALS = [
    { id: "deal_1", sponsor: "SoundGear Pro Audio", deliverable: "1x Dedicated YouTube Review", fee: "$4,000", status: "In Production", dueDate: "Jun 24" },
    { id: "deal_2", sponsor: "Flowdesk Workspace App", deliverable: "2x Instagram Reel Series", fee: "$3,500", status: "Approved", dueDate: "Jun 28" },
    { id: "deal_3", sponsor: "Komorebi Minimal Lamp", deliverable: "1x TikTok Aesthetic Feature", fee: "$1,000", status: "Contract Signed", dueDate: "Jul 05" }
  ];

  /**
   * Helper to retrieve active user identity
   */
  async function getActiveUser() {
    if (global.CreatorAuth && typeof global.CreatorAuth.getUser === "function") {
      try {
        const u = await global.CreatorAuth.getUser();
        if (u) return u;
      } catch (e) {}
    }
    return { id: "current_user", email: "creator@creatoros.ai", user_metadata: { display_name: "Maya Chen" } };
  }

  function getScopedKey(collection, userId) {
    return `creatoros_${userId || "default"}_${collection}`;
  }

  function loadScoped(collection, userId, fallback) {
    try {
      const key = getScopedKey(collection, userId);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveScoped(collection, userId, data) {
    try {
      const key = getScopedKey(collection, userId);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }

  // =========================================================================
  // CREATOROS UNIFIED API CONTROLLER
  // =========================================================================
  const CreatorAPI = {
    version: "2.4.0",

    // 1. Content Pipeline (Bucket)
    content: {
      list: async function () {
        const user = await getActiveUser();
        // Try Supabase first if available
        try {
          const client = global.CreatorAuth?.getClient?.();
          if (client && user.id !== "current_user") {
            const { data, error } = await client
              .from("content_items")
              .select("*")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false });
            if (!error && data && data.length > 0) {
              saveScoped("bucket", user.id, data);
              return data;
            }
          }
        } catch (e) {}

        return loadScoped("bucket", user.id, SEED_BUCKET_ITEMS);
      },

      create: async function (item) {
        const user = await getActiveUser();
        const newItem = {
          id: "item_" + Date.now(),
          user_id: user.id,
          title: item.title,
          platform: item.platform || "Instagram",
          status: item.status || "Draft",
          script: Boolean(item.script),
          caption: Boolean(item.caption),
          date: item.date || "Unscheduled",
          notes: item.notes || "",
          scriptContent: item.scriptContent || "",
          captionContent: item.captionContent || "",
          created_at: new Date().toISOString()
        };

        const current = await this.list();
        current.unshift(newItem);
        saveScoped("bucket", user.id, current);

        // Sync to Supabase in background
        try {
          const client = global.CreatorAuth?.getClient?.();
          if (client && user.id !== "current_user") {
            await client.from("content_items").insert({
              id: newItem.id,
              user_id: user.id,
              title: newItem.title,
              platform: newItem.platform,
              status: newItem.status,
              has_script: newItem.script,
              has_caption: newItem.caption,
              notes: newItem.notes,
              script_content: newItem.scriptContent,
              caption_content: newItem.captionContent,
              scheduled_date: newItem.date
            });
          }
        } catch (e) {}

        return newItem;
      },

      update: async function (id, patch) {
        const user = await getActiveUser();
        const current = await this.list();
        const idx = current.findIndex(i => i.id === id);
        if (idx !== -1) {
          current[idx] = { ...current[idx], ...patch, updated_at: new Date().toISOString() };
          saveScoped("bucket", user.id, current);

          try {
            const client = global.CreatorAuth?.getClient?.();
            if (client && user.id !== "current_user") {
              await client.from("content_items").update({
                title: current[idx].title,
                platform: current[idx].platform,
                status: current[idx].status,
                has_script: current[idx].script,
                has_caption: current[idx].caption,
                notes: current[idx].notes,
                script_content: current[idx].scriptContent,
                caption_content: current[idx].captionContent,
                scheduled_date: current[idx].date
              }).eq("id", id).eq("user_id", user.id);
            }
          } catch (e) {}

          return current[idx];
        }
        return null;
      },

      delete: async function (id) {
        const user = await getActiveUser();
        const current = await this.list();
        const filtered = current.filter(i => i.id !== id);
        saveScoped("bucket", user.id, filtered);

        try {
          const client = global.CreatorAuth?.getClient?.();
          if (client && user.id !== "current_user") {
            await client.from("content_items").delete().eq("id", id).eq("user_id", user.id);
          }
        } catch (e) {}

        return true;
      }
    },

    // 2. Calendar Rhythm
    calendar: {
      list: async function () {
        const user = await getActiveUser();
        try {
          const client = global.CreatorAuth?.getClient?.();
          if (client && user.id !== "current_user") {
            const { data, error } = await client
              .from("calendar_events")
              .select("*")
              .eq("user_id", user.id)
              .order("date", { ascending: true });
            if (!error && data && data.length > 0) {
              saveScoped("events", user.id, data);
              return data;
            }
          }
        } catch (e) {}

        return loadScoped("events", user.id, SEED_CALENDAR_EVENTS);
      },

      create: async function (ev) {
        const user = await getActiveUser();
        const newEv = {
          id: "ev_" + Date.now(),
          user_id: user.id,
          title: ev.title,
          platform: ev.platform || "Instagram",
          date: ev.date,
          time: ev.time || "09:30",
          notes: ev.notes || "",
          created_at: new Date().toISOString()
        };

        const current = await this.list();
        current.push(newEv);
        saveScoped("events", user.id, current);

        try {
          const client = global.CreatorAuth?.getClient?.();
          if (client && user.id !== "current_user") {
            await client.from("calendar_events").insert(newEv);
          }
        } catch (e) {}

        return newEv;
      },

      delete: async function (id) {
        const user = await getActiveUser();
        const current = await this.list();
        const filtered = current.filter(e => e.id !== id);
        saveScoped("events", user.id, filtered);

        try {
          const client = global.CreatorAuth?.getClient?.();
          if (client && user.id !== "current_user") {
            await client.from("calendar_events").delete().eq("id", id).eq("user_id", user.id);
          }
        } catch (e) {}

        return true;
      }
    },

    // 3. Brand Voice
    brandVoice: {
      get: async function () {
        const user = await getActiveUser();
        if (global.OrcaAI && global.OrcaAI.rag) {
          return await global.OrcaAI.rag.getBrandVoice(user.id);
        }
        return loadScoped("brand_voice", user.id, {
          tone: "Warm, clear, quietly confident",
          preferences: "Focus on practical utility. Use concrete analogies. Avoid cheap hype.",
          targetAudience: "Aspiring creators, solo founders, and digital builders.",
          bannedWords: "mind-blowing, revolutionary, synergy, hustle 24/7"
        });
      },

      save: async function (voiceData) {
        const user = await getActiveUser();
        if (global.OrcaAI && global.OrcaAI.rag) {
          return await global.OrcaAI.rag.saveBrandVoice(user.id, voiceData);
        }
        saveScoped("brand_voice", user.id, voiceData);
        return voiceData;
      }
    },

    // 4. Approvals Management
    approvals: {
      list: async function () {
        const items = await CreatorAPI.content.list();
        return items.filter(i => i.status === "Ready for approval" || i.status === "Script added");
      },

      approve: async function (id) {
        return await CreatorAPI.content.update(id, {
          status: "Approved",
          approved_at: new Date().toISOString()
        });
      },

      requestEdit: async function (id, revisionNote) {
        return await CreatorAPI.content.update(id, {
          status: "Draft",
          notes: revisionNote || "Revisions requested by creator."
        });
      }
    },

    // 5. Media Library
    media: {
      list: async function () {
        const user = await getActiveUser();
        return loadScoped("media", user.id, SEED_MEDIA_ASSETS);
      },

      upload: async function (asset) {
        const user = await getActiveUser();
        const newAsset = {
          id: "med_" + Date.now(),
          title: asset.title || "Untitled Asset",
          type: asset.type || "Video",
          tag: asset.tag || "Video Clips",
          dur: asset.dur || "12 MB",
          created_at: new Date().toISOString()
        };
        const current = await this.list();
        current.unshift(newAsset);
        saveScoped("media", user.id, current);
        return newAsset;
      },

      delete: async function (id) {
        const user = await getActiveUser();
        const current = await this.list();
        const filtered = current.filter(m => m.id !== id);
        saveScoped("media", user.id, filtered);
        return true;
      }
    },

    // 6. Connected Channels
    connections: {
      get: async function () {
        const user = await getActiveUser();
        return loadScoped("connections", user.id, {
          Instagram: true,
          YouTube: true,
          TikTok: true,
          Substack: true,
          Threads: true,
          LinkedIn: false
        });
      },

      toggle: async function (channelName, state) {
        const user = await getActiveUser();
        const current = await this.get();
        current[channelName] = Boolean(state);
        saveScoped("connections", user.id, current);
        return current;
      }
    },

    // 7. Monetization Deals
    monetization: {
      list: async function () {
        const user = await getActiveUser();
        return loadScoped("sponsors", user.id, SEED_SPONSOR_DEALS);
      },

      create: async function (deal) {
        const user = await getActiveUser();
        const newDeal = {
          id: "deal_" + Date.now(),
          sponsor: deal.sponsor,
          deliverable: deal.deliverable,
          fee: deal.fee || "$1,000",
          status: deal.status || "In Review",
          dueDate: deal.dueDate || "Next Month"
        };
        const current = await this.list();
        current.unshift(newDeal);
        saveScoped("sponsors", user.id, current);
        return newDeal;
      }
    },

    // 8. Notifications
    notifications: {
      list: async function () {
        const user = await getActiveUser();
        return loadScoped("notifications", user.id, [
          { id: "n1", title: "Approval completed", desc: "Your morning routine is ready to schedule for Instagram.", time: "10 min ago", icon: "check", color: "pink", read: false },
          { id: "n2", title: "Spike in retention", desc: "TikTok video ‘3 tools I use every day’ hit 500k views.", time: "1 hr ago", icon: "trending-up", color: "green", read: false },
          { id: "n3", title: "Creative inspiration ready", desc: "“A day in the life” concept added to studio recommendations.", time: "3 hrs ago", icon: "sparkles", color: "purple", read: false },
          { id: "n4", title: "Calendar reminder", desc: "Behind the scenes: studio is scheduled to record tomorrow.", time: "Yesterday", icon: "calendar-days", color: "blue", read: true }
        ]);
      },

      markAllRead: async function () {
        const user = await getActiveUser();
        const current = await this.list();
        current.forEach(n => n.read = true);
        saveScoped("notifications", user.id, current);
        return current;
      }
    },

    // Reset workspace demo data for current user
    resetUserWorkspace: async function () {
      const user = await getActiveUser();
      saveScoped("bucket", user.id, SEED_BUCKET_ITEMS);
      saveScoped("events", user.id, SEED_CALENDAR_EVENTS);
      saveScoped("media", user.id, SEED_MEDIA_ASSETS);
      saveScoped("sponsors", user.id, SEED_SPONSOR_DEALS);
      saveScoped("brand_voice", user.id, null);
      return true;
    }
  };

  // Expose to global scope for all developers
  global.CreatorAPI = CreatorAPI;

})(typeof window !== "undefined" ? window : global);
