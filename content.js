console.log("Lancement content.js");

window.addEventListener("DOMContentLoaded", () => {
  if (document.URL === "https://v6.voiranime.com/anime/*/*") {
    const breadcrumb = document.querySelectorAll(".breadcrumb li");
    const url = window.location.href;
    const alias = "";
    const nouveau = true;
    const principal = true;
    const date = new Date();
    let next = "";

    const episode = document
      .querySelector(".selectpicker_chapter option[selected]")
      .textContent.trim();
    const nextBtn = document.querySelector(".nav-next .next_page");

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
  }
});
