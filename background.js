importScripts("db.js");
console.log("Background launched");

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addAnime",
    title: "Add as new",
    contexts: ["link"],
    targetUrlPatterns: ["https://v6.voiranime.com/anime/*"],
  });

  chrome.contextMenus.create({
    id: "addAnimeToWatch",
    title: "Add to Watch List",
    contexts: ["link"],
    targetUrlPatterns: ["https://v6.voiranime.com/anime/*"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.tabs.sendMessage(
    tab.id,
    { action: "GET_LINK_TITLE", linkUrl: info.linkUrl },
    (response) => {
      if (!response) return;
      const anime = {
        title: response.title,
        url: info.linkUrl,
      };

      if (info.menuItemId === "addAnime") {
        console.log("Background : manual add anime");
        addAnimeToDB(anime);
      }

      if (info.menuItemId === "addAnimeToWatch") {
        console.log('Background : manual add anime "to watch"');
        addToWatch(anime);
      }
    },
  );
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Background : message recu");

  if (msg.action === "addAnime") {
    console.log("Background : ajout animé");
    addAnimeToDB(msg.data).then(() => sendResponse({ status: "ok" }));
    return true; // nécessaire pour réponse asynchrone
  }

  if (msg.action === "addAnimeToWatch") {
    console.log("Background : ajout animé dans la liste To watch");
    addToWatch(msg.data).then(() => sendResponse({ status: "ok" }));
    return true; // nécessaire pour réponse asynchrone
  }

  if (msg.action === "getAllAnime") {
    console.log("Background : get all anime");
    getAllAnime().then((data) => sendResponse({ status: "ok", data }));
    return true;
  }

  if (msg.action === "deleteAnime") {
    console.log("Background : delete anime");
    deleteAnime(msg.data).then(() => sendResponse({ status: "ok" }));
    return true;
  }

  if (msg.action === "updateAnime") {
    console.log("Background : update anime");
    updateAnime(msg.data).then(() => sendResponse({ status: "ok" }));
    return true;
  }
});
