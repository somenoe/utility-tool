// Automatically execute the script when YouTube is loaded in a tab.
// Paste on 'Custom script' on Chrome extension: Enhancer for YouTube™
// https://chromewebstore.google.com/detail/enhancer-for-youtube/ponfpcnoihfmfllpaingbgckeeldkhle

(function () {
    function createOverlay() {
        const overlay = document.createElement("div");
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(8px);
            z-index: 9998;
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    function createModal() {
        const modal = document.createElement("div");
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: black;
            color: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
            z-index: 9999;
        `;

        const title = document.createElement("h2");
        title.textContent = "Are you sure you want to watch Shorts?";
        modal.appendChild(title);

        const countdownText = document.createElement("p");
        countdownText.style.cssText = `padding-bottom: 16px;`;
        countdownText.textContent = `This page will redirect in 3 seconds...`;
        modal.appendChild(countdownText);

        const closeModalButton = document.createElement("button");
        closeModalButton.id = "closeModal";
        closeModalButton.textContent = "Close Modal";
        modal.appendChild(closeModalButton);

        document.body.appendChild(modal);
        return { modal, closeModalButton, countdownText };
    }

    function showShortsModal() {
        const overlay = createOverlay();
        const { modal, closeModalButton, countdownText } = createModal();

        let timeLeft = 3;
        const timerId = setInterval(() => {
            countdownText.textContent = `This page will redirect in ${timeLeft} seconds...`;

            if (timeLeft <= 0) {
                clearInterval(timerId);
                window.location.href = "https://www.youtube.com/";
            }
            timeLeft--;
        }, 1000);

        closeModalButton.addEventListener("click", () => {
            clearInterval(timerId);
            modal.remove();
            overlay.remove();
        });
    }

    function checkIfYouTubeShort() {
        if (window.location.href.includes("youtube.com/shorts/")) {
            showShortsModal();
        }
    }

    function debounce(func, wait) {
        let debounceTimeout;
        return function () {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(func, wait);
        };
    }

    const titleObserver = new MutationObserver(debounce(checkIfYouTubeShort, 500));
    const titleNode = document.querySelector("title");
    titleObserver.observe(titleNode, { childList: true });

    window.addEventListener("popstate", checkIfYouTubeShort);

    checkIfYouTubeShort();
})();
