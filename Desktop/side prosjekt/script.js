// Drag button functionality - optimized for all devices
const dragButton = document.getElementById('dragButton');
let isGrabbed = false;
let offsetX = 0;
let offsetY = 0;

// Get button dimensions
const buttonWidth = dragButton.offsetWidth;
const buttonHeight = dragButton.offsetHeight;

// Set initial position (center of screen)
const initialX = (window.innerWidth / 2 - buttonWidth / 2);
const initialY = (window.innerHeight / 2 - buttonHeight / 2);

dragButton.style.left = initialX + 'px';
dragButton.style.top = initialY + 'px';

// Mouse down - start dragging
dragButton.addEventListener('mousedown', startDrag);

// Mouse move - drag the button
document.addEventListener('mousemove', moveDrag);

// Mouse up - stop dragging
document.addEventListener('mouseup', stopDrag);

// Touch support for mobile
dragButton.addEventListener('touchstart', startDrag, { passive: false });
document.addEventListener('touchmove', moveDrag, { passive: false });
document.addEventListener('touchend', stopDrag);

function startDrag(e) {
    isGrabbed = true;
    
    const rect = dragButton.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;
    
    dragButton.style.transition = 'none';
    dragButton.style.cursor = 'grabbing';
    
    if (e.preventDefault) {
        e.preventDefault();
    }
}

function moveDrag(e) {
    if (!isGrabbed) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    let newX = clientX - offsetX;
    let newY = clientY - offsetY;

    // Boundary checking
    newX = Math.max(0, Math.min(newX, window.innerWidth - buttonWidth));
    newY = Math.max(0, Math.min(newY, window.innerHeight - buttonHeight));

    dragButton.style.left = newX + 'px';
    dragButton.style.top = newY + 'px';
    
    if (e.preventDefault) {
        e.preventDefault();
    }
}

function stopDrag() {
    if (isGrabbed) {
        isGrabbed = false;
        dragButton.style.cursor = 'grab';
        dragButton.style.transition = 'box-shadow 0.3s ease';
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    if (!isGrabbed) {
        // Keep button within bounds on resize
        const rect = dragButton.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            dragButton.style.left = (window.innerWidth - buttonWidth) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            dragButton.style.top = (window.innerHeight - buttonHeight) + 'px';
        }
    }
});

// Device orientation change support
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        const rect = dragButton.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            dragButton.style.left = (window.innerWidth - buttonWidth) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            dragButton.style.top = (window.innerHeight - buttonHeight) + 'px';
        }
    }, 100);
});
