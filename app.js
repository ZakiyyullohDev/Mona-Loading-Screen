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
 
 const stations = {
    lofi: {
        url: 'https://listen.reyfm.de/lofi_128kbps.mp3',
        name: 'Lo-Fi (reyfm.de 128 kbps)'
    },
    chill: {
        url: 'https://streams.fluxfm.de/Chillhop/mp3-128/streams.fluxfm.de/',
        name: 'Chillhop Music (FluxFM mp3-128)'
    },
    jazz: {
        url: 'https://jazz-wr04.ice.infomaniak.ch/jazz-wr04-128.mp3',
        name: 'Coffee Shop Jazz'
    }
};

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

function getYouTubeId(url) {
    if (!url) return null;
    if (url.length === 11 && !url.includes(' ')) return url;
    
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function loadYouTubeAPI() {
    return new Promise((resolve, reject) => {
        if (window.YT && window.YT.Player) {
            youtubeAPILoaded = true;
            resolve();
            return;
        }
        
        if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
            const checkInterval = setInterval(() => {
                if (window.YT && window.YT.Player) {
                    clearInterval(checkInterval);
                    youtubeAPILoaded = true;
                    resolve();
                }
            }, 100);
            
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
        
        window.onYouTubeIframeAPIReady = function() {
            youtubeAPILoaded = true;
            resolve();
        };
        
        setTimeout(() => {
            if (!youtubeAPILoaded) {
                reject(new Error('YouTube API load timeout'));
            }
        }, 5000);
    });
}

function playYouTubeBackground(url) {
    const videoId = getYouTubeId(url);
    if (!videoId) {
        showError('Invalid YouTube URL or ID');
        return;
    }
    
    if (!audio.paused) {
        audio.pause();
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
    
    loadYouTubeAPI()
    .then(() => {
        initYouTubePlayer(videoId);
    })
    .catch(error => {
        console.error('YouTube API load error:', error);
        showError('YouTube is not available. Using default audio.');
        playStation(currentStation);
    });
}

function initYouTubePlayer(videoId) {
    try {
        if (ytPlayer) {
            try {
                ytPlayer.destroy();
            } catch (e) {
                console.error('Error destroying previous player:', e);
            }
        }
        
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
                'origin': window.location.origin
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
        
        currentStream = 'youtube';
        currentTrack.textContent = `YouTube: ${videoId}`;
        
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
        
        const volume = parseFloat(volumeSlider.value);
        event.target.setVolume(volume * 100);
        
        const duration = event.target.getDuration();
        if (duration && duration > 0) {
            totalTimeEl.textContent = formatTime(duration);
        }
    } catch (error) {
        console.error('Player ready error:', error);
    }
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else if (event.data == YT.PlayerState.PLAYING) {
        isPlaying = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        
        setInterval(() => {
            if (ytPlayer && ytPlayer.getCurrentTime) {
                try {
                    const currentTime = ytPlayer.getCurrentTime();
                    currentTimeEl.textContent = formatTime(currentTime);
                    
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
        totalTimeEl.textContent = '∞'; // Live stream uchun
    })
    .catch(error => {
        console.error('Audio play error:', error);
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        showError('Audio playback error. Please click Play button manually.');
    });
}

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

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function updateProgress() {
    if (currentStream === 'audio') {
        const { currentTime, duration } = audio;
        
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

function setProgress(e) {
    if (currentStream === 'audio') {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        
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

function nextStation() {
    const stationKeys = Object.keys(stations);
    const currentIndex = stationKeys.indexOf(currentStation);
    const nextIndex = (currentIndex + 1) % stationKeys.length;
    playStation(stationKeys[nextIndex]);
}

function prevStation() {
    const stationKeys = Object.keys(stations);
    const currentIndex = stationKeys.indexOf(currentStation);
    const prevIndex = (currentIndex - 1 + stationKeys.length) % stationKeys.length;
    playStation(stationKeys[prevIndex]);
}

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

addYoutubeBtn.addEventListener('click', () => {
    const url = youtubeUrl.value.trim();
    if (url) playYouTubeBackground(url);
    closeModal();
    youtubeUrl.value = '';
});

youtubeUrl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const url = youtubeUrl.value.trim();
        if (url) playYouTubeBackground(url);
        closeModal();
        youtubeUrl.value = '';
    }
});

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

playBtn.addEventListener('click', togglePlay);

stationButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        playStation(btn.dataset.station);
    });
});

nextBtn.addEventListener('click', nextStation);
prevBtn.addEventListener('click', prevStation);

progressContainer.addEventListener('click', setProgress);

volumeSlider.addEventListener('input', setVolume);

youtubeModal.addEventListener('click', e => {
    if (e.target === youtubeModal) closeModal();
});

document.addEventListener('keydown', e => {
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
    } else if (e.code === 'KeyF') toggleFullscreen();
    else if (e.code === 'Escape' && youtubeModal.classList.contains('active')) closeModal();
    else if (e.code === 'ArrowRight') nextStation();
    else if (e.code === 'ArrowLeft') prevStation();
});

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

document.addEventListener('mousemove', e => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    const gif = document.querySelector('.mone-gif');
    gif.style.transform = `translate(${x*10-5}px, ${y*10-5}px) scale(1.05)`;
});

window.addEventListener('load', () => {
    playStation(currentStation);
    
    youtubeBtn.addEventListener('mouseover', () => {
        if (!youtubeAPILoaded && !window.YT) {
            loadYouTubeAPI().catch(err => console.log('Preload YouTube API failed:', err));
        }
    }, { once: true });
});