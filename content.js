console.log("Lancement content.js");

window.addEventListener("DOMContentLoaded", () => {

  if (document.getElementsByClassName("plyr-container")) {
    const nextBtn = document.querySelector(".nav-next .next_page");
    const previousBtn = document.querySelector(".nav-previous .prev_page");

    window.addEventListener("keydown", (event) => {
      if (event.key == "n") {
        nextBtn.click();
      }
       if (event.key == "p") {
        previousBtn.click();
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
