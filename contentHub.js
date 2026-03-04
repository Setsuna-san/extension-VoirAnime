console.log("Lancement contentHub.js");

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
});

const breadcrumb = document.querySelectorAll(".breadcrumb li");
const boutons = document.getElementById("init-links");

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
