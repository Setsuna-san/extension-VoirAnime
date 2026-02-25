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

    if(links[0].className == "asp_res_image_url" ) {
      link = links[1];
    }

    const title =
      link.getAttribute("title")?.trim() ||
      link.textContent?.trim() ||
      "Titre inconnu";

    sendResponse({ title });
  }
});
