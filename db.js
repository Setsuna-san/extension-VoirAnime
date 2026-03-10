// db.js
const DB_NAME = "VoirAnimeDB";
const DB_VERSION = 1;

/**
 * Ouvre la base IndexedDB
 * @returns {Promise<IDBDatabase>} Base de données ouverte
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("anime")) {
        const store = db.createObjectStore("anime", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("title", "title", { unique: false });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Envoi sécurisé d'un message vers le popup
 * Ignore les erreurs si le popup n'est pas ouvert
 */
function safeSendMessage(msg) {
  chrome.runtime.sendMessage(msg, (response) => {
    if (chrome.runtime.lastError) return; // popup fermée → on ignore
    return response;
  });
}

/**
 * Ajoute un anime dans la catégorie "À voir".
 *
 * Conventions :
 * - Recherche par `title` via un index IndexedDB.
 * - Initialise automatiquement les propriétés métier.
 * - N'ajoute PAS l'anime s'il existe déjà.
 *
 * @async
 * @function addToWatch
 *
 * @param {Object} anime - Objet anime à enregistrer.
 * @param {string} anime.title - Titre exact de l’anime (non slugifié). Utilisé comme clé de recherche.
 * @param {string} anime.url - URL principale de l’anime.
 * @param {string} [anime.next] - (Optionnel) URL de l’épisode suivant.
 *
 * @returns {Promise<void>} Transaction complétée.
 *
 * @property {Date} anime.date - Date d’ajout (assignée automatiquement).
 * @property {boolean} anime.nouveau - Défini à true lors de l’ajout.
 * @property {boolean} anime.principal - Défini à false par défaut.
 * @property {boolean} anime.toWatch - Défini à true automatiquement.
 * @property {number} anime.episode - Initialisé à 0.
 */
async function addToWatch(anime) {
  const db = await openDB();
  const tx = db.transaction("anime", "readwrite");
  const store = tx.objectStore("anime");
  const index = store.index("title");
  console.log("DB : start addToWatch" + anime.title + " et " + anime.url);

  if (!anime?.title || !anime?.url) return;

  console.log("DB : step 1 addToWatch");

  const existing = await new Promise((resolve, reject) => {
    const request = index.get(anime.title);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });

  if (existing) {
    console.log("Anime déjà enregistré");
    return;
  }

  console.log("DB : step 2 addToWatch");

  anime.date = new Date();
  anime.nouveau = true;
  anime.principal = false;
  anime.toWatch = true;
  anime.episode = 0;

  await new Promise((resolve, reject) => {
    const request = store.add(anime);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });

  console.log("DB : step 3 addToWatch");

  console.log(`Anime "${anime.title}" ajouté en catégorie A voir`);

  // 🔥 Notifie le popup
  safeSendMessage({
    action: "added-anime",
    anime: anime,
  });
  updateBadge();

  console.log("DB : End addToWatch");

  return tx.complete;
}

/**
 * Ajoute ou met a jour un animé.
 *
 * Conventions :
 * - Recherche par `title` via un index IndexedDB.
 * - Initialise automatiquement les propriétés métier.
 * - Met à jour si l'animé existe deja.
 *
 * @async
 * @function addAnimeToDB
 *
 * @param {Object} anime - Objet anime à enregistrer.
 * @param {string} anime.title - Titre exact de l’anime (non slugifié). Utilisé comme clé de recherche.
 * @param {string} anime.url - URL de l'episode actuel.
 * @param {number} anime.episode - Numéro de l'épisode actuel.
 * @param {string} [anime.next] - (Optionnel) URL de l’épisode suivant.
 *
 * @returns {Promise<void>} Transaction complétée.
 *
 * @property {Date} anime.date - Date d’ajout (assignée automatiquement).
 * @property {boolean} anime.nouveau - Défini à true lors de l’ajout.
 * @property {boolean} anime.principal - Défini à true par défaut.
 * @property {boolean} anime.toWatch - Défini à false automatiquement.
 */
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

  anime.date = new Date();
  anime.nouveau = true;
  anime.principal = true;
  anime.toWatch = false;

  if (existing) {
    // On met à jour l'enregistrement existant
    anime.id = existing.id;
    anime.alias = existing.alias;
    anime.nouveau = false;

    await new Promise((resolve, reject) => {
      const request = store.put(anime);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });

    console.log(
      `Anime "${anime.title}" mis à jour à l'épisode ${anime.episode}`,
    );

    safeSendMessage({
      action: "edited-anime",
      anime: anime,
    });
    flashIcon();
  } else {
    await new Promise((resolve, reject) => {
      const request = store.add(anime);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });

    console.log(
      `Anime "${anime.title}" ajouté avec l'épisode ${anime.episode}`,
    );

    safeSendMessage({
      action: "added-anime",
      anime: anime,
    });
  }
  updateBadge();

  return tx.complete;
}

/**
 * Met a jour un anime.
 *
 * /!\ Attention /!\
 * Utiliser uniquement depuis une app externe, remplace plusieurs champs sans regle fixe
 *
 * Conventions :
 * - Recherche par `title` via un index IndexedDB.
 * - Initialise automatiquement les propriétés métier.
 * - N'ajoute PAS l'anime s'il existe déjà.
 *
 * @async
 * @function updateAnime
 *
 * @param {Object} anime - Objet anime à modifier.
 *
 * @returns {Promise<void>} Transaction complétée.
 *
 * @property {boolean} anime.nouveau - Défini à false automatiquement.
 */
async function updateAnime(anime) {
  console.log("BD : start update");
  const db = await openDB();
  const tx = db.transaction("anime", "readwrite");
  const store = tx.objectStore("anime");

  anime.nouveau = false;

  await new Promise((resolve, reject) => {
    const request = store.put(anime);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });

  console.log(`Anime "${anime.title}" mis à jour à l'épisode ${anime.episode}`);

  safeSendMessage({
    action: "edited-anime",
    anime: anime,
  });
  updateBadge();
  flashIcon();

  console.log("BD : end update");
  return tx.complete;
}

/**
 * Supprime un anime
 */
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
    anime.id = existing.id;
    store.delete(anime.id);
    console.log(`Anime "${anime.title}" supprimé`);
  } else {
    console.log(`Anime "${anime.title}" non trouvé`);
  }

  return tx.complete;
}

/**
 * Récupère tous les anime
 */
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

/**
 * Retire le(s) statuts
 */
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

  console.log("Anime trouvé :", anime);

  if (!anime) {
    console.log("Anime introuvable");
    return;
  }

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
      console.log("Statut inconnu :", statut);
      return;
  }

  store.put(anime);

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
  updateBadge();


  console.log("BD : end switch");
}
