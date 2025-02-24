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

function initMediaRecorder() {
    // Detect mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Set FPS based on device
    const fps = isMobile ? 30 : 60;
    const stream = canvas.captureStream(fps);
    
    // Configure options based on device
    const options = {
        videoBitsPerSecond: isMobile ? 3000000 : 8000000, // 3Mbps for mobile, 8Mbps for desktop
        audioBitsPerSecond: 128000
    };

    let mediaRecorder = null;

    if (isMobile) {
        // Mobile: Try WebM first and only
        try {
            options.mimeType = 'video/webm;codecs=vp8';
            mediaRecorder = new MediaRecorder(stream, options);
            console.log('Using WebM VP8 on mobile');
        } catch (e) {
            console.error('WebM recording not supported on this mobile device:', e);
            alert('Sorry, video recording is not supported on this device. Try using a different browser.');
            return null;
        }
    } else {
        // Desktop: Try MP4/H.264 first
        const mimeTypes = [
            'video/mp4;codecs=h264,aac',
            'video/mp4;codecs=h264',
            'video/mp4',
            'video/webm;codecs=h264',
            'video/webm;codecs=vp8',
            'video/webm'
        ];

        // Find first supported MIME type
        const supportedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
        
        if (!supportedType) {
            console.error('No supported video format found');
            alert('Sorry, video recording is not supported in this browser.');
            return null;
        }

        try {
            options.mimeType = supportedType;
            mediaRecorder = new MediaRecorder(stream, options);
            console.log('Using format:', supportedType);
        } catch (e) {
            console.error('Failed to initialize MediaRecorder:', e);
            alert('Sorry, video recording failed to initialize.');
            return null;
        }
    }

    if (!mediaRecorder) return null;

    let chunks = [];
    let maxChunks = isMobile ? 30 : 1000; // Limit chunks on mobile
    
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunks.push(e.data);
            
            // For mobile, maintain a rolling window of chunks
            if (isMobile && chunks.length > maxChunks) {
                const oldestChunk = chunks.shift();
                if (oldestChunk) {
                    URL.revokeObjectURL(oldestChunk);
                }
            }
        }
    };

    mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType;
        const fileExtension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const filename = 'SynthRain-' + new Date().toISOString().slice(0,19).replace(/[-:]/g, '') + '.' + fileExtension;
        
        try {
            const blob = new Blob(chunks, { type: mimeType });
            chunks = [];
            const url = URL.createObjectURL(blob);
            
            if (isMobile) {
                showMobilePreview(url, blob, filename);
            } else {
                // Desktop download
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 100);
            }
        } catch (e) {
            console.error('Error creating video:', e);
            alert('Failed to create video. Please try again with a shorter recording.');
            chunks = [];
        }
    };

    return mediaRecorder;
}

// Separate function for mobile preview to keep code organized
function showMobilePreview(url, blob, filename) {
    // Create video preview element
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.style.position = 'fixed';
    video.style.top = '50%';
    video.style.left = '50%';
    video.style.transform = 'translate(-50%, -50%)';
    video.style.maxWidth = '90%';
    video.style.maxHeight = '70vh';
    video.style.backgroundColor = 'black';
    video.style.zIndex = '10000';
    video.style.borderRadius = '8px';
    video.style.border = '1px solid #0f0';

    // Create modal container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.backgroundColor = 'rgba(0,0,0,0.9)';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';

    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.gap = '10px';
    buttonsContainer.style.marginTop = '20px';
    buttonsContainer.style.flexWrap = 'wrap';
    buttonsContainer.style.justifyContent = 'center';
    buttonsContainer.style.padding = '0 20px';

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="ph-bold ph-x"></i>';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '10px';
    closeBtn.style.backgroundColor = '#000';
    closeBtn.style.border = '1px solid #0f0';
    closeBtn.style.color = '#0f0';
    closeBtn.style.width = '40px';
    closeBtn.style.height = '40px';
    closeBtn.style.borderRadius = '50%';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';

    // Handle closing
    const closeModal = () => {
        document.body.removeChild(container);
        URL.revokeObjectURL(url);
    };
    closeBtn.onclick = closeModal;

    // Add share button (primary action on mobile)
    const shareBtn = document.createElement('button');
    shareBtn.innerHTML = '<i class="ph-bold ph-share"></i> Share';
    shareBtn.style.padding = '10px 20px';
    shareBtn.style.backgroundColor = '#000';
    shareBtn.style.border = '1px solid #0f0';
    shareBtn.style.color = '#0f0';
    shareBtn.style.borderRadius = '5px';
    shareBtn.style.fontFamily = 'Techfont, monospace';
    shareBtn.style.cursor = 'pointer';
    shareBtn.style.display = 'flex';
    shareBtn.style.alignItems = 'center';
    shareBtn.style.gap = '5px';

    // Handle share
    shareBtn.onclick = async () => {
        try {
            const file = new File([blob], filename, { type: blob.type });
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'SynthRain Recording',
                });
                closeModal(); // Close after successful share
            } else {
                throw new Error('Share not supported');
            }
        } catch (e) {
            console.warn('Share failed, falling back to download:', e);
            // Fall back to download
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
        }
    };

    // Add save button (backup option)
    const saveBtn = document.createElement('button');
    saveBtn.innerHTML = '<i class="ph-bold ph-download"></i> Save';
    saveBtn.style.padding = '10px 20px';
    saveBtn.style.backgroundColor = '#000';
    saveBtn.style.border = '1px solid #0f0';
    saveBtn.style.color = '#0f0';
    saveBtn.style.borderRadius = '5px';
    saveBtn.style.fontFamily = 'Techfont, monospace';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.display = 'flex';
    saveBtn.style.alignItems = 'center';
    saveBtn.style.gap = '5px';

    // Handle save
    saveBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    };

    buttonsContainer.appendChild(shareBtn);
    buttonsContainer.appendChild(saveBtn);
    container.appendChild(video);
    container.appendChild(buttonsContainer);
    container.appendChild(closeBtn);
    document.body.appendChild(container);

    // Auto-play the preview
    video.play().catch(console.error);
}

// Record button handler
const recordButton = document.getElementById('recordButton');
let isRecording = false;
let recordingTimeout;

recordButton.addEventListener('click', () => {
    if (!isRecording) {
        // Start recording
        mediaRecorder = initMediaRecorder();
        if (!mediaRecorder) return; // Exit if initialization failed
        
        mediaRecorder.start(1000); // Record in 1-second chunks
        isRecording = true;
        recordButton.classList.add('recording');
        recordButton.querySelector('i').className = 'ph-bold ph-stop-circle';
        
        // For mobile, limit recording duration to 30 seconds
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            recordingTimeout = setTimeout(() => {
                if (isRecording) {
                    mediaRecorder.stop();
                    isRecording = false;
                    recordButton.classList.remove('recording');
                    recordButton.querySelector('i').className = 'ph-bold ph-video-camera';
                }
            }, 30000);
        }
    } else {
        // Stop recording
        mediaRecorder.stop();
        isRecording = false;
        recordButton.classList.remove('recording');
        recordButton.querySelector('i').className = 'ph-bold ph-video-camera';
        if (recordingTimeout) {
            clearTimeout(recordingTimeout);
        }
    }
});

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
