// Matrix Rain Effect
const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Matrix rain characters
let chars = ['*']; // Default character

// Function to update matrix text
function updateMatrixText() {
    const text = document.getElementById('matrixText').value;
    const newChars = Array.from(new Set(text.split(''))).filter(char => char.trim());
    chars = newChars.length > 0 ? newChars : ['*'];
}

// Initialize with default text
updateMatrixText();

// Add button click handler
document.getElementById('matrixButton').addEventListener('click', updateMatrixText);

// Also update on Enter key
document.getElementById('matrixText').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        updateMatrixText();
    }
});

// Set font size based on device
let fontSize = 14;
let matrixColor = '#00ff00';
let animationSpeed = 50;
let lastDrawTime = 0;
let drops = [];
let columns = 0;
let animationFrameId = null;

function initMatrix() {
    // Calculate columns based on current font size
    columns = Math.ceil(canvas.width / fontSize);
    drops = [];
    for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * -100;
    }
}

// Resize handler
function handleResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initMatrix();
}

window.addEventListener('resize', handleResize);
handleResize(); // Initial setup

// Function to draw matrix rain
function drawMatrixRain() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = matrixColor;
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < columns; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

function draw(timestamp) {
    if (!lastDrawTime) lastDrawTime = timestamp;
    const elapsed = timestamp - lastDrawTime;
    
    if (elapsed > animationSpeed) {
        drawMatrixRain();
        lastDrawTime = timestamp;
    }
    
    animationFrameId = requestAnimationFrame(draw);
}

// Handle color picker changes
const colorPicker = document.getElementById('colorPicker');
colorPicker.addEventListener('input', (e) => {
    matrixColor = e.target.value;
});

// Handle speed slider changes
const speedSlider = document.getElementById('speedSlider');
speedSlider.addEventListener('input', (e) => {
    animationSpeed = 210 - parseInt(e.target.value); // Invert the value so higher = faster
});

// Font size control
const fontSlider = document.getElementById('fontSlider');
fontSize = parseInt(fontSlider.value);

fontSlider.addEventListener('input', (e) => {
    fontSize = parseInt(e.target.value);
    ctx.font = `${fontSize}px monospace`;
    // Reinitialize matrix when font size changes
    initMatrix();
});

// Start animation
draw();

// Recording setup
let mediaRecorder;
let recordedChunks = [];

// Get supported MP4 MIME type
function getSupportedMimeType() {
    const types = [
        'video/mp4;codecs=avc3,mp4a.40.2',  // Modern H.264 with AAC
        'video/mp4;codecs=avc3',            // Modern H.264
        'video/mp4;codecs=h264,mp4a.40.2',  // Standard H.264 with AAC
        'video/mp4',                        // Let browser choose codecs
        'video/webm;codecs=vp9,opus',       // Modern WebM fallback
        'video/webm'                        // Basic WebM fallback
    ];
    
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            console.log('Using codec:', type);
            return type;
        }
    }
    console.warn('Falling back to WebM');
    return 'video/webm';
}

// Initialize media recorder with max quality
function initMediaRecorder() {
    const stream = canvas.captureStream(60); // 60 FPS
    const options = {
        mimeType: getSupportedMimeType(),
        videoBitsPerSecond: 8000000, // 8 Mbps
        audioBitsPerSecond: 128000   // 128 kbps
    };

    try {
        mediaRecorder = new MediaRecorder(stream, options);
        console.log('MediaRecorder initialized with:', mediaRecorder.mimeType);
    } catch (e) {
        console.error('Recording not supported:', e);
        return;
    }

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            recordedChunks.push(e.data);
        }
    };
}

// Initialize recorder
initMediaRecorder();

mediaRecorder.addEventListener('stop', () => {
    const mimeType = mediaRecorder.mimeType;
    const isMP4 = mimeType.includes('mp4') || mimeType.includes('matroska');
    const fileName = 'SynthRain-drbaph.' + (isMP4 ? 'mp4' : 'webm');
    
    const blob = new Blob(recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    recordedChunks = [];
});

// Add recording button handlers
const recordButton = document.getElementById('recordButton');
const recordIcon = recordButton.querySelector('i');
let isRecording = false;

recordButton.onclick = () => {
    if (!isRecording) {
        // Start recording
        recordedChunks = [];
        try {
            mediaRecorder.start();
            isRecording = true;
            recordButton.classList.add('recording', 'pulsing-element');
            recordIcon.className = 'ph-bold ph-video-camera-slash';
        } catch (e) {
            console.error('Recording start error:', e);
            alert('Failed to start recording. Your browser might not support this feature.');
        }
    } else {
        // Stop recording
        try {
            mediaRecorder.stop();
            isRecording = false;
            recordButton.classList.remove('recording', 'pulsing-element');
            recordIcon.className = 'ph-bold ph-video-camera';
        } catch (e) {
            console.error('Recording stop error:', e);
        }
    }
};

// Add photo capture functionality
const photoButton = document.getElementById('photoButton');

photoButton.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'SynthRain-drbaph.jpg';
    link.href = canvas.toDataURL('image/jpeg', 1.0); // Maximum JPEG quality
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    photoButton.classList.add('flashing');
    setTimeout(() => photoButton.classList.remove('flashing'), 500);
});

// Add fullscreen functionality
const fullscreenButton = document.getElementById('fullscreenButton');

function isFullscreen() {
    return document.fullscreenElement || 
           document.webkitFullscreenElement || 
           document.mozFullScreenElement ||
           document.msFullscreenElement;
}

function toggleFullscreen() {
    if (!isFullscreen()) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// Update button state when fullscreen changes
function updateFullscreenButtonState() {
    const isFs = isFullscreen();
    const icon = fullscreenButton.querySelector('i');
    
    if (isFs) {
        fullscreenButton.classList.add('fullscreen-active', 'pulsing-element');
        icon.className = 'ph-bold ph-corners-out';
    } else {
        fullscreenButton.classList.remove('fullscreen-active', 'pulsing-element');
        icon.className = 'ph-bold ph-corners-in';
    }
}

// Listen for all possible fullscreen events
const fullscreenEvents = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange'
];

fullscreenEvents.forEach(eventType => {
    document.addEventListener(eventType, updateFullscreenButtonState);
});

// Also check periodically for fullscreen state
setInterval(() => {
    if (!isFullscreen()) {
        updateFullscreenButtonState();
    }
}, 1000);

fullscreenButton.addEventListener('click', () => {
    toggleFullscreen();
});

// Initialize button state
updateFullscreenButtonState();

// Add toggle functionality
const toggleBtn = document.getElementById('toggleInput');
const inputContainer = document.querySelector('.input-container');
const bottomContainer = document.querySelector('.bottom-container');

// GitHub link visibility
const githubLink = document.getElementById('github-link');

function updateGithubLinkVisibility() {
    if (inputContainer.classList.contains('hidden')) {
        githubLink.classList.add('visible');
    } else {
        githubLink.classList.remove('visible');
    }
}

toggleBtn.addEventListener('click', () => {
    inputContainer.classList.toggle('hidden');
    bottomContainer.classList.toggle('hidden');
    updateGithubLinkVisibility();
    const icon = toggleBtn.querySelector('i');
    icon.className = inputContainer.classList.contains('hidden') ? 
        'ph-bold ph-eye-slash' : 'ph-bold ph-eye';
});

// Initialize GitHub link visibility
updateGithubLinkVisibility();

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Toggle input box with Escape key
    if (e.key === 'Escape') {
        toggleBtn.click();
    }
});

// Synchronize animations using scroll position
document.documentElement.style.setProperty('--scroll-position', window.pageYOffset / 100);
