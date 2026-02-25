window.addEventListener("message", (event) => {
  console.log('Linker : message reçu');
  if (event.data?.source === "APP_READY") {
    syncWithApp();
  }

  if (event.data?.source === "deleteAnime") {
    const anime = event.data.data;
    console.log("Linker : Suppression demander");
    chrome.runtime.sendMessage({
      action: "deleteAnime",
      data: anime,
    });
  }

  if (event.data?.source === "updateAnime") {
    const anime = event.data.data;
    console.log("Linker : update demander");
    chrome.runtime.sendMessage({
      action: "updateAnime",
      data: anime,
    });
  }

  if (event.data?.source === "addAnime") {
    const anime = event.data.data;
    console.log("Linker : creation demander");
    chrome.runtime.sendMessage({
      action: "addAnime",
      data: anime,
    });
  }
});

function syncWithApp() {
  console.log("Linker : Synchronisation déclenchée");
  chrome.runtime.sendMessage({ action: "getAllAnime" }, (response) => {
    if (response?.status === "ok" && response.data?.length) {
      response.data.forEach((anime) => {
        window.postMessage(
          {
            source: "MY_EXTENSION",
            data: anime,
          },
          "*",
        );
      });
    }
  });
}
