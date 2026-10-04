"use strict";

const legacyAudioStorageKey = "pinoyQuizAudio";
const musicStorageKey = "musicEnabled";
const sfxStorageKey = "sfxEnabled";
const songStorageKey = "pinoyQuizSong";
const timeStorageKey = "pinoyQuizAudioTime";
const volumeStorageKey = "pinoyQuizVolume";
const defaultSong = "assets/music/manila-groove.mp3";
const availableSongs = [
    defaultSong,
    "assets/music/buhay-pinoy.mp3",
    "assets/music/musicmaster.mp3",
    "assets/music/paoloargento.mp3",
    "assets/music/vadim_makes_sound.mp3"
];
const audio = document.querySelector("#background-audio") || new Audio();
const clickSound = new Audio("assets/music/click-sound.mp3");
const musicToggle = document.querySelector("#musicToggle");
const sfxToggle = document.querySelector("#sfxToggle");
const musicSelect = document.querySelector("#musicSelector");
const volumeSlider = document.querySelector("#volumeSlider");
const volumeOutput = document.querySelector("#volume-value");

if (!audio.isConnected) {
    audio.id = "background-audio";
    audio.hidden = true;
    document.body.append(audio);
}

audio.loop = true;
audio.preload = "auto";
audio.volume = 0.5;
clickSound.preload = "auto";

function updateAudioVolume(value, persist = true) {
    const parsedValue = Number(value);
    const volume = Number.isFinite(parsedValue)
        ? Math.min(1, Math.max(0, parsedValue))
        : 0.5;

    audio.volume = volume;
    if (persist) {
        localStorage.setItem(volumeStorageKey, String(volume));
    }
    if (volumeSlider) volumeSlider.value = String(volume);
    if (volumeOutput) volumeOutput.value = `${Math.round(volume * 100)}%`;
}

function normalizeSongPath(songPath) {
    return availableSongs.includes(songPath) ? songPath : defaultSong;
}

function playMusic(songPath, resumePosition = false, savedPlaybackTime = 0) {
    const selectedSong = normalizeSongPath(songPath);
    const shouldPlay = localStorage.getItem(musicStorageKey) === "true";
    const currentSong = audio.getAttribute("src");
    const isSameSong = currentSong === selectedSong;

    if (!isSameSong) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = selectedSong;
        if (!resumePosition) {
            localStorage.setItem(timeStorageKey, "0");
        }
    }
    audio.loop = true;
    audio.muted = !shouldPlay;

    const startSelectedTrack = () => {
        audio.removeEventListener("loadedmetadata", startSelectedTrack);
        if (resumePosition) {
            if (Number.isFinite(savedPlaybackTime) && savedPlaybackTime > 0 && Number.isFinite(audio.duration) && audio.duration > 0) {
                audio.currentTime = savedPlaybackTime % audio.duration;
            }
        }

        if (shouldPlay) startPlayback();
    };

    if (audio.readyState >= 1) {
        startSelectedTrack();
    } else {
        audio.addEventListener("loadedmetadata", startSelectedTrack, { once: true });
        if (!isSameSong) audio.load();
    }

    if (musicSelect) {
        musicSelect.value = selectedSong;
    }
}

function savePlaybackPosition() {
    if (!audio.getAttribute("src") || !Number.isFinite(audio.currentTime)) return;

    localStorage.setItem(timeStorageKey, String(audio.currentTime));
}

let lastSavedPlaybackSecond = -1;
audio.addEventListener("timeupdate", () => {
    const currentSecond = Math.floor(audio.currentTime);
    if (currentSecond !== lastSavedPlaybackSecond) {
        lastSavedPlaybackSecond = currentSecond;
        savePlaybackPosition();
    }
});

function startPlayback() {
    audio.muted = false;
    const playback = audio.play();
    if (playback && typeof playback.catch === "function") {
        playback.catch(() => {
            document.addEventListener("pointerdown", resumeAudioAfterGesture, { once: true });
            document.addEventListener("keydown", resumeAudioAfterGesture, { once: true });
        });
    }
}

function updateMusicState(status, persist = true) {
    const isEnabled = status === true || status === "ON";

    if (persist) {
        localStorage.setItem(musicStorageKey, String(isEnabled));
        localStorage.setItem(legacyAudioStorageKey, isEnabled ? "ON" : "OFF");
    }

    if (musicToggle) musicToggle.checked = isEnabled;
    audio.muted = !isEnabled;

    if (isEnabled) {
        if (!audio.getAttribute("src")) {
            playMusic(localStorage.getItem(songStorageKey) || defaultSong);
        } else {
            startPlayback();
        }
    } else {
        audio.pause();
    }
}

function updateSfxState(status, persist = true) {
    const isEnabled = status === true || status === "true";

    if (persist) localStorage.setItem(sfxStorageKey, String(isEnabled));
    if (sfxToggle) sfxToggle.checked = isEnabled;
}

function saveMusicSelection(songPath) {
    const selectedSong = normalizeSongPath(songPath);
    localStorage.setItem(songStorageKey, selectedSong);
    if (musicSelect) musicSelect.value = selectedSong;
}

function resumeAudioAfterGesture() {
    if (localStorage.getItem(musicStorageKey) === "true") startPlayback();
}

const navigationTransitionStorageKey = "pinoyQuizNavigationPending";
const loadingOverlay = document.createElement("div");
const loadingSpinner = document.createElement("span");
loadingOverlay.className = "loading-spinner";
loadingOverlay.setAttribute("role", "status");
loadingOverlay.setAttribute("aria-label", "Loading");
loadingSpinner.className = "loading-spinner__ring";
loadingSpinner.setAttribute("aria-hidden", "true");
loadingOverlay.append(loadingSpinner);
document.body.append(loadingOverlay);

if (sessionStorage.getItem(navigationTransitionStorageKey) === "true") {
    sessionStorage.removeItem(navigationTransitionStorageKey);
    loadingOverlay.classList.add("is-active");
    const fadeOutWhenVisible = () => {
        if (document.visibilityState !== "visible") return;

        document.removeEventListener("visibilitychange", fadeOutWhenVisible);
        loadingOverlay.classList.remove("is-active");
    };

    if (document.visibilityState === "visible") {
        window.setTimeout(fadeOutWhenVisible, 50);
    } else {
        document.addEventListener("visibilitychange", fadeOutWhenVisible);
    }
}

if (musicToggle) {
    musicToggle.addEventListener("change", () => updateMusicState(musicToggle.checked));
}

if (sfxToggle) {
    sfxToggle.addEventListener("change", () => updateSfxState(sfxToggle.checked));
}

let firstClickInitializedPlayback = false;

document.addEventListener("click", (event) => {
    if (!firstClickInitializedPlayback) {
        firstClickInitializedPlayback = true;
        if (!audio.getAttribute("src")) {
            const selectedSong = localStorage.getItem(songStorageKey) || defaultSong;
            const savedPlaybackTime = Number(localStorage.getItem(timeStorageKey) || 0);
            playMusic(selectedSong, true, savedPlaybackTime);
        } else if (localStorage.getItem(musicStorageKey) === "true") {
            startPlayback();
        }
    }

    if (event.target instanceof Element && event.target.closest(".quiz-option, .suppress-click-sound")) return;

    const clickTarget = event.target instanceof Element
        ? event.target.closest("button, a, [onclick]")
        : null;
    if (!clickTarget) return;

    console.log("Button clicked, playing sound");
    const isSameTabInternalLink = clickTarget instanceof HTMLAnchorElement &&
        event.button === 0 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey &&
        !event.defaultPrevented &&
        !clickTarget.hasAttribute("download") &&
        (!clickTarget.target || clickTarget.target === "_self") &&
        new URL(clickTarget.href).origin === window.location.origin;
    const destination = isSameTabInternalLink ? clickTarget.href : null;
    if (destination) {
        event.preventDefault();
        sessionStorage.setItem(navigationTransitionStorageKey, "true");
        loadingOverlay.classList.add("is-active");
        window.setTimeout(() => window.location.assign(destination), 500);
    }

    if (localStorage.getItem(sfxStorageKey) !== "true") return;

    clickSound.currentTime = 0;
    clickSound.volume = audio.volume;
    const playback = clickSound.play();
    if (playback && typeof playback.catch === "function") playback.catch(() => {});
});

if (musicSelect) {
    musicSelect.addEventListener("change", () => {
        saveMusicSelection(musicSelect.value);
        playMusic(musicSelect.value);
    });
}

window.addEventListener("pagehide", savePlaybackPosition);
window.addEventListener("beforeunload", savePlaybackPosition);

if (volumeSlider) {
    volumeSlider.addEventListener("input", () => updateAudioVolume(volumeSlider.value));
}

window.addEventListener("storage", (event) => {
    if (event.key === musicStorageKey || event.key === legacyAudioStorageKey) {
        const isEnabled = event.key === musicStorageKey
            ? event.newValue === "true"
            : event.newValue === "ON";
        updateMusicState(isEnabled, false);
    } else if (event.key === sfxStorageKey) {
        updateSfxState(event.newValue === "true", false);
    } else if (event.key === songStorageKey && event.newValue) {
        playMusic(event.newValue);
    } else if (event.key === timeStorageKey && Number.isFinite(Number(event.newValue))) {
        if (audio.readyState >= 1 && Number.isFinite(audio.duration) && audio.duration > 0) {
            audio.currentTime = Number(event.newValue) % audio.duration;
        }
    } else if (event.key === volumeStorageKey) {
        updateAudioVolume(event.newValue ?? 0.5, false);
    }
});

function initializeAudio() {
    let selectedSong = normalizeSongPath(localStorage.getItem(songStorageKey) || defaultSong);
    const savedPlaybackTime = Number(localStorage.getItem(timeStorageKey) || 0);
    updateAudioVolume(localStorage.getItem(volumeStorageKey) ?? volumeSlider?.value ?? 0.5, false);

    if (localStorage.getItem(musicStorageKey) === null) {
        localStorage.setItem(musicStorageKey, String(localStorage.getItem(legacyAudioStorageKey) === "ON"));
    }
    if (localStorage.getItem(sfxStorageKey) === null) {
        localStorage.setItem(sfxStorageKey, "true");
    }
    if (!localStorage.getItem(songStorageKey)) {
        localStorage.setItem(songStorageKey, selectedSong);
    }

    if (musicSelect) musicSelect.value = selectedSong;
    if (musicToggle) musicToggle.checked = localStorage.getItem(musicStorageKey) === "true";
    if (sfxToggle) sfxToggle.checked = localStorage.getItem(sfxStorageKey) === "true";
    playMusic(selectedSong, true, savedPlaybackTime);
}

window.audio = audio;
window.clickSound = clickSound;
window.playMusic = playMusic;
window.updateAudioState = updateMusicState;
window.updateSfxState = updateSfxState;
window.saveMusicSelection = saveMusicSelection;
initializeAudio();
