var CONFIG_FILE = 'config.json';

function loadConfig(callback) {
    var xhr = new XMLHttpRequest();
    // Cache busting to ensure we get the latest config if it was updated
    xhr.open('GET', CONFIG_FILE + '?t=' + new Date().getTime(), true);
    
    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                var config = JSON.parse(xhr.responseText);
                callback(null, config);
            } catch (e) {
                callback('Failed to parse config JSON', null);
            }
        } else {
            callback('Failed to load config: ' + xhr.status, null);
        }
    };
    
    xhr.onerror = function() {
        callback('Network error loading config', null);
    };
    
    xhr.send();
}

function extractCanvaUrl(input) {
    if (!input) return '';
    
    // If they pasted the full HTML Embed Code, extract the iframe src safely
    if (input.indexOf('<iframe') !== -1) {
        var temp = document.createElement('div');
        temp.innerHTML = input;
        var iframe = temp.querySelector('iframe');
        if (iframe && iframe.src) {
            return iframe.src;
        }
    }
    
    // If they pasted a regular Canva URL but forgot the ?embed part
    if (input.indexOf('canva.com') !== -1 && input.indexOf('view') !== -1 && input.indexOf('embed') === -1) {
        return input.split('view')[0] + 'view?embed';
    }
    
    return input;
}

var cycleTimer = null;
var currentSlide = 1;

function loadIframe(url, config) {
    var container = document.getElementById('container');
    container.innerHTML = ''; // Clear existing
    
    var iframe = document.createElement('iframe');
    var baseSrc = extractCanvaUrl(url);
    
    // Remove any existing hash
    baseSrc = baseSrc.split('#')[0];
    
    // Auto-cycle start at slide 1
    if (config && config.autoCycleSlides && config.totalSlides > 1) {
        iframe.src = baseSrc + '#' + currentSlide;
    } else {
        iframe.src = baseSrc;
    }
    
    iframe.setAttribute('allowfullscreen', 'allowfullscreen');
    iframe.setAttribute('allow', 'fullscreen; autoplay');
    container.appendChild(iframe);
    
    if (config && config.autoCycleSlides && config.totalSlides > 1) {
        if (cycleTimer) clearInterval(cycleTimer);
        
        var slideMs = (config.slideTimeSeconds || 10) * 1000;
        cycleTimer = setInterval(function() {
            currentSlide++;
            if (currentSlide > config.totalSlides) currentSlide = 1;
            // Hack: Changing only the hash forces Canva to change slides
            iframe.src = baseSrc + '#' + currentSlide;
        }, slideMs);
    }
}

function updateOfflineIndicator(isOffline) {
    var indicator = document.getElementById('offline-indicator');
    if (isOffline) {
        var lastSuccess = localStorage.getItem('signageLastSuccess');
        var daysOffline = 0;
        if (lastSuccess) {
            var diffMs = new Date().getTime() - parseInt(lastSuccess, 10);
            daysOffline = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }
        document.getElementById('offline-days').innerText = daysOffline;
        indicator.className = indicator.className.replace('hidden', '').trim();
    } else {
        if (indicator.className.indexOf('hidden') === -1) {
            indicator.className += ' hidden';
        }
    }
}

function checkNetworkAndRefresh() {
    // Attempt to load the config. If it succeeds, we have internet and can safely reload.
    // If it fails, we are offline, so we just show the indicator and leave the current cached presentation playing.
    loadConfig(function(err, config) {
        if (err || !config) {
            console.log('Network check failed. Showing offline indicator.');
            updateOfflineIndicator(true);
        } else {
            console.log('Network check passed. Reloading page to fetch latest presentation.');
            localStorage.setItem('signageLastSuccess', new Date().getTime().toString());
            window.location.reload();
        }
    });
}

function scheduleNextHourlyRefresh() {
    var now = new Date();
    // Calculate exactly how many milliseconds until the top of the next hour
    var nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
    var msUntilNextHour = nextHour.getTime() - now.getTime();
    
    // Add a tiny random delay (0-5 seconds) so if you have multiple TVs, 
    // they don't all hit the network at the exact same millisecond
    var randomJitter = Math.floor(Math.random() * 5000);
    
    console.log('Next refresh scheduled for the top of the hour (in ' + Math.round(msUntilNextHour / 60000) + ' minutes).');
    
    setTimeout(function() {
        console.log('Top of the hour reached! Performing network check and refresh...');
        checkNetworkAndRefresh();
        
        // Schedule the next hour's check in case the network fails and it doesn't reload the page
        scheduleNextHourlyRefresh();
    }, msUntilNextHour + randomJitter);
}

function init() {
    document.getElementById('loading').className = document.getElementById('loading').className.replace('hidden', '');
    
    loadConfig(function(err, config) {
        if (config) {
            // Record successful load
            localStorage.setItem('signageLastSuccess', new Date().getTime().toString());
            updateOfflineIndicator(false);
            
            var isPortrait = false;
            if (window.matchMedia) {
                isPortrait = window.matchMedia("(orientation: portrait)").matches;
            }
            
            // Try to get the URL for the current orientation, with fallback
            var targetUrl = isPortrait ? config.canvaEmbedUrlPortrait : config.canvaEmbedUrlLandscape;
            
            // If the preferred orientation is empty, fallback to the other one (or the old 'canvaEmbedUrl' key)
            if (!targetUrl) {
                targetUrl = config.canvaEmbedUrlLandscape || config.canvaEmbedUrlPortrait || config.canvaEmbedUrl;
            }
            
            if (targetUrl) {
                loadIframe(targetUrl, config);
                
                // Schedule the system to refresh exactly on the hour
                scheduleNextHourlyRefresh();
            } else {
                document.getElementById('container').innerHTML = '<div style="color: white; padding: 20px;">Please configure your Canva Embed URLs in config.json</div>';
            }
        } else {
            console.error(err);
            updateOfflineIndicator(true);
            document.getElementById('container').innerHTML = '<div style="color: white; padding: 20px;">Error loading configuration or offline. Waiting for network...</div>';
            
            // Try again in a bit if we failed the very first load
            setTimeout(checkNetworkAndRefresh, 60000); // Check again in 1 minute
        }
        
        var loadingEl = document.getElementById('loading');
        if (loadingEl.className.indexOf('hidden') === -1) {
            loadingEl.className += ' hidden';
        }
    });
}

init();

// Simple error recovery: if the network drops and comes back, reload the page
window.addEventListener('online', function() {
    console.log('Network back online, verifying and reloading...');
    setTimeout(checkNetworkAndRefresh, 5000);
});

// Reload if the screen orientation changes (e.g., if you test by rotating a tablet)
if (window.matchMedia) {
    window.matchMedia("(orientation: portrait)").addEventListener("change", function() {
        console.log('Orientation changed, reloading to fetch appropriate presentation...');
        checkNetworkAndRefresh();
    });
}
