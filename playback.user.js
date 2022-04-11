// ==UserScript==
// @name         Reddit Place Auto Playback
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Automatic playback for r/place history
// @author       ShadowForest
// @match        https://hot-potato.reddit.com/embed*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @grant        none
// ==/UserScript==
if (window.top !== window.self) {
    window.addEventListener('load', () => {
        // Global variables
        var placeGlobal = {
            minTime: 0,
            counter: 0,
            step: 60000,
            stepDelay: 100,
            playing: false,
            playbackUI: null,
            svgMask: null,
            scrubber: null,
            layout: null,
            mainAnimator: null
        }

        const waitForPreview = setInterval(() => {
            const camera = document.querySelector("mona-lisa-embed").shadowRoot.querySelector("mona-lisa-camera");
            placeGlobal.layout = document.querySelector("mona-lisa-embed").shadowRoot;
            const canvas = camera.querySelector("mona-lisa-canvas");
            const preview = camera.querySelector("mona-lisa-pixel-preview");
            if (preview) {
                placeGlobal.scrubber = placeGlobal.layout.querySelector("mona-lisa-share-container").querySelector("mona-lisa-scrubber");
                placeGlobal.scrubber.input.step = "1";
                placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].style.width = "100px";
                placeGlobal.minTime = parseInt(placeGlobal.scrubber.input.min);
                clearInterval(waitForPreview);
                loadRegions()
                setTimeout(() => {
                    loadRegions();
                    if (typeof regionInterval == "undefined") {
                        const regionInterval = setInterval(() => {
                            loadRegions()
                        }, 5000)
                        }
                }, 1000)
            }
        }, 100);

        // Insert element after another element
        function insertAfter(newNode, referenceNode) {
            referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        }

        function initStepControl() {
            let stepControl = document.createElement("div");

            stepControl.style = `
                 left: calc(var(--sail) + 16px);
                 right: calc(var(--sair) + 16px);
                 display: flex;
                 flex-flow: row nowrap;
                 align-items: center;
                 justify-content: center;
                 margin: auto;
                 width: 40%;
                 height: 40px;
                 top: calc(var(--sait) + 48px);
                 text-shadow: black 1px 0 10px;
                 text-align: center;
            `;

            // Text
            let stepText = document.createElement("div");
            stepText.style = `
                width: 40px;
            `
            stepText.innerText = "Step";
            stepControl.appendChild(stepText);

            let lineSeparator = document.createElement("br");
            stepControl.appendChild(lineSeparator);

            // Step input value
            let stepInput = document.createElement("input");
            stepInput.style = `
                width: 90px;
            `
            stepInput.setAttribute("type", "number");
            stepInput.setAttribute("id", "stepInput");
            stepInput.setAttribute("min", "-300000000");
            stepInput.setAttribute("max", "300000000");
            stepInput.setAttribute("step", "1");
            stepInput.value = placeGlobal.step;

            stepControl.appendChild(stepInput);

            var rangeValue = {current: undefined, mostRecent: undefined};

            stepInput.addEventListener("input", function(evt) {
                rangeValue.current = evt.target.value;
                if (rangeValue.current !== rangeValue.mostRecent) {
                    stepInput.value = rangeValue.current;
                    placeGlobal.step = rangeValue.current;
                    updateMainAnimator();
                }
                rangeValue.mostRecent = rangeValue.current;
            });

            return stepControl;
        }

        function initStepDelayControl() {
            let stepDelayControl = document.createElement("div");

            stepDelayControl.style = `
                 left: calc(var(--sail) + 16px);
                 right: calc(var(--sair) + 16px);
                 display: flex;
                 flex-flow: row nowrap;
                 align-items: center;
                 justify-content: center;
                 margin: auto;
                 width: 40%;
                 height: 40px;
                 top: calc(var(--sait) + 48px);
                 text-shadow: black 1px 0 10px;
                 text-align: center;
            `;

            // Text
            let stepDelayText = document.createElement("div");
            stepDelayText.style = `
                width: 100px;
            `
            stepDelayText.innerText = "Step Delay";
            stepDelayControl.appendChild(stepDelayText);

            let lineSeparator = document.createElement("br");
            stepDelayControl.appendChild(lineSeparator);

            // Step input value
            let stepDelayInput = document.createElement("input");
            stepDelayInput.style = `
                width: 90px;
            `
            stepDelayInput.setAttribute("type", "number");
            stepDelayInput.setAttribute("id", "stepDelayInput");
            stepDelayInput.setAttribute("min", "1");
            stepDelayInput.setAttribute("max", "300000000");
            stepDelayInput.setAttribute("step", "1");
            stepDelayInput.value = placeGlobal.stepDelay;

            stepDelayControl.appendChild(stepDelayInput);

            var rangeValue = {current: undefined, mostRecent: undefined};

            stepDelayInput.addEventListener("input", function(evt) {
                rangeValue.current = evt.target.value;
                if (rangeValue.current !== rangeValue.mostRecent) {
                    stepDelayInput.value = rangeValue.current;
                    placeGlobal.stepDelay = rangeValue.current;
                    updateMainAnimator();
                }
                rangeValue.mostRecent = rangeValue.current;
            });

            return stepDelayControl;
        }

        function initPlayControl() {
            let playControl = document.createElement("div");

            playControl.style = `
                 left: calc(var(--sail) + 16px);
                 right: calc(var(--sair) + 16px);
                 display: flex;
                 flex-flow: row nowrap;
                 align-items: center;
                 justify-content: center;
                 margin: auto;
                 width: 20%;
                 height: 40px;
                 top: calc(var(--sait) + 48px);
                 text-shadow: black 1px 0 10px;
                 text-align: center;
            `;

            // Play button
            let playButton = document.createElement("button");
            playButton.style = `
                width: 55px;
                height: 20px;
            `
            playButton.innerHTML = "Play"

            playControl.appendChild(playButton);

            playButton.addEventListener("click", function(evt) {
                placeGlobal.playing = !placeGlobal.playing;
                if (placeGlobal.playing) {
                    playButton.innerHTML = "Pause";
                } else {
                    playButton.innerHTML = "Play";
                }
                updateMainAnimator();
            });

            return playControl;
        }

        // Playback UI initialization
        function initPlaybackUI() {
            let playbackUI = document.createElement("div");
            playbackUI.setAttribute("id", "playbackUI");

            playbackUI.style = `
                     position: fixed;
                     left: calc(var(--sail) + 16px);
                     right: calc(var(--sair) + 16px);
                     display: flex;
                     flex-flow: row wrap;
                     align-items: center;
                     justify-content: center;
                     margin: auto;
                     width: 40%;
                     height: 40px;
                     top: calc(var(--sait) + 48px);
                     text-shadow: black 1px 0 10px;
                     text-align: center;
                     background-color: rgba(0, 0, 0, 0.5);
                `;

            let stepControl = initStepControl();
            playbackUI.appendChild(stepControl);

            let stepDelayControl = initStepDelayControl();
            playbackUI.appendChild(stepDelayControl);

            let playControl = initPlayControl();
            playbackUI.appendChild(playControl);

            let topControls = document.querySelector("mona-lisa-embed").shadowRoot.querySelector(".layout .top-controls");
            insertAfter(playbackUI, topControls);
            placeGlobal.playbackUI = playbackUI;
        }

        function updateMainAnimator() {
            clearInterval(placeGlobal.mainAnimator);
            if (placeGlobal.playing) {
                placeGlobal.mainAnimator = setInterval(function() {
                    let currentValue = document.querySelector("mona-lisa-embed").shadowRoot.querySelector("mona-lisa-share-container").querySelector("mona-lisa-scrubber").input.value;
                    if (currentValue !== null && !isNaN(currentValue)) {
                        const time = parseInt(currentValue) + parseInt(placeGlobal.step);
                        let text = placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].innerText.split("\n")[0];
                        placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].style.textAlign = "center";
                        placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].style.fontSize = "70%";
                        placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].style.lineHeight = "100%";
                        placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].innerText = text + "\n" + (time - placeGlobal.minTime).toString();
                        placeGlobal.scrubber.onRangeInput({currentTarget: {value: time}});
                        // console.log(`ran ${placeGlobal.counter}: ${currentValue}`);
                        placeGlobal.counter += 1;
                    } else {
                        console.log("failed");
                    }
                }, parseInt(placeGlobal.stepDelay));
            }
        }

        function loadRegions() {
            let playbackUIState = placeGlobal.layout.contains(placeGlobal.layout.querySelector('#playbackUI'));
            if (!playbackUIState) {
                initPlaybackUI();
            }

            if (placeGlobal.mainAnimator === null) {
                let currentValue = document.querySelector("mona-lisa-embed").shadowRoot.querySelector("mona-lisa-share-container").querySelector("mona-lisa-scrubber").input.value;
                const time = parseInt(currentValue);
                let text = placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].innerText.split("\n")[0];
                placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].style.textAlign = "center";
                placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].style.fontSize = "70%";
                placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].style.lineHeight = "100%";
                placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].innerText = text + "\n" + (time - placeGlobal.minTime).toString();
            }
        }
    }, false);
}
