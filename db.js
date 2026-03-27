// db.js
const DB_NAME = "VoirAnimeDB";
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      let store;
      if (!db.objectStoreNames.contains("anime")) {
        store = db.createObjectStore("anime", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("title", "title", { unique: false });
      } else {
        store = e.target.transaction.objectStore("anime");
      }

      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (ev) => {
        const cursor = ev.target.result;
        if (!cursor) return;
        const value = cursor.value || {};
        if (typeof value.inProgress !== "boolean") value.inProgress = false;
        if (typeof value.scanAvailable !== "boolean")
          value.scanAvailable = false;
        if (typeof value.scanNotified !== "boolean") value.scanNotified = false;
        if (typeof value.lastScanAt !== "string") value.lastScanAt = "";
        if (typeof value.lastAvailableAt !== "string")
          value.lastAvailableAt = "";
        if (typeof value.predictedNextUrl !== "string")
          value.predictedNextUrl = "";
        cursor.update(value);
        cursor.continue();
      };
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

function safeSendMessage(msg) {
  chrome.runtime.sendMessage(msg, () => {
    if (chrome.runtime.lastError) return;
  });
}

function normalizeAnimeForInsert(anime, existing) {
  const out = { ...(existing || {}), ...(anime || {}) };
  out.title = out.title || "";
  out.url = out.url || "";
  out.alias = out.alias || "";
  out.nouveau = out.nouveau === true;
  out.principal = out.principal === true;
  out.toWatch = out.toWatch === true;
  if (typeof out.inProgress !== "boolean") out.inProgress = false;
  if (typeof out.scanAvailable !== "boolean") out.scanAvailable = false;
  if (typeof out.scanNotified !== "boolean") out.scanNotified = false;
  if (typeof out.lastScanAt !== "string") out.lastScanAt = "";
  if (typeof out.lastAvailableAt !== "string") out.lastAvailableAt = "";
  if (typeof out.predictedNextUrl !== "string") out.predictedNextUrl = "";
  return out;
}

async function addToWatch(anime) {
  const db = await openDB();
  const tx = db.transaction("anime", "readwrite");
  const store = tx.objectStore("anime");
  const index = store.index("title");
  if (!anime?.title || !anime?.url) return;

  const existing = await new Promise((resolve, reject) => {
    const request = index.get(anime.title);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
  if (existing) return;

  const prepared = normalizeAnimeForInsert(
    {
      ...anime,
      date: new Date(),
      nouveau: true,
      principal: false,
      toWatch: true,
      episode: 0,
    },
    null,
  );
  await new Promise((resolve, reject) => {
    const request = store.add(prepared);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
  safeSendMessage({ action: "added-anime", anime: prepared });
  safeSendMessage({ action: "extension-data-changed", reason: "added-anime" });
  updateBadge();
}

async function addAnimeToDB(anime) {
  const db = await openDB();
  const tx = db.transaction("anime", "readwrite");
  const store = tx.objectStore("anime");
  const index = store.index("title");
  if (!anime?.title || !anime?.url) return;

  const existing = await new Promise((resolve, reject) => {
    const request = index.get(anime.title);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });

  const prepared = normalizeAnimeForInsert(
    {
      ...anime,
      date: new Date(),
      principal: true,
      toWatch: false,
      scanAvailable: false,
      scanNotified: false,
    },
    existing,
  );

  if (existing) {
    prepared.id = existing.id;
    prepared.alias = existing.alias || prepared.alias;
    prepared.nouveau = false;
    await new Promise((resolve, reject) => {
      const request = store.put(prepared);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
    safeSendMessage({ action: "edited-anime", anime: prepared });
    safeSendMessage({
      action: "extension-data-changed",
      reason: "edited-anime",
    });
    flashIcon();
  } else {
    prepared.nouveau = true;
    await new Promise((resolve, reject) => {
      const request = store.add(prepared);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
    safeSendMessage({ action: "added-anime", anime: prepared });
    safeSendMessage({
      action: "extension-data-changed",
      reason: "added-anime",
    });
  }
  updateBadge();
}

async function updateAnime(anime) {
  const db = await openDB();
  const tx = db.transaction("anime", "readwrite");
  const store = tx.objectStore("anime");
  const index = store.index("title");

  let existing = null;
  if (anime?.id !== undefined && anime?.id !== null) {
    existing = await new Promise((resolve, reject) => {
      const request = store.get(anime.id);
      request.onsuccess = (e) => resolve(e.target.result || null);
      request.onerror = (e) => reject(e.target.error);
    });
  }
  if (!existing && anime?.title) {
    existing = await new Promise((resolve, reject) => {
      const request = index.get(anime.title);
      request.onsuccess = (e) => resolve(e.target.result || null);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  const prepared = normalizeAnimeForInsert(
    { ...anime, nouveau: false },
    existing,
  );
  if (existing?.id !== undefined) prepared.id = existing.id;

  await new Promise((resolve, reject) => {
    const request = store.put(prepared);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });

  safeSendMessage({ action: "edited-anime", anime: prepared });
  safeSendMessage({ action: "extension-data-changed", reason: "edited-anime" });
  updateBadge();
  flashIcon();
}

async function deleteAnime(anime) {
  const db = await openDB();
  const tx = db.transaction("anime", "readwrite");
  const store = tx.objectStore("anime");
  const index = store.index("title");
  const existing = await new Promise((resolve, reject) => {
    const request = index.get(anime.title);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
  if (existing) {
    store.delete(existing.id);
    safeSendMessage({
      action: "extension-data-changed",
      reason: "deleted-anime",
    });
  }
  return tx.complete;
}

async function getAllAnime() {
  const db = await openDB();
  const tx = db.transaction("anime", "readonly");
  const store = tx.objectStore("anime");
  return new Promise((resolve) => {
    const result = [];
    store.openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        result.push(cursor.value);
        cursor.continue();
      } else {
        resolve(result);
      }
    };
  });
}

async function switchStatut(title, statut, value) {
  const db = await openDB();
  const tx = db.transaction("anime", "readwrite");
  const store = tx.objectStore("anime");
  const index = store.index("title");
  const anime = await new Promise((resolve, reject) => {
    const request = index.get(title);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (!anime) return;

  switch (statut) {
    case "nouveau":
      anime.nouveau = value;
      break;
    case "toWatch":
      anime.toWatch = value;
      break;
    case "principal":
      anime.principal = value;
      break;
    default:
      return;
  }
  store.put(anime);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
  updateBadge();
}

async function setAnimeInProgress(title, value) {
  const db = await openDB();
  const tx = db.transaction("anime", "readwrite");
  const store = tx.objectStore("anime");
  const index = store.index("title");
  const anime = await new Promise((resolve, reject) => {
    const request = index.get(title);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  if (!anime) return false;

  anime.inProgress = value === true;
  if (!anime.inProgress) {
    anime.scanAvailable = false;
    anime.scanNotified = false;
    anime.lastAvailableAt = "";
  }
  store.put(anime);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
  safeSendMessage({
    action: "extension-data-changed",
    reason: "in-progress-changed",
  });
  return true;
}

function predictNextEpisodeUrl(currentUrl) {
  try {
    const u = new URL(currentUrl);
    const match = u.pathname.match(
      /^(.*\/)([^/]+?)-(\d+)(-(?:vf|vostfr))\/?$/i,
    );
    if (!match) return null;
    const baseDir = match[1];
    const slug = match[2];
    const epRaw = match[3];
    const suffix = match[4] || "";
    const nextEp = String(Number(epRaw) + 1).padStart(epRaw.length, "0");
    u.pathname = `${baseDir}${slug}-${nextEp}${suffix}`;
    return u.toString();
  } catch {
    return null;
  }
}
async function checkEpisodeUrlAvailable(url) {
  if (!url) {
    console.log("Background db : check aborted (no URL)");
    return false;
  }

  try {
    console.log("Background db : checking (GET)", url);

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    console.log("Background db : status", response.status);

    if (!response.ok) {
      console.log("Background db : response not OK");
      return false;
    }

    const text = await response.text();

    // 🔍 Debug rapide
    console.log("Background db : content length", text.length);
    console.log("Background db : preview", text.slice(0, 200));

    // ❌ Cas erreurs classiques
    if (/404|not found|introuvable|aucun résultat/i.test(text)) {
      console.log("Background db : detected error keywords");
      return false;
    }

    // 🔥 Détection réelle (important)
    if (
      text.includes("iframe") ||
      text.includes("video") ||
      text.includes("player")
    ) {
      console.log("Background db : player detected → AVAILABLE");
      return true;
    }

    // ⚠️ fallback
    console.log("Background db : no player detected → NOT available");
    return false;
  } catch (error) {
    console.error("Background db : fetch failed", error);
    return false;
  }
}
async function scanAnime(anime) {
  console.log("Background db : scanAnime called", anime);

  if (!anime?.title) {
    console.log("Background db : scan aborted (no title)");
    return { updated: false, available: false };
  }

  const db = await openDB();
  console.log("Background db : DB opened");

  // 🔹 1. Lecture
  let existing;
  try {
    const tx = db.transaction("anime", "readonly");
    const store = tx.objectStore("anime");
    const index = store.index("title");

    console.log("Background db : searching anime in DB", anime.title);

    existing = await new Promise((resolve, reject) => {
      const request = index.get(anime.title);

      request.onsuccess = () => {
        console.log("Background db : DB result", request.result);
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error("Background db : DB read error", request.error);
        reject(request.error);
      };
    });
  } catch (err) {
    console.error("Background db : transaction read failed", err);
    return { updated: false, available: false };
  }

  if (!existing) {
    console.log("Background db : anime not found in DB");
    return { updated: false, available: false };
  }

  if (existing.inProgress !== true) {
    console.log("Background db : anime not in progress");
    return { updated: false, available: false };
  }

  if (existing.toWatch === true) {
    console.log("Background db : anime marked as toWatch");
    return { updated: false, available: false };
  }

  // 🔹 2. Prédiction URL
  const predicted = predictNextEpisodeUrl(existing.url || "");
  console.log("Background db : predicted URL", predicted);

  existing.predictedNextUrl = predicted || "";
  existing.lastScanAt = new Date().toISOString();

  // 🔹 3. Vérification disponibilité
  let available = false;

  if (predicted) {
    try {
      console.log("Background db : checking episode availability...");
      available = await checkEpisodeUrlAvailable(predicted);
      console.log("Background db : availability result", available);
    } catch (err) {
      console.error("Background db : availability check failed", err);
    }
  } else {
    console.log("Background db : no predicted URL, skipping check");
  }

  existing.scanAvailable = available;

  if (available) {
    console.log("Background db : episode is AVAILABLE");

    existing.lastAvailableAt = new Date().toISOString();

    if (!existing.next) {
      existing.next = predicted;
      console.log("Background db : next episode set", predicted);
    }
  } else {
    console.log("Background db : episode NOT available");
    existing.scanNotified = false;
  }

  // 🔹 4. Écriture
  try {
    console.log("Background db : writing to DB...");

    const tx = db.transaction("anime", "readwrite");
    const store = tx.objectStore("anime");

    store.put(existing);

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        console.log("Background db : write transaction complete");
        resolve();
      };
      tx.onerror = (e) => {
        console.error("Background db : write transaction error", e);
        reject(e);
      };
    });
  } catch (err) {
    console.error("Background db : write failed", err);
    return { updated: false, available: false };
  }

  console.log("Background db : scanAnime finished", {
    available,
    anime: existing,
  });

  return { updated: true, available, anime: existing };
}

async function scanPendingAnimes() {
  const animes = await getAllAnime();
  const pending = animes.filter(
    (a) => a.inProgress === true && a.toWatch !== true,
  );
  const results = [];
  for (const anime of pending) {
    // eslint-disable-next-line no-await-in-loop
    const result = await scanAnime(anime);
    if (result.updated) results.push(result);
  }
  return results;
}

async function notifyAvailableEpisodes(scanResults) {
  const available = scanResults
    .filter((r) => r.available && r.anime && r.anime.scanNotified !== true)
    .map((r) => r.anime);
  if (available.length === 0) return 0;

  const db = await openDB();
  const tx = db.transaction("anime", "readwrite");
  const store = tx.objectStore("anime");
  for (const anime of available) {
    anime.scanNotified = true;
    store.put(anime);
  }
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title:
      available.length === 1
        ? "Nouvel épisode disponible"
        : `${available.length} épisodes disponibles`,
    message:
      available.length === 1
        ? available[0].title
        : available
            .slice(0, 3)
            .map((a) => a.title)
            .join(", "),
    priority: 1,
  });

  chrome.tabs.query({ url: "https://v6.voiranime.com/*" }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) chrome.tabs.sendMessage(tab.id, { action: "PlayNotifSound" });
    }
  });

  safeSendMessage({
    action: "scan-available",
    count: available.length,
    animes: available,
  });
  safeSendMessage({
    action: "extension-data-changed",
    reason: "scan-available",
  });
  flashIcon();
  return available.length;
}

async function scanAndNotifyAvailable() {
  const results = await scanPendingAnimes();
  const notified = await notifyAvailableEpisodes(results);
  return { scanned: results.length, notified };
}
