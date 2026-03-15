console.log("Lancement contentHub.js");

function playNotifSound() {
  console.log("Background : play sound notif");
  const audio = new Audio(chrome.runtime.getURL("./Sounds/notif2.mp3"));
  audio.play();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "GET_LINK_TITLE") {
    console.log("ContentHub : get title called with " + msg.linkUrl);

    const links = document.querySelectorAll(`a[href="${msg.linkUrl}"]`);

    if (!links.length) {
      sendResponse({ title: "Titre inconnu" });
      return;
    }

    let link = links[0];

    console.log("Id du lien : " + link.id);

    if (link.id === "btn-read-last" || link.id === "btn-read-first") {
    }
    if (links[0].className == "asp_res_image_url") {
      link = links[1];
    }

    const title =
      link.getAttribute("title")?.trim() ||
      link.textContent?.trim() ||
      "Titre inconnu";

    sendResponse({ title });
  }

  if (msg.action === "PlayNotifSound") {
    playNotifSound();
  }
});

const breadcrumb = document.querySelectorAll(".breadcrumb li");
const boutons = document.getElementById("init-links");

const animeConteneur = document.querySelector(".c-blog-listing");

if (breadcrumb.length == 3 && boutons) {
  const style = document.createElement("style");

  style.textContent = `
  .c-btn_watch {
    background-color: transparent;
    color: #7289da ;
    border: 3px solid #7289da ;
    padding : 8px ; 
    margin : 5px;
    transition : 0.4s ;
  }

  .c-btn_watch:hover {
    background-color: #7289da;
    color: #fff !important ;
  }
`;

  const btn = document.createElement("a");
  btn.href = "#";
  btn.id = "btn-add-watch";
  btn.className = "c-btn c-btn_watch";
  btn.textContent = "Watch list";

  boutons.appendChild(btn);

  boutons.appendChild(style);

  btn?.addEventListener("click", (e) => {
    e.preventDefault();

    const titre = document.getElementsByClassName("post-title")[0].textContent;

    const anime = {
      title: titre.trim(),
      url: window.location.href,
    };

    console.log('ContentHub : manual add anime "to watch" : ' + anime.title);
    chrome.runtime.sendMessage({
      action: "addAnimeToWatch",
      data: anime,
    });
  });
}

function injectBookmark(
  itemElement,
  title,
  link,
  isSaved,
  favFull,
  favEmpty,
  animeByTitle,
) {
  if (!itemElement || !title) return;

  const target =
    itemElement.querySelector(".meta-item") ||
    itemElement.querySelector(".asp_content h3") ||
    itemElement;

  if (target !== itemElement) {
    target.style.display = "flex";
    target.style.alignItems = "center";
  }

  const existingIcon = target.querySelector(".fav-icon");
  if (existingIcon) existingIcon.remove();

  const icon = document.createElement("img");
  icon.className = `fav-icon ${isSaved ? "fav-full" : "fav-empty"}`;
  icon.src = isSaved ? favFull : favEmpty;
  icon.alt = isSaved ? "favori plein" : "favori vide";
  icon.style.width = "1.2em";
  icon.style.cursor = "pointer";
  icon.style.marginRight = "5px";
  icon.style.zIndex = "10";
  icon.style.position = "relative";

  icon.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();
    const currentlySaved = icon.classList.contains("fav-full");
    const nextSaved = !currentlySaved;

    icon.classList.toggle("fav-full", nextSaved);
    icon.classList.toggle("fav-empty", !nextSaved);
    icon.src = nextSaved ? favFull : favEmpty;

    const anime = { title, url: link || window.location.href };
    if (nextSaved) {
      chrome.runtime.sendMessage({ action: "addAnimeToWatch", data: anime });
      animeByTitle[title] = anime;
    } else {
      chrome.runtime.sendMessage({ action: "deleteAnime", data: anime });
      delete animeByTitle[title];
    }
  });

  target.prepend(icon);
}

if (animeConteneur) {
  console.log("Content hub : page multi anime détecté");

  const favFull = chrome.runtime.getURL("Icons/favFull.svg");
  const favEmpty = chrome.runtime.getURL("Icons/favEmpty.svg");

  const style = document.createElement("style");
  style.textContent = `
  .fav-icon {
    width: 1.5em;
    cursor: pointer;
    margin-right: 5px;
    transition: 0.2s;
  }
  .fav-full { filter:none; }
  .fav-empty { filter:grayscale(100%); opacity:0.6; }
  .fav-icon:hover { transform:scale(1.2); }
`;
  document.head.appendChild(style);

  const animesNotes = document.querySelectorAll(".item-summary");
  let animeByTitle = {};

  function getSearchItems() {
    return Array.from(
      document.querySelectorAll(
        ".asp_r_pagepost.item, .item.asp_r_pagepost, .results .item, .item-summary",
      ),
    ).filter((item) =>
      Boolean(item.querySelector(".asp_res_url, .post-title a")),
    );
  }

  function renderSearchBookmarks() {
    getSearchItems().forEach((itemElement) => {
      const titleEl = itemElement.querySelector(".asp_res_url, .post-title a");
      const title = titleEl?.textContent?.trim();
      if (!title) return;

      const link =
        titleEl.closest("a")?.href ||
        itemElement.querySelector("a")?.href ||
        window.location.href;
      const isSaved = Boolean(animeByTitle[title]);
      const alreadyInjected = itemElement.dataset.bookmarkInjected === "true";

      if (!alreadyInjected) {
        injectBookmark(
          itemElement,
          title,
          link,
          isSaved,
          favFull,
          favEmpty,
          animeByTitle,
        );
        itemElement.dataset.bookmarkInjected = "true";
      } else {
        const icon = itemElement.querySelector(".fav-icon");
        if (icon) {
          icon.classList.toggle("fav-full", isSaved);
          icon.classList.toggle("fav-empty", !isSaved);
          icon.src = isSaved ? favFull : favEmpty;
        }
      }
    });
  }

  function observeAjaxResults() {
    const root = document.querySelector("body");
    let renderTimeout;
    const observer = new MutationObserver((mutations) => {
      let shouldRender = false;
      for (const mutation of mutations) {
        if (mutation.type !== "childList") continue;
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches(".asp_r_pagepost, .item, .results")) {
            shouldRender = true;
            break;
          }
          if (
            node.querySelector &&
            node.querySelector(".asp_r_pagepost, .item, .results")
          ) {
            shouldRender = true;
            break;
          }
        }
        if (shouldRender) break;
      }
      if (shouldRender) {
        clearTimeout(renderTimeout);
        renderTimeout = setTimeout(renderSearchBookmarks, 60);
      }
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  chrome.runtime.sendMessage({ action: "getAllAnime" }, (response) => {
    if (
      !(response && response.status === "ok" && Array.isArray(response.data))
    ) {
      console.warn("Pas de réponse du background ou erreur", response);
      return;
    }

    response.data.forEach((anime) => {
      if (anime?.title) animeByTitle[anime.title] = anime;
    });

    animesNotes.forEach((element) => {
      const titleElement = element.querySelector(".post-title a");
      if (!titleElement) return;
      const title = titleElement.textContent?.trim();
      if (!title) return;
      const link = titleElement.href;
      const metaItem = element.querySelector(".meta-item");
      if (!metaItem) return;

      metaItem.style.display = "flex";
      injectBookmark(
        metaItem,
        title,
        link,
        Boolean(animeByTitle[title]),
        favFull,
        favEmpty,
        animeByTitle,
      );
    });

    const searchInputs = document.querySelectorAll('input[type="search"]');
    let debounceTimeout;
    searchInputs.forEach((input) => {
      input.addEventListener("input", () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(renderSearchBookmarks, 70);
      });
    });

    renderSearchBookmarks();
    observeAjaxResults();
  });
}
