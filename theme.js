"use strict";

const initialDarkMode = localStorage.getItem("theme") === "dark";
document.documentElement.classList.toggle("dark-mode", initialDarkMode);

function updateThemeUI(isDark) {
    document.documentElement.classList.toggle("dark-mode", isDark);
    document.body?.classList.toggle("dark-mode", isDark);

    const toggle = document.querySelector("#theme-toggle");
    const icon = document.querySelector("#theme-icon");
    if (icon) icon.src = isDark ? "assets/decor/moon.svg" : "assets/decor/sun.svg";
    if (toggle) {
        toggle.setAttribute("aria-pressed", String(isDark));
        toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    }

    if (!document.body) return;

    let stars = document.querySelector(".stars-container");
    if (isDark && !stars) {
        stars = document.createElement("div");
        stars.className = "stars-container";
        stars.setAttribute("aria-hidden", "true");
        for (let index = 0; index < 3; index += 1) {
            stars.append(document.createElement("span"));
        }
        document.body.prepend(stars);
    } else if (!isDark) {
        stars?.remove();
    }
}

function toggleTheme() {
    const isDark = !document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    updateThemeUI(isDark);
}

window.toggleTheme = toggleTheme;
window.updateThemeUI = updateThemeUI;

document.addEventListener("DOMContentLoaded", () => {
    updateThemeUI(localStorage.getItem("theme") === "dark");
    const toggle = document.querySelector("#theme-toggle");
    toggle?.addEventListener("click", () => {
        toggle.classList.remove("is-spinning");
        void toggle.offsetWidth;
        toggle.classList.add("is-spinning");
        toggleTheme();
        window.setTimeout(() => toggle.classList.remove("is-spinning"), 500);
    });
});

window.addEventListener("storage", (event) => {
    if (event.key === "theme") updateThemeUI(event.newValue === "dark");
});