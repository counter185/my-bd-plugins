/**
 * @name MagnetLinks
 * @author cntrpl
 * @description Lets you open magnet links and view some info about them
 * @version 0.0.1
 */

const CLASS_SCROLLER_INNER = BdApi.Webpack.getByKeys("navigationDescription", "scrollerInner")["scrollerInner"];
const CLASS_MESSAGE_CONTENT = BdApi.Webpack.getByKeys('threadMessageAccessoryContentLeadingIcon')["messageContent"]
const CLASS_MESSAGE_LIST_ITEM = BdApi.Webpack.getByKeys("messageListItem")["messageListItem"];

module.exports = class YourPlugin {

    observer = null;
    cssElement = null;
    settings = {
        backgroundStyle: "linear-gradient(90deg, rgb(55, 0, 158), rgb(46, 0, 77))",
        showName: true,
        textColor: "rgb(190, 202, 248)",
        showHash: true,
        hashColor: "rgba(190, 202, 248, 80%)",
        showTrackers: true,
        trackerColor: "rgba(190, 202, 248, 60%)",
    };

    start() {
        // Called when the plugin is activated (including after reloads)
        Object.assign(this.settings, BdApi.Data.load(YourPlugin.name, "settings"));
        this.channelSwitched();
    } 

    stop() {
        // Called when the plugin is deactivated
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.cssElement) {
            this.cssElement.remove();
        }
    }

    onSwitch() {
        this.channelSwitched();
    }

    magnetLinkStyle() {
        return `
            .magnet-links-settings-label {
                color: rgb(190, 202, 248);
            }

            .magnet-link {
                padding: 1px 4px;
                border-radius: 6px;
                display: inline-block;
                background: linear-gradient(90deg, rgb(55, 0, 158), rgb(46, 0, 77));
            }

            .magnet-link a {
                color:rgb(190, 202, 248);
                
            }
            .magnet-link a:hover {
                color: rgb(190, 202, 248);
            }

            .magnet-link-hash {
                font-size: 0.8em;
                color:rgba(190, 202, 248, 80%);
            }
            
            .magnet-link-trackers {
                font-size: 0.8em;
                color:rgba(190, 202, 248, 60%);
                font-style: italic;
            }
        `;
    }

    createMagnetLinkElement(magnetLink) {
        var hash = "[invalid]";
        var name = "[invalid]";
        var trackerCount = 0;

        var paramRegex = /(?:([\w]+)=([^&]+))/g;
        for (var match of magnetLink.matchAll(paramRegex)) {
            if (match[1] == "xt") {
                var a = match[2].split(":");
                hash = a[a.length-1];
            } else if (match[1] == "dn") {
                name = decodeURIComponent(match[2]).replace(/\+/g, " "); // dn=filename
            } else if (match[1] == "tr") {
                trackerCount++;
            }
        }

        var linkElement = document.createElement("div");
        linkElement.className = "magnet-link";

        var actionElement = document.createElement("a");
        actionElement.href = magnetLink;
        actionElement.className = "magnet-link-action";
        linkElement.appendChild(actionElement);
        
        var btText = document.createElement("span")
        btText.innerText = "🧲Torrent: ";
        btText.style.fontWeight = "bold";
        actionElement.appendChild(btText);

        var infoText = document.createTextNode(name);
        actionElement.appendChild(infoText);

        var hashText = document.createElement("span");
        hashText.innerText = " (" + hash + ")";
        hashText.className = "magnet-link-hash";
        actionElement.appendChild(hashText);

        var trackerText = document.createElement("span");
        trackerText.innerText = " (trackers: " + trackerCount + ")";
        trackerText.className = "magnet-link-trackers";
        actionElement.appendChild(trackerText);

        return linkElement.outerHTML;
    }

    transformMessage(message) {
        message.querySelectorAll("span").forEach((spanElement) => {
            var foundMagnet = false;
            const magnetRegex = /(?<=\s*)(?<!href\s*=\s*\"{0,1})(magnet:\?xt=urn:btih:[a-zA-Z0-9]{32,40}[^\s]+)/g;
            for (var match of spanElement.innerHTML.matchAll(magnetRegex)) {
                foundMagnet = true;
                var magnetLink = match[0];
                //they should be in order anyway
                spanElement.innerHTML = spanElement.innerHTML.replace(magnetRegex, this.createMagnetLinkElement(magnetLink));
            }

            if (foundMagnet) {
                spanElement.querySelectorAll("a.magnet-link-action").forEach((link) => {
                    link.addEventListener("click", (e) => {
                        e.preventDefault();
                        this.openMagnetLinkNative(link.href);
                    });
                });
            }
        });
    }

    channelSwitched() {
        if (this.cssElement) {
            this.cssElement.remove();
        }
        this.cssElement = document.createElement("style");
        this.cssElement.innerHTML = this.magnetLinkStyle();
        document.head.appendChild(this.cssElement);

        if (this.observer) {
            this.observer.disconnect();
        }
        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                //console.log(mutation.type);
                if (mutation.type == "childList") {
                    for (const node of mutation.addedNodes) {
                        if (node.classList) {
                            if (node.classList.contains(CLASS_MESSAGE_CONTENT)) {
                                this.transformMessage(node);
                            }
                            else if (node.classList.contains(CLASS_MESSAGE_LIST_ITEM)) {
                                const messageContent = node.querySelector(`.${CLASS_MESSAGE_CONTENT}`);
                                if (messageContent) {
                                    this.transformMessage(messageContent);
                                }
                            }
                        }
                    }
                }
                else if (mutation.type == "characterData") {
                    const target = mutation.target.parentNode.closest("."+CLASS_MESSAGE_CONTENT);
                    if (target) {
                        this.transformMessage(target);
                    }
                }
            }
        });


        const messageList = document.querySelector(`.${CLASS_SCROLLER_INNER}`);
        if (messageList) {
            messageList.querySelectorAll(`.${CLASS_MESSAGE_CONTENT}`).forEach((message) => {
                this.transformMessage(message);
            });

            this.observer.observe(messageList, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        }
    }

    openMagnetLinkNative(link) {
        require("electron").shell.openExternal(link);
        BdApi.UI.showToast("Opened magnet link natively");
    }
}