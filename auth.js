/**
 * CreatorOS Central Authentication Integration Module
 * Built with Supabase Auth & Row Level Security (RLS)
 * 
 * Provides:
 * - Real Supabase client initialization from supabase-config.js
 * - Real session persistence & restoration
 * - Secure login, signup, and logout
 * - Authoritative user profile & onboarding database operations with RLS
 * - Protected route authentication guards
 * - Zero token leakage / safe credential management
 */
(function (global) {
  "use strict";

  // Local storage keys for configuration overrides
  const CONFIG_STORAGE_KEY_URL = "creatoros_supabase_url";
  const CONFIG_STORAGE_KEY_ANON = "creatoros_supabase_anon_key";

  // Dashboard Persona Map
  const PERSONA_DASHBOARDS = Object.freeze({
    content_creator: "creator.html",
    product_creator: "Product%20based.html",
    product_builder: "Product%20based.html",
    freelancer: "Freelancer.html",
    advertiser: "advertisor.html",
    agency: "advertisor.html"
  });

  const PERSONA_META = Object.freeze({
    content_creator: {
      title: "Content Creator",
      sub: "Studio, Bucket & Brand Voice",
      route: "creator.html",
      badgeColor: "#10b981",
      icon: "🎨"
    },
    product_builder: {
      title: "Product Creator (Beluga)",
      sub: "Prospects, Map & Intelligence",
      route: "Product%20based.html",
      badgeColor: "#8b5cf6",
      icon: "📦"
    },
    freelancer: {
      title: "Freelancer",
      sub: "Clients, Invoices & Pipeline",
      route: "Freelancer.html",
      badgeColor: "#3b82f6",
      icon: "💼"
    },
    advertiser: {
      title: "Advertiser Agency",
      sub: "Campaigns, Creatives & Ad Accounts",
      route: "advertisor.html",
      badgeColor: "#ec4899",
      icon: "📣"
    }
  });

  let supabaseClient = null;
  let clientInitialized = false;

  /**
   * Resolve active Supabase configuration
   * Priority:
   * 1. window.CREATOROS_SUPABASE_CONFIG (from supabase-config.js)
   * 2. window.CREATOROS_CONFIG
   * 3. localStorage overrides (developer override)
   */
  function getActiveConfig() {
    // 1. window.CREATOROS_SUPABASE_CONFIG
    if (global.CREATOROS_SUPABASE_CONFIG && global.CREATOROS_SUPABASE_CONFIG.url) {
      const url = global.CREATOROS_SUPABASE_CONFIG.url;
      const key = global.CREATOROS_SUPABASE_CONFIG.publishableKey || global.CREATOROS_SUPABASE_CONFIG.anonKey || "";
      return { url: (url || "").trim(), key: (key || "").trim(), source: "supabase-config.js" };
    }

    // 2. window.CREATOROS_CONFIG
    if (global.CREATOROS_CONFIG && global.CREATOROS_CONFIG.supabaseUrl) {
      const url = global.CREATOROS_CONFIG.supabaseUrl;
      const key = global.CREATOROS_CONFIG.supabaseAnonKey || global.CREATOROS_CONFIG.supabasePublishableKey || "";
      return { url: (url || "").trim(), key: (key || "").trim(), source: "CREATOROS_CONFIG" };
    }

    // 3. localStorage developer overrides
    try {
      const url = localStorage.getItem(CONFIG_STORAGE_KEY_URL);
      const key = localStorage.getItem(CONFIG_STORAGE_KEY_ANON);
      if (url && key) {
        return { url: url.trim(), key: key.trim(), source: "localStorage" };
      }
    } catch (e) {}

    return { url: "", key: "", source: "none" };
  }

  /**
   * Initialize Supabase JavaScript client
   */
  function initClient() {
    if (clientInitialized && supabaseClient) return supabaseClient;

    const { url, key } = getActiveConfig();

    if (!url || !key) {
      supabaseClient = null;
      clientInitialized = true;
      return null;
    }

    if (!global.supabase || typeof global.supabase.createClient !== "function") {
      console.warn("[CreatorOS Auth] Supabase library (supabase.min.js) not yet ready on window.");
      return null;
    }

    try {
      supabaseClient = global.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== "undefined" ? window.localStorage : undefined
        }
      });
      clientInitialized = true;
      return supabaseClient;
    } catch (err) {
      console.error("[CreatorOS Auth] Failed to initialize Supabase client:", err.message);
      supabaseClient = null;
      return null;
    }
  }

  // CreatorAuth API
  const CreatorAuth = {
    PERSONA_DASHBOARDS: PERSONA_DASHBOARDS,

    /**
     * Check if Supabase credentials are configured
     */
    isConfigured: function () {
      const { url, key } = getActiveConfig();
      return Boolean(url && key);
    },

    /**
     * Get sanitized configuration info (never exposes full private keys)
     */
    getConfig: function () {
      const { url, key, source } = getActiveConfig();
      return {
        url: url || "",
        isConfigured: Boolean(url && key),
        keyPreview: key ? key.slice(0, 16) + "..." + key.slice(-4) : "",
        source: source
      };
    },

    /**
     * Update Supabase credentials and re-initialize client
     */
    setConfig: function (url, anonKey) {
      if (url) localStorage.setItem(CONFIG_STORAGE_KEY_URL, url.trim());
      else localStorage.removeItem(CONFIG_STORAGE_KEY_URL);

      if (anonKey) localStorage.setItem(CONFIG_STORAGE_KEY_ANON, anonKey.trim());
      else localStorage.removeItem(CONFIG_STORAGE_KEY_ANON);

      clientInitialized = false;
      supabaseClient = null;
      return initClient();
    },

    /**
     * Get the raw Supabase client instance
     */
    getClient: function () {
      return initClient();
    },

    /**
     * Retrieve the current active session from Supabase Auth
     */
    getSession: async function () {
      const client = initClient();
      if (!client) {
        return { user: null, session: null };
      }

      try {
        const { data, error } = await client.auth.getSession();
        if (error || !data || !data.session) {
          return { user: null, session: null };
        }
        return { user: data.session.user, session: data.session };
      } catch (err) {
        console.error("[CreatorOS Auth] Error checking session:", err.message);
        return { user: null, session: null };
      }
    },

    /**
     * Retrieve the current authenticated user
     */
    getUser: async function () {
      const client = initClient();
      if (!client) return null;

      try {
        const { data, error } = await client.auth.getUser();
        if (error || !data || !data.user) return null;
        return data.user;
      } catch (err) {
        return null;
      }
    },

    /**
     * Real Supabase Sign Up with Email, Password, and Display Name
     */
    signUp: async function (email, password, displayName) {
      if (!email || !email.trim()) throw new Error("Please enter an email address.");
      if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");

      const client = initClient();
      if (!client) {
        throw new Error("Supabase is not configured yet. Please ensure your Project URL and Publishable Key are set in supabase-config.js.");
      }

      const cleanEmail = email.trim();
      const cleanName = (displayName || cleanEmail.split("@")[0]).trim();

      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            display_name: cleanName
          }
        }
      });

      if (error) {
        if (error.message && error.message.toLowerCase().includes("already registered")) {
          throw new Error("An account with this email already exists. Please sign in instead.");
        }
        throw new Error(error.message);
      }

      return data;
    },

    /**
     * Real Supabase Sign In with Email & Password
     */
    signIn: async function (email, password) {
      if (!email || !email.trim()) throw new Error("Please enter your email.");
      if (!password) throw new Error("Please enter your password.");

      const client = initClient();
      if (!client) {
        throw new Error("Supabase is not configured yet. Please ensure your Project URL and Publishable Key are set in supabase-config.js.");
      }

      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        if (error.message.includes("Invalid login credentials") || error.code === "invalid_credentials") {
          throw new Error("Invalid email or password. Please verify your credentials.");
        }
        if (error.message.includes("Email not confirmed") || error.code === "email_not_confirmed") {
          throw new Error("Email not confirmed. Please check your inbox for the confirmation link to complete registration.");
        }
        throw new Error(error.message);
      }

      return data;
    },

    /**
     * Real Supabase Sign Out
     */
    signOut: async function () {
      const client = initClient();
      if (client) {
        try {
          await client.auth.signOut();
        } catch (e) {
          console.warn("[CreatorOS Auth] Error during Supabase signout:", e.message);
        }
      }

      // Clear local user-specific cached states
      try {
        localStorage.removeItem("creatoros_persona");
        localStorage.removeItem("creatoros_onboarding");
        sessionStorage.clear();
      } catch (e) {}

      // Redirect to signin.html
      window.location.href = "signin.html";
    },

    /**
     * Reset Password via Email with explicit redirectTo configuration
     */
    resetPassword: async function (email, redirectTo) {
      if (!email || !email.trim()) throw new Error("Please enter your email address.");
      const client = initClient();
      if (!client) throw new Error("Supabase is not configured in supabase-config.js.");

      const targetRedirect = redirectTo || (
        typeof window !== "undefined" && window.location && window.location.origin 
          ? window.location.origin + "/reset-password.html" 
          : "http://127.0.0.1:8088/reset-password.html"
      );

      const { data, error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: targetRedirect
      });

      if (error) {
        if (error.status === 429 || (error.message && error.message.toLowerCase().includes("rate limit"))) {
          throw new Error("Email rate limit exceeded. Please wait a few minutes before requesting another reset email.");
        }
        throw new Error(error.message);
      }

      return data;
    },

    /**
     * Update Password for the authenticated recovery session
     */
    updatePassword: async function (newPassword) {
      if (!newPassword) throw new Error("Please enter a new password.");
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters long.");

      const client = initClient();
      if (!client) throw new Error("Supabase is not configured in supabase-config.js.");

      const { data, error } = await client.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(error.message || "Failed to update password. Your recovery link may have expired.");
      }

      return data;
    },

    /**
     * Check if an active recovery or authenticated session exists
     */
    getRecoverySession: async function () {
      const client = initClient();
      if (!client) return { hasSession: false, user: null, session: null };

      try {
        const { data, error } = await client.auth.getSession();
        if (error || !data || !data.session) {
          return { hasSession: false, user: null, session: null };
        }
        return { hasSession: true, user: data.session.user, session: data.session };
      } catch (err) {
        return { hasSession: false, user: null, session: null };
      }
    },

    /**
     * Get Authoritative User Profile from Supabase `profiles` table
     */
    getUserProfile: async function (userId) {
      const client = initClient();
      if (!client) {
        return null;
      }

      try {
        const { data, error } = await client
          .from("profiles")
          .select("id, display_name, email, selected_persona, onboarding_completed, created_at, updated_at")
          .eq("id", userId)
          .single();

        if (error) {
          if (error.code === "PGRST205") {
            console.warn("[CreatorOS Auth] Table 'public.profiles' not found in schema cache. Please apply supabase_schema.sql in your Supabase SQL Editor.");
          } else if (error.code !== "PGRST116") { // PGRST116 is no rows returned, which is normal for brand new users
            console.warn("[CreatorOS Auth] Could not fetch profile from database:", error.message);
          }
          return null;
        }

        return data;
      } catch (err) {
        console.error("[CreatorOS Auth] Unexpected error fetching profile:", err.message);
        return null;
      }
    },

    /**
     * Save Persona & Onboarding Data to Supabase (`profiles` and `onboarding_profiles`)
     */
    saveOnboarding: async function (persona, onboardingData) {
      if (!PERSONA_DASHBOARDS[persona]) {
        throw new Error("Invalid persona: " + persona);
      }

      const client = initClient();
      if (!client) {
        throw new Error("Cannot save onboarding: Supabase client is not configured.");
      }

      const user = await this.getUser();
      if (!user) {
        throw new Error("Cannot save onboarding: User is not authenticated.");
      }

      // 1. Update public.profiles table using authenticated user ID
      const { error: profileError } = await client
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: (onboardingData && onboardingData.display_name) || user.user_metadata?.display_name || user.email.split("@")[0],
          email: user.email,
          selected_persona: persona,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        if (profileError.code === "PGRST205") {
          throw new Error("Database table 'public.profiles' does not exist yet. Please execute supabase_schema.sql in your Supabase SQL Editor.");
        }
        throw new Error("Failed to update profile: " + profileError.message);
      }

      // 2. Insert/update public.onboarding_profiles table
      const { error: onboardingError } = await client
        .from("onboarding_profiles")
        .upsert(
          {
            user_id: user.id,
            persona: persona,
            onboarding_data: onboardingData || {},
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id, persona" }
        );

      if (onboardingError) {
        console.warn("[CreatorOS Auth] Warning: could not store detailed onboarding profile:", onboardingError.message);
      }

      // Cache locally for fast UI transitions
      try {
        localStorage.setItem("creatoros_persona", persona);
        localStorage.setItem("creatoros_onboarding", JSON.stringify(onboardingData || {}));
      } catch (e) {}

      return { success: true };
    },

    /**
     * Route Protection Guard
     * Call this in dashboard HTML pages or persona.html to enforce authentication
     */
    requireAuth: async function (options = {}) {
      // Allow standalone test mode override for isolated test suites if query param present
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("test_mode") === "standalone") {
        return { user: { id: "test-user" }, profile: { selected_persona: options.expectedPersona || "content_creator", onboarding_completed: true } };
      }

      const { user } = await this.getSession();

      // 1. If not authenticated -> redirect to signin.html
      if (!user) {
        const currentUrl = window.location.pathname.split("/").pop();
        if (currentUrl !== "signin.html") {
          window.location.href = "signin.html";
        }
        return null;
      }

      // 2. Fetch authoritative database profile
      const profile = await this.getUserProfile(user.id);

      // 3. Check onboarding requirement
      if (options.requireOnboarding) {
        // If the user already has a persona chosen or is visiting a specific workspace,
        // treat onboarding as fulfilled rather than trapping them in a questionnaire.
        const currentSavedPersona = (function () {
          try { return localStorage.getItem("creatoros_persona"); } catch (e) { return null; }
        })();
        const hasPersona = (profile && profile.selected_persona) || currentSavedPersona || options.expectedPersona;
        if (!hasPersona) {
          const currentUrl = window.location.pathname.split("/").pop();
          if (currentUrl !== "persona.html") {
            window.location.href = "persona.html";
          }
          return { user: user, profile: profile };
        }
      }

      // 4. Check persona match requirement for dashboards
      if (options.expectedPersona) {
        // The user intentionally visited this workspace.
        // Update local state and profile to reflect active persona without bouncing away!
        try {
          localStorage.setItem("creatoros_persona", options.expectedPersona);
          localStorage.setItem("creatoros_onboarding", JSON.stringify({
            persona: options.expectedPersona,
            onboarding_completed: true
          }));
        } catch (e) {}

        if (profile) {
          if (profile.selected_persona !== options.expectedPersona) {
            console.log(`[CreatorOS Auth] Adopting workspace persona: '${options.expectedPersona}'`);
            profile.selected_persona = options.expectedPersona;
            profile.onboarding_completed = true;

            // Background sync with database without blocking the UI
            const client = initClient();
            if (client && user) {
              client
                .from("profiles")
                .upsert({
                  id: user.id,
                  selected_persona: options.expectedPersona,
                  onboarding_completed: true,
                  updated_at: new Date().toISOString()
                })
                .then(() => {})
                .catch((err) => {
                  console.warn("[CreatorOS Auth] Background profile sync warning:", err && err.message);
                });
            }
          }
        }
      }

      return { user: user, profile: profile };
    },

    /**
     * Instant 1-Click Persona Switcher
     * Safely switches persona, persists to localStorage & Supabase, and navigates immediately without questions
     */
    switchPersona: async function (targetPersona) {
      const normalized = targetPersona === 'product_creator' ? 'product_builder' : (targetPersona === 'agency' ? 'advertiser' : targetPersona);
      const targetUrl = PERSONA_DASHBOARDS[normalized] || PERSONA_DASHBOARDS[targetPersona];
      if (!targetUrl) {
        console.error("[CreatorOS Auth] Unknown persona:", targetPersona);
        return;
      }

      try {
        localStorage.setItem("creatoros_persona", normalized);
        localStorage.setItem("creatoros_onboarding", JSON.stringify({
          persona: normalized,
          onboarding_completed: true
        }));
      } catch (e) {}

      const client = initClient();
      if (client) {
        try {
          const { data: { session } } = await client.auth.getSession();
          if (session && session.user) {
            await client.from("profiles").upsert({
              id: session.user.id,
              selected_persona: normalized,
              onboarding_completed: true,
              updated_at: new Date().toISOString()
            });
          }
        } catch (err) {
          console.warn("[CreatorOS Auth] Could not sync persona switch to Supabase:", err);
        }
      }

      window.location.href = targetUrl;
    },

    openPersonaSwitcher: function () {
      openUniversalPersonaModal();
    },

    PERSONA_DASHBOARDS: PERSONA_DASHBOARDS,
    PERSONA_META: PERSONA_META,

    /**
     * Subscribe to Auth State Changes
     */
    onAuthStateChange: function (callback) {
      const client = initClient();
      if (!client) return { unsubscribe: function () {} };
      const { data: { subscription } } = client.auth.onAuthStateChange(callback);
      return subscription;
    }
  };

  // Expose to global scope
  global.CreatorAuth = CreatorAuth;

  // Auto-initialize client if possible
  initClient();

  /* ==========================================================================
     UNIVERSAL QUICK PERSONA SWITCHER FOR ALL DASHBOARDS
     Ensures users can jump around between all 4 personas without questionnaire
     ========================================================================== */
  function openUniversalPersonaModal() {
    let existingModal = document.getElementById("creatorosPersonaModalRoot");
    if (existingModal) {
      existingModal.remove();
    }

    const currentSaved = (function () {
      try { return localStorage.getItem("creatoros_persona") || ""; } catch (e) { return ""; }
    })();

    const pathname = window.location.pathname.toLowerCase();
    let activeKey = "content_creator";
    if (pathname.includes("product")) activeKey = "product_builder";
    else if (pathname.includes("freelancer")) activeKey = "freelancer";
    else if (pathname.includes("advertis")) activeKey = "advertiser";
    else if (pathname.includes("creator")) activeKey = "content_creator";
    else if (currentSaved) activeKey = currentSaved;

    const overlay = document.createElement("div");
    overlay.id = "creatorosPersonaModalRoot";
    overlay.className = "cos-switcher-overlay";

    const cardsHtml = Object.keys(PERSONA_META).map(key => {
      const item = PERSONA_META[key];
      const isCurrent = key === activeKey;
      return `
        <button class="cos-persona-card ${isCurrent ? "is-active" : ""}" data-cos-persona="${key}">
          <div class="cos-card-icon" style="background:${item.badgeColor}22; color:${item.badgeColor}; border:1px solid ${item.badgeColor}55;">
            ${item.icon}
          </div>
          <div class="cos-card-info">
            <div class="cos-card-title-row">
              <span class="cos-card-title">${item.title}</span>
              ${isCurrent ? '<span class="cos-current-pill">Active</span>' : '<span class="cos-jump-pill">Jump →</span>'}
            </div>
            <span class="cos-card-sub">${item.sub}</span>
          </div>
        </button>
      `;
    }).join("");

    overlay.innerHTML = `
      <div class="cos-switcher-box" role="dialog" aria-modal="true" aria-label="Switch Persona">
        <div class="cos-switcher-head">
          <div class="cos-head-left">
            <span class="cos-pulse-dot"></span>
            <h4>Switch Workspace</h4>
          </div>
          <button class="cos-close-btn" id="cosCloseBtn" title="Close switcher" aria-label="Close">✕</button>
        </div>
        <p class="cos-switcher-hint">Instant 1-click jump between all CreatorOS workspaces. Zero questions required.</p>
        
        <div class="cos-persona-grid">
          ${cardsHtml}
        </div>

        <div class="cos-switcher-foot">
          <button class="cos-retake-btn" id="cosRetakeBtn">
            <span>⚙️ Reconfigure preferences through questionnaire</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector("#cosCloseBtn")?.addEventListener("click", function () {
      overlay.remove();
    });

    overlay.querySelectorAll("[data-cos-persona]").forEach(btn => {
      btn.addEventListener("click", function () {
        const target = this.getAttribute("data-cos-persona");
        overlay.remove();
        CreatorAuth.switchPersona(target);
      });
    });

    overlay.querySelector("#cosRetakeBtn")?.addEventListener("click", function () {
      overlay.remove();
      window.location.href = "persona.html?switch=true&retake=true";
    });

    const escListener = function (e) {
      if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", escListener);
      }
    };
    document.addEventListener("keydown", escListener);
  }

  function injectUniversalSwitcherStyles() {
    if (document.getElementById("creatorosSwitcherStyles")) return;
    const style = document.createElement("style");
    style.id = "creatorosSwitcherStyles";
    style.textContent = `
      .cos-switcher-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(4, 3, 10, 0.75);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: grid;
        place-items: center;
        padding: 16px;
        animation: cosFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .cos-switcher-box {
        width: 100%;
        max-width: 480px;
        background: #12101e;
        border: 1px solid rgba(139, 77, 255, 0.32);
        border-radius: 18px;
        padding: 22px;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.75), 0 0 35px rgba(139, 77, 255, 0.15);
        animation: cosPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        color: #f5f2ff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .cos-switcher-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .cos-head-left {
        display: flex;
        align-items: center;
        gap: 9px;
      }
      .cos-pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 8px #10b981;
      }
      .cos-switcher-head h4 {
        font-size: 16px;
        font-weight: 700;
        letter-spacing: -0.01em;
        margin: 0;
      }
      .cos-close-btn {
        background: none;
        border: none;
        color: #9d99b2;
        font-size: 15px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        transition: all 0.15s;
      }
      .cos-close-btn:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.08);
      }
      .cos-switcher-hint {
        font-size: 11.5px;
        color: #9d99b2;
        margin: 0 0 16px 0;
        line-height: 1.5;
      }
      .cos-persona-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .cos-persona-card {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px 14px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.035);
        border: 1px solid rgba(255, 255, 255, 0.09);
        color: #f5f2ff;
        text-align: left;
        cursor: pointer;
        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .cos-persona-card:hover {
        background: rgba(139, 77, 255, 0.16);
        border-color: rgba(139, 77, 255, 0.45);
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(139, 77, 255, 0.18);
      }
      .cos-persona-card.is-active {
        background: rgba(139, 77, 255, 0.18);
        border-color: rgba(139, 77, 255, 0.65);
      }
      .cos-card-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        font-size: 18px;
        flex: none;
      }
      .cos-card-info {
        flex: 1;
        min-width: 0;
      }
      .cos-card-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .cos-card-title {
        font-size: 13.5px;
        font-weight: 700;
        color: #fff;
      }
      .cos-card-sub {
        display: block;
        font-size: 11px;
        color: #9d99b2;
        margin-top: 2px;
      }
      .cos-current-pill {
        font-size: 9.5px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 2px 7px;
        border-radius: 999px;
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.35);
      }
      .cos-jump-pill {
        font-size: 10.5px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(139, 77, 255, 0.18);
        color: #c48eff;
        border: 1px solid rgba(139, 77, 255, 0.35);
        transition: all 0.15s;
      }
      .cos-persona-card:hover .cos-jump-pill {
        background: #8b4dff;
        color: #fff;
        border-color: #8b4dff;
      }
      .cos-switcher-foot {
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        text-align: center;
      }
      .cos-retake-btn {
        background: none;
        border: none;
        color: #9d99b2;
        font-size: 11.5px;
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s;
      }
      .cos-retake-btn:hover {
        color: #c48eff;
        background: rgba(139, 77, 255, 0.1);
      }
      .creatoros-universal-persona-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 13px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(139, 77, 255, 0.35);
        color: #f5f2ff;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        user-select: none;
      }
      .creatoros-universal-persona-btn:hover {
        background: rgba(139, 77, 255, 0.18);
        border-color: rgba(185, 139, 255, 0.7);
        box-shadow: 0 0 14px rgba(139, 77, 255, 0.35);
        transform: translateY(-1px);
      }
      @keyframes cosFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes cosPopIn { from { opacity: 0; transform: scale(0.96) translateY(6px); } to { opacity: 1; transform: none; } }
    `;
    document.head.appendChild(style);
  }

  function initUniversalPersonaSwitcher() {
    if (typeof document === "undefined") return;

    injectUniversalSwitcherStyles();

    const pathname = window.location.pathname.toLowerCase();
    const isDashboard = pathname.includes("creator.html") ||
      pathname.includes("product") ||
      pathname.includes("freelancer.html") ||
      pathname.includes("advertisor.html");

    // Intercept all "Switch Persona" clicks everywhere across all dashboards
    document.addEventListener("click", function (e) {
      const switchTarget = e.target.closest("#switchPersonaBtn, [data-action='switch-persona'], [data-testid='profile-menu-switch'], [data-testid='switch-persona-btn'], [data-testid='menu-profile-switch']");
      if (switchTarget) {
        e.preventDefault();
        e.stopPropagation();
        openUniversalPersonaModal();
      }
    }, true);

    // Keyboard shortcut Alt+P to toggle persona switcher
    document.addEventListener("keydown", function (e) {
      if (e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        openUniversalPersonaModal();
      }
    });

    // All dashboards (Product based, Freelancer, Advertisor, Creator) have their own integrated workspace switcher buttons.
    // The universal modal remains accessible via Alt+P or explicit [data-action="switch-persona"].
  }

  if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initUniversalPersonaSwitcher);
    } else {
      initUniversalPersonaSwitcher();
    }
  }

})(typeof window !== "undefined" ? window : global);
