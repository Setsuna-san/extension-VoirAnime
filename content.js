console.log("Lancement content.js");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "GET_LINK_TITLE") {
    const links = document.querySelectorAll(`a[href="${msg.linkUrl}"]`);

    if (!links.length) {
      sendResponse({ title: "Titre inconnu" });
      return;
    }

    const link = links[0];

    const title =
      link.getAttribute("title")?.trim() ||
      link.textContent?.trim() ||
      "Titre inconnu";
    sendResponse({ title });
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const breadcrumb = document.querySelectorAll(".breadcrumb li");
  const episode = document
    .querySelector(".selectpicker_chapter option[selected]")
    .textContent.trim();
  const url = window.location.href;
  const nextBtn = document.querySelector(".nav-next .next_page");
  const alias = "";
  const nouveau = true;
  const principal = true;
  const date = new Date();

  let next = "";
  if (nextBtn) {
    next = nextBtn.href;
  }

  if (breadcrumb.length >= 3) {
    const animeTitle = breadcrumb[1].querySelector("a")?.innerText.trim();
    if (animeTitle && episode && url) {
      console.log("envoi new anime");
      chrome.runtime.sendMessage({
        action: "addAnime",
        data: { title: animeTitle, episode, url, next, alias, date },
      });
    }
  }
});
