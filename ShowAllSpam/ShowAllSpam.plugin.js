/**
 * @name ShowAllSpam
 * @author cntrpl
 * @description Automatically unhides spam messages
 * @version 0.0.1
 */

const CLASS_HIDDEN_MESSAGE = BdApi.Webpack.getByKeys("blockedSystemMessage")["blockedSystemMessage"]
const CLASS_BLOCKED_MESSAGE_TEXT = BdApi.Webpack.getByKeys("blockedMessageText")["blockedMessageText"]
const CLASS_BLOCKED_ACTION = BdApi.Webpack.getByKeys("blockedAction")["blockedAction"]
const CLASS_GROUP_START = BdApi.Webpack.getByKeys("groupStart")["groupStart"]
const CLASS_GROUP_EXPANDED = BdApi.Webpack.getByKeys("expanded", "blockedSystemMessage")["expanded"]

module.exports = class YourPlugin {

    name = "ShowAllSpam";
    observer = null;
    settings = {
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
    }

    onSwitch() {
        this.channelSwitched();
    }

    handleBlockedMessageList(htmlNode) {
        //console.log("handling blocked message list: ");
        //console.log(htmlNode);
        var parentNode = htmlNode.parentNode.parentNode;   // ../contents/wrapper
        var groupDiv = parentNode.parentNode;    // ../groupStart
        var blockButtonDiv = htmlNode.querySelector(`.${CLASS_BLOCKED_MESSAGE_TEXT}`);
        if (blockButtonDiv) {
            var actionSpan = blockButtonDiv.querySelector(`.${CLASS_BLOCKED_ACTION}`);
            if (actionSpan) {
                actionSpan.click();
            }
        }
        //delete parent node
        parentNode.remove();

        //get rid of gray background on these messages
        //the attribute type in mutationobserver can't catch these for some reason
        //so we just delay until it's added
        if (groupDiv.classList.contains(CLASS_GROUP_START)) {
            setTimeout(()=> {
                groupDiv.className = "";
            }, 500);
        }
    }

    channelSwitched() {

        if (this.observer) {
            this.observer.disconnect();
        }
        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                console.log(mutation.type);
                if (mutation.type == "childList") {
                    for (const node of mutation.addedNodes) {
                        if (node.classList) {

                            if (node.classList.contains(CLASS_HIDDEN_MESSAGE)) {
                                this.handleBlockedMessageList(node);
                            }

                        }
                    }
                }
                /*else if (mutation.type == "attributes") {
                    if (mutation.attributeName == "class") {
                        var target = mutation.target;
                        if (target.classList.contains(CLASS_GROUP_START) && target.classList.contains(CLASS_GROUP_EXPANDED)) {
                            target.className = "";
                        }
                    }
                }*/
            }
        });

        var hiddenMessages = document.querySelectorAll(`.${CLASS_HIDDEN_MESSAGE}`);
        if (hiddenMessages) {
            hiddenMessages.forEach((x)=> {
                this.handleBlockedMessageList(x);
                /*this.observer.observe(x, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                });*/
            })
        }
    }
}