chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "added-anime") {
    console.log("Popup : nouvel anime reçu", msg.anime);

    const anime = msg.anime;
    const el = createAnimeElement(anime);

    const animeListContainer = document.getElementById("anime-list");
    const animeHiddenListContainer =
      document.getElementById("hidden-anime-list");

    // si principal → liste principale
    if (anime.principal) {
      animeListContainer.prepend(el);
    } else {
      animeHiddenListContainer.prepend(el);
    }
  }
  // TODO
  if (msg.action === "edited-anime") {
    console.log("Popup : TODO nouvel modifications reçu", msg.anime);
  }
});

function redirectTo(url) {
  if (!url) return;
  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.create({ url });
  } else {
    window.open(url, "_blank");
  }
}

const toggleBtn = document.getElementById("hidden-btn");
const hiddenContent = document.getElementById("hidden-anime-list");

// bouton voir plus
toggleBtn.addEventListener("click", function (e) {
  e.preventDefault(); // empêche le reload

  if (
    hiddenContent.style.display === "none" ||
    hiddenContent.style.display === ""
  ) {
    hiddenContent.style.display = "block";
    toggleBtn.innerHTML = `Voir moins
                              <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                                <path d="M297.4 201.4C309.9 188.9 330.2 188.9 342.7 201.4L502.7 361.4C515.2 373.9 515.2 394.2 502.7 406.7C490.2 419.2 469.9 419.2 457.4 406.7L320 269.3L182.6 406.6C170.1 419.1 149.8 419.1 137.3 406.6C124.8 394.1 124.8 373.8 137.3 361.3L297.3 201.3z"/>
                              </svg>
  
    `;
  } else {
    hiddenContent.style.display = "none";
    toggleBtn.innerHTML = `Voir plus 
                            <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                                <path d="M297.4 438.6C309.9 451.1 330.2 451.1 342.7 438.6L502.7 278.6C515.2 266.1 515.2 245.8 502.7 233.3C490.2 220.8 469.9 220.8 457.4 233.3L320 370.7L182.6 233.4C170.1 220.9 149.8 220.9 137.3 233.4C124.8 245.9 124.8 266.2 137.3 278.7L297.3 438.7z"/>
                            </svg>
    `;
  }
});

// Crée dynamiquement un élément AnimeOverlay
function createAnimeElement(anime, watch) {
  console.log("creation anime element");
  const div = document.createElement("div");
  div.className = "AnimeOverlay";

  // si principal ajouter la classe
  if (anime.principal || anime.toWatch) {
    div.className = "AnimeOverlay principal";
  }

  // par default boutons desactiver
  let play = `<svg class="disabled" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M187.2 100.9C174.8 94.1 159.8 94.4 147.6 101.6C135.4 108.8 128 121.9 128 136L128 504C128 518.1 135.5 531.2 147.6 538.4C159.7 545.6 174.8 545.9 187.2 539.1L523.2 355.1C536 348.1 544 334.6 544 320C544 305.4 536 291.9 523.2 284.9L187.2 100.9z"/></svg>`;
  let next = `<svg class="disabled" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M149 100.8C161.9 93.8 177.7 94.5 190 102.6L448 272.1L448 128C448 110.3 462.3 96 480 96C497.7 96 512 110.3 512 128L512 512C512 529.7 497.7 544 480 544C462.3 544 448 529.7 448 512L448 367.9L190 537.5C177.7 545.6 162 546.3 149 539.3C136 532.3 128 518.7 128 504L128 136C128 121.3 136.1 107.8 149 100.8z"/></svg>`;

  // création du bouton play (non utilisé)
  if (anime.url) {
    play = `
            <!-- play button -->
            <a class="btn-play" data-url="${anime.url}"> 
                <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                    <path d="M187.2 100.9C174.8 94.1 159.8 94.4 147.6 101.6C135.4 108.8 128 121.9 128 136L128 504C128 518.1 135.5 531.2 147.6 538.4C159.7 545.6 174.8 545.9 187.2 539.1L523.2 355.1C536 348.1 544 334.6 544 320C544 305.4 536 291.9 523.2 284.9L187.2 100.9z"/>
                </svg>
            </a>
            `;
  }

  // création du bouton next
  if (anime.next) {
    next = `
            <!-- forward button -->
            <a class="btn-next" data-url="${anime.next}"> 
                <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M149 100.8C161.9 93.8 177.7 94.5 190 102.6L448 272.1L448 128C448 110.3 462.3 96 480 96C497.7 96 512 110.3 512 128L512 512C512 529.7 497.7 544 480 544C462.3 544 448 529.7 448 512L448 367.9L190 537.5C177.7 545.6 162 546.3 149 539.3C136 532.3 128 518.7 128 504L128 136C128 121.3 136.1 107.8 149 100.8z"/></svg>
            </a>
            `;
  }

  // création de l'item "anime"
  if (watch == true) {
    div.innerHTML = `
    <a class="anime-corp btn-play" data-url="${anime.url}"> 
      <div class="anime-title">${anime.alias || anime.title}</div>
    </a>
  `;
  } else {
    div.innerHTML = `
    <a class="anime-corp btn-play" data-url="${anime.url}"> 
      <div class="anime-title">${anime.alias || anime.title}</div>
      <div class="anime-episode">Épisode ${anime.episode || "??"}</div>
    </a>
    <div class="anime-btn">
      ${next}
    </div>
  `;
  }

  if (anime.nouveau) {
    div.innerHTML += `
    <a class="btn-new" data-anime="${anime.titre}">
      Nouveau
    </a>
  `;
  }

  return div;
}

// Attacher les boutons et remplir la liste au DOM
document.addEventListener("DOMContentLoaded", () => {
  console.log("Lancement popup");
  const animeContainer = document.getElementById("anime-conteneur");
  const watchContainer = document.getElementById("watch-conteneur");

  const animeListContainer = document.getElementById("anime-list");
  const watchListContainer = document.getElementById("watch-list");
  const animeHiddenListContainer = document.getElementById("hidden-anime-list");

  const btnSwitch1 = document.getElementById("btn-switch-1");
  const btnSwitch2 = document.getElementById("btn-switch-2");
  let switched = false;
  watchContainer.style.display = "none";

  // Boutons qui envoye a la liste
  document.getElementById("btn-redirect")?.addEventListener("click", (e) => {
    e.preventDefault();
    redirectTo("https://projet-mega.web.app/animes");
  });

  // boutons pour désactiver l'extension
  if (switched) {
    btnSwitch1.textContent = "◄ En cours";
    btnSwitch1.classList.add("btn-switch");

    btnSwitch2.textContent = "Watch list";
    btnSwitch2.classList.remove("btn-switch");
  } else {
    btnSwitch1.textContent = "En cours";
    btnSwitch1.classList.remove("btn-switch");

    btnSwitch2.textContent = "Watch list ►";
    btnSwitch2.classList.add("btn-switch");
  }

  btnSwitch1?.addEventListener("click", (e) => {
    e.preventDefault();
    if (switched) {
      switched = false;
      watchContainer.style.display = "none";
      animeContainer.style.display = "block";

      btnSwitch1.textContent = "En cours";
      btnSwitch1.classList.remove("btn-switch");

      btnSwitch2.textContent = "Watch list ►";
      btnSwitch2.classList.add("btn-switch");
    }
    return;
  });

  btnSwitch2?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!switched) {
      switched = true;
      watchContainer.style.display = "block";
      animeContainer.style.display = "none";

      btnSwitch1.textContent = "◄ En cours";
      btnSwitch1.classList.add("btn-switch");

      btnSwitch2.textContent = "Watch list";
      btnSwitch2.classList.remove("btn-switch");
    }
    return;
  });

  document.addEventListener("click", (e) => {
    // BTN PLAY
    const btnPlay = e.target.closest(".btn-play");
    if (btnPlay) {
      e.preventDefault();
      const url = btnPlay.dataset.url;
      if (url) {
        redirectTo(url);
      }
      return; // important pour éviter double traitement
    }

    // BTN NEXT
    const btnNext = e.target.closest(".btn-next");
    if (btnNext) {
      e.preventDefault();
      const url = btnNext.dataset.url;
      if (url) {
        redirectTo(url);
      }
    }

    const btnNew = e.target.closest(".btn-new");
    if (btnNew) {
      e.preventDefault();
      btnNew.display = "none";

      const anime = btnNext.dataset.anime;
      anime.nouveau = false;

      chrome.runtime.sendMessage({
        action: "updateAnime",
        data: anime,
      });
    }
  });

  // Récupère la liste depuis la DB de l'extension
  chrome.runtime.sendMessage({ action: "getAllAnime" }, (response) => {
    // si response recu on creer la liste
    if (response && response.status === "ok" && Array.isArray(response.data)) {
      let normals = false;
      response.data
        .slice()
        // tri par ordre croissance ancien -> recent
        .sort((a, b) => {
          return new Date(b.date) - new Date(a.date);
        })
        .forEach((anime) => {
          if (anime.toWatch === true) {
            const el = createAnimeElement(anime, true);
            watchListContainer.appendChild(el);
          } else {
            // affiche uniquement quand l'anime est en principal
            if (anime.principal) {
              const el = createAnimeElement(anime);
              animeListContainer.appendChild(el);
            } else {
              // ajout de l'anime a part si non principal
              normals = true;
              const el = createAnimeElement(anime);
              animeHiddenListContainer.appendChild(el);
            }
          }
          if (anime.nouveau == true) {
            chrome.runtime.sendMessage({
              action: "switchStatut",
              data: { title: anime.title, statut : "nouveau", value : false },
            });
          }
        });
      if (!normals) {
        toggleBtn.style.display = "none";
      }
      normals.forEach((anime) => {
        const el = createAnimeElement(anime);
        animeHiddenListContainer.appendChild(el);
      });
    } else {
      console.warn("Pas de réponse du background ou erreur", response);
    }
  });
});
