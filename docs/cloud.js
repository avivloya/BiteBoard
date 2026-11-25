// Snapspoon cloud: connects the website to Supabase for Google sign-in, saved data and AI estimates.
// The page (index.html) talks to a small interface, claude.use("db" | "user" | "sample" | "assets"),
// which the claude.ai preview provides. This file provides the same interface on the real website,
// so one page works in both places. With no settings in config.js it does nothing and the page
// keeps everything in this browser, as before.
(function () {
  "use strict";
  const cfg = window.SNAPSPOON_CONFIG || {};
  const on = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && window.supabase.createClient);
  const cloud = (window.SnapCloud = { configured: on, signedIn: false, email: null, error: null, signIn() {}, signOut() {} });
  if (!on || (window.claude && window.claude.use)) { cloud.configured = false; return; }

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
  });
  const AI_URL = cfg.aiUrl || cfg.supabaseUrl.replace(/\/$/, "") + "/functions/v1/ai";
  const CLIENT = Math.random().toString(36).slice(2, 12); // marks this tab's writes so they aren't applied twice
  const BACK = "snapspoon:back";
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let me = null;

  // Sign-in finishes here after Google sends you back (?code=...). Then the address bar is tidied up.
  const ready = sb.auth.getSession().then(({ data }) => data && data.session ? data.session.user : null).catch(() => null).then((u) => {
    const q = new URLSearchParams(location.search);
    if (q.has("error_description")) cloud.error = q.get("error_description");
    if (q.has("code") || q.has("error")) {
      ["code", "error", "error_code", "error_description", "state"].forEach((k) => q.delete(k));
      const s = q.toString();
      history.replaceState(null, "", location.pathname + (s ? "?" + s : "") + location.hash);
    }
    let back = null;
    try { back = sessionStorage.getItem(BACK); sessionStorage.removeItem(BACK); } catch (e) {}
    if (back && !location.hash) location.hash = back;
    me = u ? u.id : null;
    Object.assign(cloud, { signedIn: !!u, email: u ? u.email || null : null });
    if (cloud.error) setTimeout(() => window.toast && window.toast("Sign-in didn't finish: " + cloud.error), 600);
    return u;
  });
  cloud.ready = ready;
  cloud.signIn = async () => {
    try { sessionStorage.setItem(BACK, location.hash); } catch (e) {}
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
    if (error && window.toast) window.toast("Couldn't open Google sign-in. Try again.");
  };
  cloud.signOut = async () => { await sb.auth.signOut().catch(() => {}); location.reload(); };
  sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT" && me) location.reload(); });

  // ---------- AI (the "ai" Supabase Edge Function, same one the phone app uses) ----------
  async function ai(body) {
    const { data } = await sb.auth.getSession();
    const token = data && data.session && data.session.access_token;
    if (!token) { const x = new Error("Sign in with Google to use AI."); x.code = "signin"; x.userMessage = "Sign in with Google (Account › Settings) to use AI."; throw x; }
    let r;
    try {
      r = await fetch(AI_URL, { method: "POST", headers: { "Content-Type": "application/json", apikey: cfg.supabaseAnonKey, Authorization: "Bearer " + token }, body: JSON.stringify(body) });
    } catch (e) { const x = new Error("offline"); x.code = "network"; throw x; }
    let j = null;
    try { j = await r.json(); } catch (e) {}
    if (!r.ok) {
      const x = new Error((j && j.error) || "AI error " + r.status);
      x.code = r.status === 429 ? "rate_limited" : r.status === 400 && body.mode === "meal" ? "image_rejected" : "failed";
      if (j && j.error && r.status !== 429 && r.status < 500) x.userMessage = j.error; // e.g. "You've used your 3 free scans this week."
      throw x;
    }
    return j;
  }
  // Phone photos are big. Shrink to 1568px on the long side (what the AI reads anyway) and send as JPEG.
  function photo64(file) {
    return new Promise((ok, no) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const s = Math.min(1, 1568 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok({ data: c.toDataURL("image/jpeg", 0.85).split(",")[1], type: "image/jpeg" });
      };
      img.onerror = () => { URL.revokeObjectURL(url); const x = new Error("bad image"); x.code = "image_rejected"; no(x); };
      img.src = url;
    });
  }
  const sample = async (messages) => ({ text: ((await ai({ mode: "bitey", messages })) || {}).text || "" });
  sample.json = async (prompt, opts) => {
    if (opts && opts.images && opts.images.length) {
      const p = await photo64(opts.images[0]);
      return ai({ mode: "meal", imageBase64: p.data, mediaType: p.type });
    }
    const m = /Request: "([\s\S]*?)"\.\s*\n/.exec(prompt);
    return ai({ mode: "recipe", prompt: (m ? m[1] : prompt).slice(0, 500) });
  };
  sample.limits = async () => ({ images: true });

  // ---------- Photos and videos: your own folder in the recipe-photos bucket ----------
  const assets = {
    async upload(blob) {
      const ext = ((blob.type || "").split(/[/;+]/)[1] || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "bin";
      const path = `${me}/web/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await sb.storage.from("recipe-photos").upload(path, blob, { contentType: blob.type || undefined, upsert: false });
      if (error) throw error;
      return { url: sb.storage.from("recipe-photos").getPublicUrl(path).data.publicUrl };
    },
  };

  // ---------- Documents (the web_docs table, migration 0011) ----------
  // Paths look like "profiles/<id>" or "data/users/<id>/day-2026-11-25": everything before the last "/" is the collection.
  const T = "web_docs";
  const subs = {}; // collection -> Set of live listeners, so this tab's own writes update them too
  const fixErr = (e) => { const x = new Error(e.message || "save failed"); x.code = e.code === "23514" ? "quota_exceeded" : e.code; return x; };
  const keep = (rows) => rows.forEach((r) => (subs[r.collection] || new Set()).forEach((s) => s.rows.set(r.id, r)));
  async function upsert(rows) {
    if (!rows.length) return;
    keep(rows);
    const { error } = await sb.from(T).upsert(rows);
    if (error) throw fixErr(error);
  }
  // Messages are stored one row per conversation, so only the two people in it can read them.
  const msgTo = new Set();
  function setMessages(data) {
    const by = {};
    for (const m of (data && data.items) || []) if (m && UUID.test(m.to || "")) (by[m.to] = by[m.to] || []).push(m);
    const to = [...new Set([...msgTo, ...Object.keys(by)])];
    Object.keys(by).forEach((t) => msgTo.add(t));
    return upsert(to.map((t) => ({ collection: "messages", id: me + ">" + t, owner: me, recipient: t, data: { items: by[t] || [] }, client_id: CLIENT })));
  }
  function ref(col, id) {
    return {
      id,
      set(data) {
        if (col === "messages") return setMessages(data);
        return upsert([{ collection: col, id, owner: me, recipient: null, data: JSON.parse(JSON.stringify(data || {})), client_id: CLIENT }]);
      },
      async delete() {
        if (col === "messages") return setMessages({ items: [] });
        (subs[col] || new Set()).forEach((s) => s.rows.delete(id));
        const { error } = await sb.from(T).delete().eq("collection", col).eq("id", id);
        if (error) throw fixErr(error);
      },
    };
  }
  const docOf = (id, data) => ({ id, exists: true, data: () => data });
  function collection(col) {
    return {
      doc: (id) => ref(col, id),
      onSnapshot(cb, onErr) {
        const s = { rows: new Map() };
        let loaded = false, chan = null, stopped = false;
        const docsNow = () => {
          if (col !== "messages") return [...s.rows.values()].map((r) => docOf(r.id, r.data));
          const g = {};
          for (const r of s.rows.values()) {
            const from = r.owner || r.id.split(">")[0];
            (g[from] = g[from] || []).push(...((r.data && r.data.items) || []));
          }
          return Object.entries(g).map(([id, items]) => docOf(id, { items: items.sort((a, b) => (a.at || 0) - (b.at || 0)) }));
        };
        const emit = (changed, gone) => {
          const docs = docsNow();
          const changes = changed ? docs.filter((d) => changed.has(d.id)).map((d) => ({ type: "modified", doc: d })) : docs.map((d) => ({ type: "added", doc: d }));
          (gone || []).forEach((id) => { if (!docs.some((d) => d.id === id)) changes.push({ type: "removed", doc: docOf(id, {}) }); });
          try { cb({ docs, empty: docs.length === 0, size: docs.length, docChanges: () => changes }); } catch (e) { console.error(e); }
        };
        ready.then(async (u) => {
          if (stopped) return;
          if (!u) { onErr && onErr(new Error("not signed in")); return; }
          (subs[col] = subs[col] || new Set()).add(s);
          chan = sb.channel("docs-" + CLIENT + "-" + Math.random().toString(36).slice(2, 8))
            .on("postgres_changes", { event: "*", schema: "public", table: T, filter: "collection=eq." + col }, (p) => {
              const del = p.eventType === "DELETE", r = del ? p.old : p.new;
              if (!r || !r.id || (!del && r.client_id === CLIENT)) return; // our own write coming back
              if (del) s.rows.delete(r.id); else s.rows.set(r.id, r);
              if (!loaded) return;
              const key = col === "messages" ? (r.owner || r.id.split(">")[0]) : r.id;
              emit(new Set([key]), del ? [key] : []);
            })
            .subscribe();
          try {
            for (let from = 0; ; from += 1000) {
              const { data, error } = await sb.from(T).select("*").eq("collection", col).range(from, from + 999);
              if (error) throw error;
              data.forEach((r) => { s.rows.set(r.id, r); if (col === "messages" && r.owner === me && r.recipient) msgTo.add(r.recipient); });
              if (data.length < 1000) break;
            }
            loaded = true;
            if (!stopped) emit(null);
          } catch (e) { onErr && onErr(fixErr(e)); }
        });
        return () => { stopped = true; if (subs[col]) subs[col].delete(s); if (chan) sb.removeChannel(chan); };
      },
    };
  }
  const db = {
    collection,
    doc(path) { const i = path.lastIndexOf("/"); return ref(path.slice(0, i), path.slice(i + 1)); },
  };

  window.claude = {
    async use(name) {
      const u = await ready;
      if (name === "user") return { id: async () => (u ? u.id : null), email: async () => (u ? u.email : null) };
      if (!u) return null;
      if (name === "sample") return sample; // AI needs an account, so the free limit can be counted
      if (name === "db") return db;
      if (name === "assets") return assets;
      return null;
    },
  };
})();
