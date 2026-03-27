const state = {
  switched: false,
  animes: [],
};

function redirectTo(url) {
  if (!url) return;
  chrome.tabs.create({ url });
}

function elapsed(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  const diff = Date.now() - d.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return "0m";
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const days = Math.floor(h / 24);
  if (days > 0) return `${days}j`;
  if (h > 0) return `${h}h${m % 60}m`;
  return `${m}m`;
}

function setScanInfo(message, type = "info") {
  const el = document.getElementById("scan-info");
  if (!el) return;
  el.textContent = message || "";
  el.className = `scan-info ${type}`;
}

function createAnimeElement(anime, watch = false) {
  const div = document.createElement("div");
  div.className = `AnimeOverlay ${anime.principal || anime.toWatch ? "principal" : ""}`;
  div.dataset.title = anime.title || "";

  const scanBadge = anime.inProgress
    ? anime.scanAvailable
      ? `<span class="scan-badge available">Épisode dispo</span>`
      : `<span class="scan-badge waiting">En attente (${elapsed(anime.date)})</span>`
    : "";

  const scanAction = watch
    ? ""
    : `<button class="btn-scan" data-action="scan-now" title="Scanner maintenant">Scan</button>`;

  const followToggle = watch
    ? ""
    : `<button class="btn-follow ${anime.inProgress ? "active" : ""}" data-action="toggle-follow" title="Surveiller cet animé">En cours</button>`;

  const next = anime.next
    ? `<a class="btn-next" data-url="${anime.next}">
         <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M149 100.8C161.9 93.8 177.7 94.5 190 102.6L448 272.1L448 128C448 110.3 462.3 96 480 96C497.7 96 512 110.3 512 128L512 512C512 529.7 497.7 544 480 544C462.3 544 448 529.7 448 512L448 367.9L190 537.5C177.7 545.6 162 546.3 149 539.3C136 532.3 128 518.7 128 504L128 136C128 121.3 136.1 107.8 149 100.8z"/></svg>
       </a>`
    : "";

  div.innerHTML = `
    <a class="anime-corp btn-play" data-url="${anime.url}">
      <div class="anime-title">${anime.alias || anime.title}</div>
      ${watch ? "" : `<div class="anime-episode">Épisode ${anime.episode || "??"}</div>`}
      ${scanBadge}
    </a>
    <div class="anime-btn">
      ${followToggle}
      ${scanAction}
      ${next}
    </div>
  `;

  if (anime.nouveau) {
    div.innerHTML += `<a class="btn-new" data-action="mark-old">Nouveau</a>`;
  }

  return div;
}

function renderLists() {
  const animeListContainer = document.getElementById("anime-list");
  const watchListContainer = document.getElementById("watch-list");
  const hiddenListContainer = document.getElementById("hidden-anime-list");
  const toggleBtn = document.getElementById("hidden-btn");

  animeListContainer.innerHTML = "";
  watchListContainer.innerHTML = "";
  hiddenListContainer.innerHTML = "";

  const sorted = [...state.animes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const hidden = [];
  sorted.forEach((anime) => {
    if (anime.toWatch === true) {
      watchListContainer.appendChild(createAnimeElement(anime, true));
      return;
    }
    if (anime.principal) animeListContainer.appendChild(createAnimeElement(anime, false));
    else hidden.push(anime);
  });

  hidden.forEach((anime) => hiddenListContainer.appendChild(createAnimeElement(anime, false)));
  toggleBtn.style.display = hidden.length ? "flex" : "none";
}

function refreshData() {
  chrome.runtime.sendMessage({ action: "getAllAnime" }, (response) => {
    if (!(response && response.status === "ok" && Array.isArray(response.data))) return;
    state.animes = response.data;
    renderLists();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const animeContainer = document.getElementById("anime-conteneur");
  const watchContainer = document.getElementById("watch-conteneur");
  const btnSwitch1 = document.getElementById("btn-switch-1");
  const btnSwitch2 = document.getElementById("btn-switch-2");
  const hiddenContent = document.getElementById("hidden-anime-list");
  const hiddenBtn = document.getElementById("hidden-btn");

  watchContainer.style.display = "none";
  hiddenBtn.addEventListener("click", (e) => {
    e.preventDefault();
    hiddenContent.style.display = hiddenContent.style.display === "block" ? "none" : "block";
  });

  btnSwitch1.addEventListener("click", (e) => {
    e.preventDefault();
    state.switched = false;
    watchContainer.style.display = "none";
    animeContainer.style.display = "block";
    btnSwitch1.classList.remove("btn-switch");
    btnSwitch2.classList.add("btn-switch");
  });

  btnSwitch2.addEventListener("click", (e) => {
    e.preventDefault();
    state.switched = true;
    watchContainer.style.display = "block";
    animeContainer.style.display = "none";
    btnSwitch1.classList.add("btn-switch");
    btnSwitch2.classList.remove("btn-switch");
  });

  document.getElementById("btn-redirect")?.addEventListener("click", (e) => {
    e.preventDefault();
    redirectTo("https://projet-mega.web.app/animes");
  });

  document.addEventListener("click", (e) => {
    const play = e.target.closest(".btn-play");
    if (play) {
      e.preventDefault();
      redirectTo(play.dataset.url);
      return;
    }

    const next = e.target.closest(".btn-next");
    if (next) {
      e.preventDefault();
      redirectTo(next.dataset.url);
      return;
    }

    const overlay = e.target.closest(".AnimeOverlay");
    const title = overlay?.dataset?.title;
    if (!title) return;

    const anime = state.animes.find((a) => a.title === title);
    if (!anime) return;

    const follow = e.target.closest("[data-action='toggle-follow']");
    if (follow) {
      e.preventDefault();
      const nextValue = !(anime.inProgress === true);
      chrome.runtime.sendMessage(
        { action: "setInProgress", data: { title: anime.title, value: nextValue } },
        () => refreshData(),
      );
      return;
    }

    const scanNow = e.target.closest("[data-action='scan-now']");
    if (scanNow) {
      e.preventDefault();
      setScanInfo(`Scan en cours: ${anime.title}...`, "info");
      chrome.runtime.sendMessage({ action: "scanAnime", data: anime }, (response) => {
        refreshData();
        if (response?.result?.available) {
          setScanInfo(`Nouvel épisode détecté pour ${anime.title}`, "success");
        } else {
          setScanInfo(`Rien de nouveau pour ${anime.title}`, "muted");
        }
      });
      return;
    }

    const markOld = e.target.closest("[data-action='mark-old']");
    if (markOld) {
      e.preventDefault();
      chrome.runtime.sendMessage({
        action: "switchStatut",
        data: { title: anime.title, statut: "nouveau", value: false },
      });
    }
  });

  chrome.runtime.sendMessage({ action: "scanPendingAnimes" }, () => {
    refreshData();
  });
  refreshData();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (
    msg.action === "added-anime" ||
    msg.action === "edited-anime" ||
    msg.action === "extension-data-changed"
  ) {
    refreshData();
  }

  if (msg.action === "scan-available") {
    setScanInfo(
      msg.count > 1
        ? `${msg.count} épisodes disponibles`
        : "1 épisode disponible",
      "success",
    );
    refreshData();
  }
});
