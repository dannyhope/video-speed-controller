document.addEventListener('DOMContentLoaded', async () => {
    const speedListElement = document.getElementById('speedList');
    const statusElement = document.getElementById('status');
    const defaultSpeeds = [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 6, 10];

    // Load speeds
    const result = await chrome.storage.sync.get('customSpeeds');
    const savedSpeeds = result.customSpeeds || defaultSpeeds;
    
    // Populate textarea with speeds
    speedListElement.value = savedSpeeds.join('\n');

    // Save speeds when changed
    speedListElement.addEventListener('input', async () => {
        // Parse speeds, filter out invalid entries
        const speeds = speedListElement.value
            .split('\n')
            .map(speed => parseFloat(speed.trim()))
            .filter(speed => !isNaN(speed) && speed >= 0.05 && speed <= 16);

        // Save to storage
        await chrome.storage.sync.set({ customSpeeds: speeds });

        // Show status
        statusElement.style.opacity = '1';
        setTimeout(() => {
            statusElement.style.opacity = '0';
        }, 250);
    });
});
