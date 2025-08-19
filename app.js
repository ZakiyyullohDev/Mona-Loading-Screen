const audio = document.getElementById('audio');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const progressContainer = document.getElementById('progress-container');
const progress = document.getElementById('progress');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const volumeSlider = document.getElementById('volume-slider');
const youtubeBtn = document.getElementById('youtube-btn');
const youtubeModal = document.getElementById('youtube-modal');
const youtubeUrl = document.getElementById('youtube-url');
const addYoutubeBtn = document.getElementById('add-youtube');
const closeYoutubeBtn = document.getElementById('close-youtube');
const closeYoutubeTopBtn = document.getElementById('close-youtube-top');
const currentTrack = document.getElementById('current-track');
const fullscreenBtn = document.querySelector('.fullscreen-btn');
const errorMessage = document.getElementById('error-message');
const stationButtons = document.querySelectorAll('.station-btn');

let currentStream = 'audio';
let isPlaying = false;
let ytPlayer;
let youtubeAPILoaded = false;
let currentStation = 'lofi';

// Lofi stansiyalar
const stations = {
    lofi: {
        url: 'https://stream.lofi.co/lofi.co',
        name: 'Lofi Hip Hop Radio'
    },
    chill: {
        url: 'https://stream.chillhop.com/morning.mp3',
        name: 'Chillhop Music'
    },
    jazz: {
        url: 'https://jazz-wr04.ice.infomaniak.ch/jazz-wr04-128.mp3',
        name: 'Coffee Shop Jazz'
    }
};

// Xato xabarini ko'rsatish
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Extract YouTube ID
function getYouTubeId(url) {
    if (!url) return null;
    if (url.length === 11 && !url.includes(' ')) return url;
    
    // Turli formatlarni qayta ishlash
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// YouTube API yuklash
function loadYouTubeAPI() {
    return new Promise((resolve, reject) => {
        if (window.YT && window.YT.Player) {
            youtubeAPILoaded = true;
            resolve();
            return;
        }
        
        // Agar allaqachon yuklangan bo'lsa
        if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
            // API yuklanishini kutish
            const checkInterval = setInterval(() => {
                if (window.YT && window.YT.Player) {
                    clearInterval(checkInterval);
                    youtubeAPILoaded = true;
                    resolve();
                }
            }, 100);
            
            // 5 soniyadan keyin timeout
            setTimeout(() => {
                clearInterval(checkInterval);
                if (!window.YT) {
                    reject(new Error('YouTube API failed to load'));
                }
            }, 5000);
            return;
        }
        
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        // Global YouTube API ready funktsiyasi
        window.onYouTubeIframeAPIReady = function() {
            youtubeAPILoaded = true;
            resolve();
        };
        
        // Timeout for API load
        setTimeout(() => {
            if (!youtubeAPILoaded) {
                reject(new Error('YouTube API load timeout'));
            }
        }, 5000);
    });
}

// Play YouTube in background
function playYouTubeBackground(url) {
    const videoId = getYouTubeId(url);
    if (!videoId) {
        showError('Invalid YouTube URL or ID');
        return;
    }
    
    // Pause default audio
    if (!audio.paused) {
        audio.pause();
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
    
    // YouTube API yuklash va player ishga tushirish
    loadYouTubeAPI()
    .then(() => {
        initYouTubePlayer(videoId);
    })
    .catch(error => {
        console.error('YouTube API load error:', error);
        showError('YouTube is not available. Using default audio.');
        // YouTube ishlamasa, default audio ni ishga tushirish
        playStation(currentStation);
    });
}

// YouTube player ishga tushirish
function initYouTubePlayer(videoId) {
    try {
        // Avvalgi player ni yo'q qilish
        if (ytPlayer) {
            try {
                ytPlayer.destroy();
            } catch (e) {
                console.error('Error destroying previous player:', e);
            }
        }
        
        // Yangi player yaratish
        ytPlayer = new YT.Player('youtube-iframe', {
            height: '0',
            width: '0',
            videoId: videoId,
            playerVars: {
                'autoplay': 1,
                'controls': 0,
                'disablekb': 1,
                'modestbranding': 1,
                'playsinline': 1,
                'origin': window.location.origin // Xatoni oldini olish uchun
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
        
        currentStream = 'youtube';
        currentTrack.textContent = `YouTube: ${videoId}`;
        
        // YouTube uchun vaqt ko'rsatkichini sozlash
        totalTimeEl.textContent = '∞';
        currentTimeEl.textContent = '0:00';
        progress.style.width = '0%';
    } catch (error) {
        console.error('YouTube Player init error:', error);
        showError('YouTube player error. Using default audio.');
        playStation(currentStation);
    }
}

function onPlayerReady(event) {
    try {
        event.target.playVideo();
        isPlaying = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        
        // Ovozni sozlash
        const volume = parseFloat(volumeSlider.value);
        event.target.setVolume(volume * 100);
        
        // YouTube video davomiyligini olish
        const duration = event.target.getDuration();
        if (duration && duration > 0) {
            totalTimeEl.textContent = formatTime(duration);
        }
    } catch (error) {
        console.error('Player ready error:', error);
    }
}

function onPlayerStateChange(event) {
    // YouTube player holati o'zgarganda
    if (event.data == YT.PlayerState.ENDED) {
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else if (event.data == YT.PlayerState.PLAYING) {
        isPlaying = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        
        // YouTube video vaqtini yangilash
        setInterval(() => {
            if (ytPlayer && ytPlayer.getCurrentTime) {
                try {
                    const currentTime = ytPlayer.getCurrentTime();
                    currentTimeEl.textContent = formatTime(currentTime);
                    
                    // Progress barni yangilash
                    const duration = ytPlayer.getDuration();
                    if (duration > 0) {
                        const progressPercent = (currentTime / duration) * 100;
                        progress.style.width = `${progressPercent}%`;
                    }
                } catch (e) {
                    console.error('Error updating YouTube time:', e);
                }
            }
        }, 1000);
    } else if (event.data == YT.PlayerState.PAUSED) {
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

function onPlayerError(event) {
    console.error('YouTube Player error:', event.data);
    showError('Video playback error. Using default audio.');
    playStation(currentStation);
}

// Stansiyani ijro etish
function playStation(stationKey) {
    currentStream = 'audio';
    currentStation = stationKey;
    
    // Faol stansiya tugmasini yangilash
    stationButtons.forEach(btn => {
        if (btn.dataset.station === stationKey) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Audio manbasini o'zgartirish
    audio.src = stations[stationKey].url;
    currentTrack.textContent = stations[stationKey].name;
    
    // Audio ni yangidan yuklash va ijro etish
    audio.load();
    audio.play()
    .then(() => {
        isPlaying = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        totalTimeEl.textContent = '∞'; // Canlı yayın için sonsuzluk işareti
    })
    .catch(error => {
        console.error('Audio play error:', error);
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        showError('Audio playback error. Please try again.');
    });
}

// Play/Pause toggle
function togglePlay() {
    if (currentStream === 'youtube') {
        if (!ytPlayer) {
            playStation(currentStation);
            return;
        }
        try {
            if (isPlaying) {
                ytPlayer.pauseVideo();
            } else {
                ytPlayer.playVideo();
            }
        } catch (error) {
            console.error('YouTube control error:', error);
            playStation(currentStation);
        }
    } else {
        if (audio.paused) {
            audio.play();
            isPlaying = true;
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            audio.pause();
            isPlaying = false;
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }
}

// Format time
function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Update progress bar
function updateProgress() {
    if (currentStream === 'audio') {
        const { currentTime, duration } = audio;
        
        // Canlı yayınlarda duration NaN olabilir
        if (isNaN(duration) || !isFinite(duration)) {
            progress.style.width = '0%';
            currentTimeEl.textContent = formatTime(currentTime);
            totalTimeEl.textContent = '∞';
            return;
        }
        
        const progressPercent = (currentTime / duration) * 100;
        progress.style.width = `${progressPercent}%`;
        
        currentTimeEl.textContent = formatTime(currentTime);
        totalTimeEl.textContent = formatTime(duration);
    }
}

// Set progress
function setProgress(e) {
    if (currentStream === 'audio') {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        
        // Canlı yayınlarda seek özelliği olmayabilir
        if (isNaN(duration) || !isFinite(duration)) {
            showError('Cannot seek in live stream');
            return;
        }
        
        audio.currentTime = (clickX / width) * duration;
    } else if (currentStream === 'youtube' && ytPlayer) {
        try {
            const width = this.clientWidth;
            const clickX = e.offsetX;
            const duration = ytPlayer.getDuration();
            const newTime = (clickX / width) * duration;
            ytPlayer.seekTo(newTime, true);
        } catch (error) {
            console.error('YouTube seek error:', error);
        }
    }
}

// Volume control
function setVolume() {
    const volume = volumeSlider.value;
    
    if (currentStream === 'audio') {
        audio.volume = volume;
    } else if (ytPlayer) {
        try {
            ytPlayer.setVolume(volume * 100);
        } catch (error) {
            console.error('Volume set error:', error);
        }
    }
}

// Keyingi stansiyaga o'tish
function nextStation() {
    const stationKeys = Object.keys(stations);
    const currentIndex = stationKeys.indexOf(currentStation);
    const nextIndex = (currentIndex + 1) % stationKeys.length;
    playStation(stationKeys[nextIndex]);
}

// Oldingi stansiyaga qaytish
function prevStation() {
    const stationKeys = Object.keys(stations);
    const currentIndex = stationKeys.indexOf(currentStation);
    const prevIndex = (currentIndex - 1 + stationKeys.length) % stationKeys.length;
    playStation(stationKeys[prevIndex]);
}

// Modal toggle
youtubeBtn.addEventListener('click', () => {
    youtubeModal.style.display = 'flex';
    setTimeout(() => youtubeModal.classList.add('active'), 10);
    youtubeUrl.focus();
});

function closeModal() {
    youtubeModal.classList.remove('active');
    setTimeout(() => youtubeModal.style.display = 'none', 300);
}

closeYoutubeBtn.addEventListener('click', closeModal);
closeYoutubeTopBtn.addEventListener('click', closeModal);

// Add YouTube
addYoutubeBtn.addEventListener('click', () => {
    const url = youtubeUrl.value.trim();
    if (url) playYouTubeBackground(url);
    closeModal();
    youtubeUrl.value = '';
});

// Enter tugmasi bilan YouTube qo'shish
youtubeUrl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const url = youtubeUrl.value.trim();
        if (url) playYouTubeBackground(url);
        closeModal();
        youtubeUrl.value = '';
    }
});

// Default audio
audio.volume = 0.7;
audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('ended', () => {
    isPlaying = false;
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
});
audio.addEventListener('error', (e) => {
    console.error('Audio error:', e);
    showError('Audio stream error. Please try another station.');
});

// Play button
playBtn.addEventListener('click', togglePlay);

// Stansiya tugmalari
stationButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        playStation(btn.dataset.station);
    });
});

// Next/Previous tugmalari
nextBtn.addEventListener('click', nextStation);
prevBtn.addEventListener('click', prevStation);

// Progress bar click
progressContainer.addEventListener('click', setProgress);

// Volume control
volumeSlider.addEventListener('input', setVolume);

// Click outside modal closes
youtubeModal.addEventListener('click', e => {
    if (e.target === youtubeModal) closeModal();
});

// Keyboard controls
document.addEventListener('keydown', e => {
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
    } else if (e.code === 'KeyF') toggleFullscreen();
    else if (e.code === 'Escape' && youtubeModal.classList.contains('active')) closeModal();
    else if (e.code === 'ArrowRight') nextStation();
    else if (e.code === 'ArrowLeft') prevStation();
});

// Fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.warn(err));
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        document.exitFullscreen();
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
}

fullscreenBtn.addEventListener('click', toggleFullscreen);

// Optional: visual effects
document.addEventListener('mousemove', e => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    const gif = document.querySelector('.mona-gif');
    gif.style.transform = `translate(${x*10-5}px, ${y*10-5}px) scale(1.05)`;
});

// Oldindan YouTube API yuklash
window.addEventListener('load', () => {
    // Dastlabki stansiyani ishga tushirish
    playStation(currentStation);
    
    // Foydalanuvchi YouTube tugmasini bosganda tezroq ishlashi uchun
    youtubeBtn.addEventListener('mouseover', () => {
        if (!youtubeAPILoaded && !window.YT) {
            loadYouTubeAPI().catch(err => console.log('Preload YouTube API failed:', err));
        }
    }, { once: true });
});