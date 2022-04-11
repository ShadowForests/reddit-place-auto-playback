// ==UserScript==
// @name         Reddit Place Auto Playback
// @namespace    http://tampermonkey.net/
// @version      0.2
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
            maxTime: 0,
            time: 0,
            step: 60000,
            stepDelay: 100,
            playing: false,
            playbackUI: null,
            timeInput: null,
            scrubber: null,
            layout: null,
            mainAnimator: null
        }

        const waitForPreview = setInterval(() => {
            const camera = document.querySelector("mona-lisa-embed").shadowRoot.querySelector("mona-lisa-camera");
            camera.querySelector("mona-lisa-pixel-preview").style.display = "none";
            placeGlobal.layout = document.querySelector("mona-lisa-embed").shadowRoot;
            const canvas = camera.querySelector("mona-lisa-canvas");
            const preview = camera.querySelector("mona-lisa-pixel-preview");
            if (preview) {
                placeGlobal.scrubber = placeGlobal.layout.querySelector("mona-lisa-share-container").querySelector("mona-lisa-scrubber");
                placeGlobal.scrubber.input.step = "1";
                placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].style.width = "100px";
                placeGlobal.minTime = parseInt(placeGlobal.scrubber.input.min);
                placeGlobal.maxTime = parseInt(placeGlobal.scrubber.input.max);
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

        function initTimeControl() {
            let timeControl = document.createElement("div");

            timeControl.style = `
                 left: calc(var(--sail) + 16px);
                 right: calc(var(--sair) + 16px);
                 display: flex;
                 flex-flow: row nowrap;
                 align-items: center;
                 justify-content: center;
                 margin: auto;
                 width: 25%;
                 height: 40px;
                 top: calc(var(--sait) + 48px);
                 text-shadow: black 1px 0 10px;
                 text-align: center;
            `;

            // Text
            let timeText = document.createElement("div");
            timeText.style = `
                width: 50px;
            `
            timeText.innerText = "Time";
            timeControl.appendChild(timeText);

            let lineSeparator = document.createElement("br");
            timeControl.appendChild(lineSeparator);

            // Step input value
            let timeInput = document.createElement("input");
            timeInput.style = `
                width: 80px;
            `
            timeInput.setAttribute("type", "number");
            timeInput.setAttribute("id", "stepInput");
            timeInput.setAttribute("min", "0");
            timeInput.setAttribute("max", placeGlobal.maxTime - placeGlobal.minTime);
            timeInput.setAttribute("step", "1");
            timeInput.value = document.querySelector("mona-lisa-embed").shadowRoot.querySelector("mona-lisa-share-container").querySelector("mona-lisa-scrubber").input.value - placeGlobal.minTime;
            placeGlobal.time = timeInput.value;
            placeGlobal.timeInput = timeInput;

            timeControl.appendChild(timeInput);

            var rangeValue = {current: undefined, mostRecent: undefined};

            timeInput.addEventListener("input", function(evt) {
                rangeValue.current = evt.target.value;
                if (rangeValue.current !== rangeValue.mostRecent) {
                    timeInput.value = rangeValue.current;
                    placeGlobal.time = rangeValue.current;
                    jumpToTime();
                }
                rangeValue.mostRecent = rangeValue.current;
            });

            return timeControl;
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
                 width: 25%;
                 height: 40px;
                 top: calc(var(--sait) + 48px);
                 text-shadow: black 1px 0 10px;
                 text-align: center;
            `;

            // Text
            let stepText = document.createElement("div");
            stepText.style = `
                width: 50px;
            `
            stepText.innerText = "Step";
            stepControl.appendChild(stepText);

            let lineSeparator = document.createElement("br");
            stepControl.appendChild(lineSeparator);

            // Step input value
            let stepInput = document.createElement("input");
            stepInput.style = `
                width: 80px;
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
                 width: 25%;
                 height: 40px;
                 top: calc(var(--sait) + 48px);
                 text-shadow: black 1px 0 10px;
                 text-align: center;
            `;

            // Text
            let stepDelayText = document.createElement("div");
            stepDelayText.style = `
                width: 50px;
            `
            stepDelayText.innerText = "Delay";
            stepDelayControl.appendChild(stepDelayText);

            let lineSeparator = document.createElement("br");
            stepDelayControl.appendChild(lineSeparator);

            // Step input value
            let stepDelayInput = document.createElement("input");
            stepDelayInput.style = `
                width: 80px;
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

        function initPlayButton() {
            let playControl = document.createElement("div");

            playControl.style = `
                 left: calc(var(--sail) + 16px);
                 right: calc(var(--sair) + 16px);
                 display: flex;
                 flex-flow: row nowrap;
                 align-items: center;
                 justify-content: center;
                 margin: auto;
                 width: 10%;
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

        function initStepButton() {
            let stepControl = document.createElement("div");

            stepControl.style = `
                 left: calc(var(--sail) + 16px);
                 right: calc(var(--sair) + 16px);
                 display: flex;
                 flex-flow: row nowrap;
                 align-items: center;
                 justify-content: center;
                 margin: auto;
                 width: 10%;
                 height: 40px;
                 top: calc(var(--sait) + 48px);
                 text-shadow: black 1px 0 10px;
                 text-align: center;
            `;

            // Play button
            let stepButton = document.createElement("button");
            stepButton.style = `
                width: 55px;
                height: 20px;
            `
            stepButton.innerHTML = "Step"

            stepControl.appendChild(stepButton);

            stepButton.addEventListener("click", function(evt) {
                stepTime();
            });

            return stepControl;
        }

        function updateTimeDisplay(time) {
            //let text = placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].innerText.split("\n")[0];
            let hour = (Math.floor(time / 60000 / 60)).toString();
            let minute = (Math.floor(time / 60000 % 60)).toString();
            let text = (hour.length == 1 ? "0" : "") + hour + ":" + (minute.length == 1 ? "0" : "") + minute;
            placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].style.textAlign = "center";
            placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].style.fontSize = "70%";
            placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].style.lineHeight = "100%";
            placeGlobal.scrubber.shadowRoot.querySelectorAll("div")[2].innerText = text + "\n" + time.toString();
            placeGlobal.timeInput.value = time;
        }

        function initScrubberControl() {
            document.querySelector("mona-lisa-embed").shadowRoot.querySelector("mona-lisa-share-container").querySelector("mona-lisa-scrubber").input.addEventListener("input", function(evt) {
                let currentTime = document.querySelector("mona-lisa-embed").shadowRoot.querySelector("mona-lisa-share-container").querySelector("mona-lisa-scrubber").input.value;
                if (currentTime !== null && !isNaN(currentTime)) {
                    const time = parseInt(currentTime);
                    updateTimeDisplay(time - placeGlobal.minTime);
                    // console.log(`Current Time: ${currentTime}`);
                } else {
                    console.log("failed");
                }
            });
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
                     width: 50%;
                     height: 40px;
                     top: calc(var(--sait) + 48px);
                     text-shadow: black 1px 0 10px;
                     text-align: center;
                     background-color: rgba(0, 0, 0, 0.5);
                `;

            let timeControl = initTimeControl()
            playbackUI.appendChild(timeControl);

            let stepControl = initStepControl();
            playbackUI.appendChild(stepControl);

            let stepDelayControl = initStepDelayControl();
            playbackUI.appendChild(stepDelayControl);

            let playButton = initPlayButton();
            playbackUI.appendChild(playButton);

            let stepButton = initStepButton();
            playbackUI.appendChild(stepButton);

            initScrubberControl();

            let topControls = document.querySelector("mona-lisa-embed").shadowRoot.querySelector(".layout .top-controls");
            insertAfter(playbackUI, topControls);
            placeGlobal.playbackUI = playbackUI;
        }

        function jumpToTime() {
            const time = parseInt(placeGlobal.time);
            updateTimeDisplay(time);
            placeGlobal.scrubber.onRangeInput({currentTarget: {value: time + placeGlobal.minTime}});
        }

        function stepTime() {
            let currentTime = document.querySelector("mona-lisa-embed").shadowRoot.querySelector("mona-lisa-share-container").querySelector("mona-lisa-scrubber").input.value;
            if (currentTime !== null && !isNaN(currentTime)) {
                const time = parseInt(currentTime) + parseInt(placeGlobal.step);
                updateTimeDisplay(time - placeGlobal.minTime);
                placeGlobal.scrubber.onRangeInput({currentTarget: {value: time}});
                // console.log(`Current Time: ${currentTime}`);
            } else {
                console.log("failed");
            }
        }

        function updateMainAnimator() {
            clearInterval(placeGlobal.mainAnimator);
            if (placeGlobal.playing) {
                placeGlobal.mainAnimator = setInterval(function() {
                    stepTime();
                }, parseInt(placeGlobal.stepDelay));
            }
        }

        function loadRegions() {
            let playbackUIState = placeGlobal.layout.contains(placeGlobal.layout.querySelector('#playbackUI'));
            if (!playbackUIState) {
                initPlaybackUI();
            }

            if (placeGlobal.mainAnimator === null) {
                let currentTime = document.querySelector("mona-lisa-embed").shadowRoot.querySelector("mona-lisa-share-container").querySelector("mona-lisa-scrubber").input.value;
                const time = parseInt(currentTime);
                updateTimeDisplay(time - placeGlobal.minTime);
            }
        }
    }, false);
}
