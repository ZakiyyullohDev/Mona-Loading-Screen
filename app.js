function openFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn("Fullscreen ishlamadi:", err);
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Birinchi user interaction (tap, click) bo‘lishi bilan fullscreen ochiladi
    document.addEventListener("click", openFullscreen, { once: true });
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        openFullscreen();
    }
    if (e.key === " ") {
        e.preventDefault();
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }
});
