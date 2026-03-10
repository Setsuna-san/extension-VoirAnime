console.log("Lancement content.js");

function playNotifSound() {
  console.log("Background : play sound notif");
  const audio = new Audio(chrome.runtime.getURL("./Sounds/notif2.mp3"));
  audio.play();
}


window.addEventListener("DOMContentLoaded", () => {
  if (document.getElementsByClassName("plyr-container")) {
    const nextBtn = document.querySelector(".nav-next .next_page");
    const previousBtn = document.querySelector(".nav-previous .prev_page");

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === "nextEpisode") {
        nextBtn?.click();
      }

      if (msg.action === "previousEpisode") {
        previousBtn?.click();
      }

      if (msg.action === "PlayNotifSound") {
        playNotifSound();
      }

    });

    console.log("Content : url validé");
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

    if (nextBtn) {
      next = nextBtn.href;
    }

    console.log("Content : init message");

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
