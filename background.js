importScripts("db.js");
console.log("Background launched");
const SCAN_ALARM_NAME = "scan-in-progress-animes";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addAnime",
    title: "Add as new",
    contexts: ["link"],
    targetUrlPatterns: ["https://voiranime.tv/anime/*"],
  });

  chrome.contextMenus.create({
    id: "addAnimeToWatch",
    title: "Add to Watch List",
    contexts: ["link"],
    targetUrlPatterns: ["https://voiranime.tv/anime/*"],
  });

  // chrome.alarms.create(SCAN_ALARM_NAME, { periodInMinutes: 10 });
  // scanAndNotifyAvailable().catch((error) =>
  //   console.warn("Scan initial failed", error),
  // );
});

// chrome.runtime.onStartup.addListener(() => {
//   chrome.alarms.create(SCAN_ALARM_NAME, { periodInMinutes: 10 });
//   scanAndNotifyAvailable().catch((error) =>
//     console.warn("Scan startup failed", error),
//   );
// });

// chrome.alarms.onAlarm.addListener((alarm) => {
//   if (alarm.name !== SCAN_ALARM_NAME) return;
//   scanAndNotifyAvailable().catch((error) =>
//     console.warn("Scheduled scan failed", error),
//   );
// });

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

  if (msg.action === "switchStatut") {
    console.log("Background : switch statut");
    switchStatut(msg.data.title, msg.data.statut, msg.data.value).then(() =>
      sendResponse({ status: "ok" }),
    );
    return true;
  }

  if (msg.action === "setInProgress") {
    setAnimeInProgress(msg.data.title, msg.data.value).then((ok) =>
      sendResponse({ status: ok ? "ok" : "not-found" }),
    );
    return true;
  }

  // if (msg.action === "scanAnime") {
  //   scanAnime(msg.data).then((result) => sendResponse({ status: "ok", result }));
  //   return true;
  // }

  // if (msg.action === "scanPendingAnimes") {
  //   scanAndNotifyAvailable().then((result) =>
  //     sendResponse({ status: "ok", result }),
  //   );
  //   return true;
  // }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "next_episode") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "nextEpisode" });
    });
  }

  if (command === "previous_episode") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "previousEpisode" });
    });
  }
});

function flashIcon() {
  let flash = true;
  let count = 0;

  const interval = setInterval(() => {
    chrome.action.setIcon({
      path: flash ? "icon-flash.png" : "icon.png",
    });
    flash = !flash;
    count++;
    if (count > 2) {
      clearInterval(interval);
      chrome.action.setIcon({ path: "icon.png" }); // reset
    }
  }, 400); // clignotement toutes les 200ms
}

async function updateBadge() {
  console.log("Background : update badge");

  chrome.storage.local.get(["lastNotifCount"], (res) => {
    lastNotifCount = res.lastNotifCount || 0;
  });

  const data = await getAllAnime();

  const count = data.filter((a) => a.nouveau === true).length;

  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: "#fff" });
    setTimeout(() => {
      chrome.action.setBadgeBackgroundColor({ color: "#ba0000" });
    }, 300);
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
  chrome.storage.local.set({ lastNotifCount: count });

  if (lastNotifCount < count) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "PlayNotifSound" });
    });
  }
}
