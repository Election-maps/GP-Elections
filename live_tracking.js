/**
 * Live Forces Real-time Tracking (Routes, SF, SSF, QRTs, Reserve Parties)
 * Exclusively active on "Live Route Map" tab (liveMap)
 * Srikakulam District Police
 */

window.livePartyMarkers = {};
window.livePartyMarkersGroup = null;
window.currentLivePartyCategory = 'ALL';
window.liveMqttClient = null;

const LIVE_MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const LIVE_ROOM_CODE = 'SrikakulamPolice';
const liveUserId = 'control_room_gp_' + Math.random().toString(36).substring(2, 9);

// Forces metadata lookup from route_mobiles_data.js
function getPartyUnitMeta(unitId) {
    if (!window.ROUTE_MOBILES_DATA || !Array.isArray(window.ROUTE_MOBILES_DATA)) return null;
    const cleanId = String(unitId || '').trim().toLowerCase();
    return window.ROUTE_MOBILES_DATA.find(function(u) {
        if (!u) return false;
        if (String(u.id || '').trim().toLowerCase() === cleanId) return true;
        if (String(u.unitId || '').trim().toLowerCase() === cleanId) return true;
        return false;
    }) || null;
}

function getLivePartyCategoryTheme(catKey) {
    switch (String(catKey || '').toUpperCase()) {
        case 'SF':
            return { color: '#ef4444', icon: 'fa-shield-halved', label: 'Striking Force', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' };
        case 'SSF':
            return { color: '#a855f7', icon: 'fa-user-shield', label: 'Special Striking Force', badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' };
        case 'QRT':
            return { color: '#f59e0b', icon: 'fa-bolt', label: 'QRT', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' };
        case 'RESERVE':
            return { color: '#10b981', icon: 'fa-building-columns', label: 'Reserve Party', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
        default:
            return { color: '#3b82f6', icon: 'fa-car-side', label: 'Route Mobile', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
}

window.initLivePartyTracking = function() {
    if (typeof liveMap === 'undefined' || !liveMap) {
        setTimeout(window.initLivePartyTracking, 200);
        return;
    }

    if (!window.livePartyMarkersGroup) {
        window.livePartyMarkersGroup = L.layerGroup().addTo(liveMap);
    }

    restoreLiveUnitsFromCache();
    initLiveMQTT();
};

function initLiveMQTT() {
    if (window.liveMqttClient && window.liveMqttClient.connected) return;
    if (typeof mqtt === 'undefined') {
        setTimeout(initLiveMQTT, 300);
        return;
    }

    try {
        window.liveMqttClient = mqtt.connect(LIVE_MQTT_BROKER, {
            clientId: 'gp_cr_' + liveUserId + '_' + Math.random().toString(16).substring(2, 8),
            clean: true,
            connectTimeout: 7000,
            reconnectPeriod: 3000,
            keepalive: 25
        });

        window.liveMqttClient.on('connect', function() {
            console.log('Connected to Srikakulam Police Real-time Broker (Live Route Map)!');
            const dot = document.getElementById('live-mqtt-indicator-dot');
            const txt = document.getElementById('live-mqtt-status-text');
            if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block';
            if (txt) {
                txt.innerText = 'Online';
                txt.className = 'text-emerald-400 font-bold';
            }

            // Subscribe to general locations topic and retained officer topics
            const generalTopic = 'srikakulam_police_tracker/' + LIVE_ROOM_CODE + '/locations';
            const retainedTopic = 'srikakulam_police_tracker/' + LIVE_ROOM_CODE + '/officer/+';
            const controlTopic = 'srikakulam_police_tracker/' + LIVE_ROOM_CODE + '/control_command';
            window.liveMqttClient.subscribe(generalTopic, { qos: 0 });
            window.liveMqttClient.subscribe(controlTopic, { qos: 1 });
            window.liveMqttClient.subscribe(retainedTopic, { qos: 1 }, function(err) {
                if (!err) {
                    const syncTopic = 'srikakulam_police_tracker/' + LIVE_ROOM_CODE + '/sync_request';
                    window.liveMqttClient.publish(syncTopic, JSON.stringify({ type: 'sync_request', from: liveUserId }), { qos: 0 });
                }
            });
        });

        window.liveMqttClient.on('message', function(topic, message) {
            try {
                const str = message.toString().trim();
                if (!str) return;
                const payload = JSON.parse(str);

                // Handle remote clear commands
                if (payload.action === 'clear_all') {
                    clearAllLiveTrackingLocally();
                    return;
                }

                const unitKey = payload.unitId || payload.id || topic.split('/').pop();
                if (!unitKey) return;

                if (payload.status === 'stopped' || payload.action === 'clear_unit') {
                    removeLivePartyUnit(unitKey);
                } else if (payload.latitude || payload.lat) {
                    updateLivePartyUnitOnMap(unitKey, payload);
                }
            } catch (e) {
                console.error('Failed to parse live tracking packet:', e);
            }
        });

        window.liveMqttClient.on('error', function(err) {
            console.warn('MQTT Connection Error:', err);
            const txt = document.getElementById('live-mqtt-status-text');
            if (txt) {
                txt.innerText = 'Reconnecting...';
                txt.className = 'text-amber-400 font-bold';
            }
        });

        window.liveMqttClient.on('offline', function() {
            const txt = document.getElementById('live-mqtt-status-text');
            if (txt) {
                txt.innerText = 'Offline';
                txt.className = 'text-rose-400 font-bold';
            }
        });
    } catch (err) {
        console.error('MQTT Init failed:', err);
    }
}

function updateLivePartyUnitOnMap(key, data) {
    if (typeof liveMap === 'undefined' || !liveMap || !window.livePartyMarkersGroup) return;

    const lat = parseFloat(data.latitude || data.lat);
    const lng = parseFloat(data.longitude || data.lng);
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

    const meta = getPartyUnitMeta(key) || {};
    const catKey = (data.categoryKey || meta.categoryKey || 'RM').toUpperCase();
    const mandal = data.mandal || meta.mandal || '';
    const unitName = data.unitName || meta.unitName || key;
    const officer = data.officer || meta.officer || data.name || 'Officer';
    const phone = data.phone || meta.phone || '';
    const speed = parseFloat(data.speed || 0);
    const speedKmh = Math.round(speed * 3.6);
    const isMoving = speedKmh >= 2 || !!data.isMoving;
    const bearing = parseFloat(data.bearing || 0);
    const accuracy = parseFloat(data.accuracy || 10);
    const lastUpdated = data.lastUpdated || Date.now();

    let unit = window.livePartyMarkers[key];
    if (!unit) {
        // Create new marker with compact sizing
        const icon = createLivePoliceMarkerIcon(catKey, mandal, unitName, true, isMoving, bearing, speedKmh, officer);
        const marker = L.marker([lat, lng], { icon: icon, zIndexOffset: 1000 });
        
        const circle = L.circle([lat, lng], {
            radius: Math.max(8, accuracy),
            color: getLivePartyCategoryTheme(catKey).color,
            fillColor: getLivePartyCategoryTheme(catKey).color,
            fillOpacity: 0.1,
            weight: 1,
            interactive: false
        });

        unit = {
            key: key,
            marker: marker,
            circle: circle,
            lat: lat,
            lng: lng,
            catKey: catKey,
            mandal: mandal,
            unitName: unitName,
            officer: officer,
            phone: phone,
            speedKmh: speedKmh,
            isMoving: isMoving,
            bearing: bearing,
            accuracy: accuracy,
            lastUpdated: lastUpdated,
            meta: meta
        };

        // Bind hover tooltip for instant officer details on mouseover
        marker.bindTooltip(function() { return buildLivePartyTooltipHtml(key, unit, meta); }, {
            direction: 'top',
            className: 'ps-tooltip-badge',
            offset: [0, -16],
            sticky: true
        });

        // Bind popup for complete details & call/whatsapp/navigation
        marker.bindPopup(function() { return buildLivePartyPopupHtml(key, unit, meta); }, { maxWidth: 350, minWidth: 260 });
        window.livePartyMarkers[key] = unit;

        if (shouldShowLivePartyUnit(catKey)) {
            window.livePartyMarkersGroup.addLayer(marker);
            window.livePartyMarkersGroup.addLayer(circle);
        }
    } else {
        // Update existing unit
        unit.lat = lat;
        unit.lng = lng;
        unit.speedKmh = speedKmh;
        unit.isMoving = isMoving;
        unit.bearing = bearing;
        unit.accuracy = accuracy;
        unit.lastUpdated = lastUpdated;
        if (officer) unit.officer = officer;
        if (phone) unit.phone = phone;

        // Position update
        unit.marker.setLatLng([lat, lng]);
        unit.circle.setLatLng([lat, lng]);
        unit.circle.setRadius(Math.max(8, accuracy));

        // Icon update
        unit.marker.setIcon(createLivePoliceMarkerIcon(catKey, mandal, unitName, true, isMoving, bearing, speedKmh, officer));

        // Update popup if open
        if (unit.marker.getPopup() && unit.marker.isPopupOpen()) {
            unit.marker.setPopupContent(buildLivePartyPopupHtml(key, unit, meta));
        }
    }

    updateLivePartyCounter();
    saveLiveUnitsToCache();
}

function removeLivePartyUnit(key) {
    if (window.livePartyMarkers[key]) {
        const u = window.livePartyMarkers[key];
        if (window.livePartyMarkersGroup) {
            window.livePartyMarkersGroup.removeLayer(u.marker);
            window.livePartyMarkersGroup.removeLayer(u.circle);
        }
        delete window.livePartyMarkers[key];
        updateLivePartyCounter();
        saveLiveUnitsToCache();
    }
}

// Compact police icon creator
function createLivePoliceMarkerIcon(catKey, mandal, unitName, isLive, isMoving, bearing, speedKmh, rawOfficer) {
    const theme = getLivePartyCategoryTheme(catKey);
    const badgeText = catKey + ': ' + (unitName || mandal);
    const officerDisp = formatOfficerDisplay(rawOfficer, mandal);
    const officerHtml = officerDisp 
        ? '<div class="officer-incharge-badge"><i class="fa-solid fa-user-shield text-[8px] text-yellow-300"></i><span>' + officerDisp + '</span></div>' 
        : '';

    if (isLive && isMoving && speedKmh >= 2) {
        // Directional top-down police cruiser SVG (Compact 28x28)
        return L.divIcon({
            className: 'custom-police-marker',
            html: '<div class="police-marker-container">' +
                    '<div class="police-marker-label" style="border-color:' + theme.color + '; bottom: 32px; padding: 2px 6px; font-size: 9px;">' +
                        '<div class="marker-title-row">' +
                            '<span style="color:#10b981;">● </span>' +
                            '<span>' + badgeText + '</span>' +
                            '<span class="speed-pill" style="font-size: 8.5px; padding: 1px 3px;">' + speedKmh + 'k</span>' +
                        '</div>' +
                        officerHtml +
                    '</div>' +
                    '<div class="vehicle-pointer-wrapper" style="width: 28px; height: 28px; transform:rotate(' + Math.round(bearing) + 'deg);">' +
                        '<svg width="28" height="28" viewBox="0 0 40 40" fill="none" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">' +
                            '<circle cx="20" cy="20" r="18" fill="rgba(15, 23, 42, 0.95)" stroke="#ffffff" stroke-width="2"/>' +
                            '<path d="M20 5L30 28L20 23L10 28L20 5Z" fill="' + theme.color + '" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>' +
                            '<rect x="15" y="17" width="4" height="3" rx="1" fill="#ef4444" class="police-strobe-l"/>' +
                            '<rect x="21" y="17" width="4" height="3" rx="1" fill="#3b82f6" class="police-strobe-r"/>' +
                        '</svg>' +
                    '</div>' +
                  '</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
    }

    // Stationary Police Badge Pin (Compact 26x26)
    return L.divIcon({
        className: 'custom-police-marker',
        html: '<div class="police-marker-container">' +
                '<div class="police-marker-label" style="border-color:' + theme.color + '; bottom: 30px; padding: 2px 6px; font-size: 9px;">' +
                    '<div class="marker-title-row">' +
                        '<span style="color:#10b981;">● </span>' +
                        '<span>' + badgeText + '</span>' +
                        '<span style="color:#94a3b8; font-size:8px;">(Stopped)</span>' +
                    '</div>' +
                    officerHtml +
                '</div>' +
                '<div class="police-marker-pulse" style="width: 34px; height: 34px; top: -4px; left: -4px;"></div>' +
                '<div class="police-marker-pin" style="width: 26px; height: 26px; font-size: 11px; background:' + theme.color + ';">' +
                    '<i class="fa-solid ' + theme.icon + '"></i>' +
                '</div>' +
              '</div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
    });
}

function formatOfficerDisplay(rawOfficer, mandal) {
    if (!rawOfficer) return mandal ? (mandal + ' PS') : '';
    const parts = rawOfficer.split(',').map(function(p) { return p.trim(); }).filter(Boolean);
    const cleaned = parts.filter(function(p) { return !/^\d{10}$/.test(p.replace(/\s+/g, '')); });
    if (cleaned.length >= 2) {
        return cleaned[0] + ', ' + cleaned[1];
    }
    return cleaned[0] || rawOfficer;
}

// Hover Tooltip: Displays officer details immediately on hover
function buildLivePartyTooltipHtml(key, unit, meta) {
    const theme = getLivePartyCategoryTheme(unit.catKey);
    const speedText = unit.speedKmh > 0 ? (unit.speedKmh + ' km/h (Moving)') : '(Stopped)';
    return '<div style="font-family:sans-serif; font-size:11px; line-height:1.35; color:#0f172a; min-width:180px;">' +
                '<div style="font-weight:bold; color:' + theme.color + '; border-bottom:1px solid #cbd5e1; padding-bottom:3px; margin-bottom:3px; display:flex; justify-content:space-between; align-items:center;">' +
                    '<span>[' + unit.catKey + '] ' + (unit.unitName || key) + '</span>' +
                    '<span style="color:#10b981; font-size:9px;">● LIVE</span>' +
                '</div>' +
                '<div><strong>Officer:</strong> ' + (unit.officer || '-') + '</div>' +
                (unit.phone ? '<div><strong>Phone:</strong> <span style="color:#2563eb; font-weight:bold;">' + unit.phone + '</span></div>' : '') +
                (unit.mandal ? '<div><strong>PS:</strong> ' + unit.mandal + ' PS</div>' : '') +
                '<div><strong>Status:</strong> <span style="font-weight:600; color:' + (unit.speedKmh > 0 ? '#16a34a' : '#d97706') + ';">' + speedText + '</span></div>' +
            '</div>';
}

function buildLivePartyPopupHtml(key, unit, meta) {
    const theme = getLivePartyCategoryTheme(unit.catKey);
    const phone = unit.phone || meta.phone || '';
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    
    const callBtn = cleanPhone ? '<a href="tel:' + cleanPhone + '" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs flex items-center gap-1 shadow-sm"><i class="fa-solid fa-phone"></i> Call</a>' : '';
    const waBtn = cleanPhone ? '<a href="https://wa.me/91${cleanPhone}" target="_blank" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs flex items-center gap-1 shadow-sm"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>' : '';
    const navBtn = '<a href="https://www.google.com/maps/dir/?api=1&destination=' + unit.lat + ',' + unit.lng + '" target="_blank" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold text-xs flex items-center gap-1 shadow-sm"><i class="fa-solid fa-diamond-turn-right text-emerald-400"></i> Navigate</a>';
    
    // Control Room Clear button for single officer
    const clearBtn = '<button type="button" onclick="clearSingleOfficer(\'' + key + '\')" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-xs flex items-center gap-1 shadow-sm cursor-pointer" title="కంట్రోల్ రూమ్ నుండి ఈ ట్రాకింగ్‌ను తొలగించండి"><i class="fa-solid fa-trash-can"></i> Clear</button>';

    const timeDiff = Math.max(0, Math.round((Date.now() - (unit.lastUpdated || Date.now())) / 1000));
    const timeAgoText = timeDiff < 60 ? (timeDiff + 's ago') : (Math.round(timeDiff / 60) + 'm ago');

    return '<div class="p-2 space-y-2 text-slate-800 font-sans" style="min-width: 260px;">' +
                '<div class="flex items-center justify-between border-b pb-1.5" style="border-color:' + theme.color + ';">' +
                    '<span class="px-2 py-0.5 rounded font-bold text-xs text-white" style="background:' + theme.color + ';">' +
                        '<i class="fa-solid ' + theme.icon + ' mr-1"></i> ' + theme.label +
                    '</span>' +
                    '<span class="text-[11px] font-bold text-emerald-600 flex items-center gap-1">' +
                        '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span> LIVE' +
                    '</span>' +
                '</div>' +

                '<div>' +
                    '<div class="text-sm font-black text-slate-900">' + (unit.unitName || key) + '</div>' +
                    '<div class="text-xs text-slate-600 font-semibold">' + (unit.mandal ? unit.mandal + ' PS' : '') + '</div>' +
                '</div>' +

                '<div class="bg-slate-50 p-2 rounded border border-slate-200 text-xs space-y-1">' +
                    '<div><strong class="text-slate-700">Incharge:</strong> <span class="text-slate-900 font-bold">' + (unit.officer || '-') + '</span></div>' +
                    (unit.phone ? '<div><strong class="text-slate-700">Phone:</strong> <span class="text-blue-700 font-bold">' + unit.phone + '</span></div>' : '') +
                    (meta.supporting ? '<div><strong class="text-slate-700">Supporting:</strong> <span class="text-slate-600">' + meta.supporting + '</span></div>' : '') +
                    (meta.hq ? '<div><strong class="text-slate-700">HQ:</strong> <span class="text-slate-800 font-semibold">' + meta.hq + '</span></div>' : '') +
                    (meta.pollingStations ? '<div><strong class="text-slate-700">Stations Covered:</strong> <span class="text-purple-700 font-bold">' + meta.pollingStations + '</span></div>' : '') +
                '</div>' +

                '<div class="grid grid-cols-2 gap-1.5 text-[11px] bg-blue-50 p-1.5 rounded border border-blue-200 text-blue-900">' +
                    '<div><strong>Speed:</strong> ' + unit.speedKmh + ' km/h ' + (unit.isMoving ? '🟢 Moving' : '🟠 Stopped') + '</div>' +
                    '<div><strong>GPS Acc:</strong> ±' + Math.round(unit.accuracy) + 'm</div>' +
                    '<div class="col-span-2 text-slate-500 text-[10px]"><strong>Last Update:</strong> ' + timeAgoText + '</div>' +
                '</div>' +

                '<div class="flex items-center gap-1.5 pt-1 border-t border-slate-100 flex-wrap">' +
                    callBtn +
                    waBtn +
                    navBtn +
                    clearBtn +
                '</div>' +
            '</div>';
}

function shouldShowLivePartyUnit(catKey) {
    if (window.currentLivePartyCategory === 'ALL') return true;
    return String(catKey || '').toUpperCase() === window.currentLivePartyCategory;
}

window.setLivePartyCategory = function(catKey) {
    window.currentLivePartyCategory = catKey;
    ['all', 'rm', 'sf', 'ssf', 'qrt', 'reserve'].forEach(function(k) {
        const btn = document.getElementById('live-pill-party-' + k);
        if (btn) {
            if (k.toUpperCase() === catKey) {
                btn.className = 'px-2.5 py-1 rounded text-[11px] font-bold bg-blue-600 text-white transition shadow-sm';
            } else {
                btn.className = 'px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition';
            }
        }
    });

    if (!window.livePartyMarkersGroup) return;
    window.livePartyMarkersGroup.clearLayers();

    for (const k in window.livePartyMarkers) {
        const u = window.livePartyMarkers[k];
        if (shouldShowLivePartyUnit(u.catKey)) {
            window.livePartyMarkersGroup.addLayer(u.marker);
            window.livePartyMarkersGroup.addLayer(u.circle);
        }
    }
};

window.fitAllActiveLiveUnits = function() {
    if (typeof liveMap === 'undefined' || !liveMap) return;
    const bounds = [];
    for (const k in window.livePartyMarkers) {
        const u = window.livePartyMarkers[k];
        if (shouldShowLivePartyUnit(u.catKey) && u.lat && u.lng) {
            bounds.push([u.lat, u.lng]);
        }
    }
    if (bounds.length > 0) {
        liveMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else {
        alert('ప్రస్తుతం ఎంచుకున్న కేటగిరీలో లైవ్ యూనిట్లు లేవు (No active live units transmitting).');
    }
};

// Clear Single Officer tracking from Control Room with Password Verification
window.clearSingleOfficer = function(key) {
    const enteredPassword = prompt('Control Room: Enter Password to clear Live Tracking for unit (' + key + '):');
    if (enteredPassword === null) {
        return; // User canceled
    }
    if (enteredPassword.trim().toLowerCase() !== 'police') {
        alert('Incorrect Password! Clear tracking canceled.');
        return;
    }

    if (window.liveMqttClient && window.liveMqttClient.connected) {
        const controlTopic = 'srikakulam_police_tracker/' + LIVE_ROOM_CODE + '/control_command';
        const officerTopic = 'srikakulam_police_tracker/' + LIVE_ROOM_CODE + '/officer/' + key;
        const generalTopic = 'srikakulam_police_tracker/' + LIVE_ROOM_CODE + '/locations';

        // 1. Send stop command to officer's phone
        window.liveMqttClient.publish(controlTopic, JSON.stringify({ action: 'clear_unit', unitId: key, timestamp: Date.now() }), { qos: 1 });
        // 2. Purge retained message on broker
        window.liveMqttClient.publish(officerTopic, '', { qos: 1, retain: true });
        // 3. Broadcast stopped state
        window.liveMqttClient.publish(generalTopic, JSON.stringify({ type: 'location', unitId: key, status: 'stopped', lastUpdated: Date.now() }), { qos: 0 });
    }

    removeLivePartyUnit(key);
};

// Clear ALL Live Tracking from Control Room with Password Verification
window.clearAllLiveTracking = function() {
    const keys = Object.keys(window.livePartyMarkers);
    if (keys.length === 0) {
        alert('No active live units currently transmitting.');
        return;
    }
    const enteredPassword = prompt('Control Room: Enter Password to clear ALL Live Tracking units:');
    if (enteredPassword === null) {
        return; // User canceled
    }
    if (enteredPassword.trim().toLowerCase() !== 'police') {
        alert('Incorrect Password! Clear tracking canceled.');
        return;
    }

    if (window.liveMqttClient && window.liveMqttClient.connected) {
        const controlTopic = 'srikakulam_police_tracker/' + LIVE_ROOM_CODE + '/control_command';
        const generalTopic = 'srikakulam_police_tracker/' + LIVE_ROOM_CODE + '/locations';

        window.liveMqttClient.publish(controlTopic, JSON.stringify({ action: 'clear_all', timestamp: Date.now() }), { qos: 1 });

        keys.forEach(function(k) {
            const officerTopic = 'srikakulam_police_tracker/' + LIVE_ROOM_CODE + '/officer/' + k;
            window.liveMqttClient.publish(officerTopic, '', { qos: 1, retain: true });
            window.liveMqttClient.publish(generalTopic, JSON.stringify({ type: 'location', unitId: k, status: 'stopped', lastUpdated: Date.now() }), { qos: 0 });
        });
    }

    clearAllLiveTrackingLocally();
};

function clearAllLiveTrackingLocally() {
    if (window.livePartyMarkersGroup) {
        window.livePartyMarkersGroup.clearLayers();
    }
    window.livePartyMarkers = {};
    updateLivePartyCounter();
    localStorage.removeItem('gp_live_units_cache');
}

function updateLivePartyCounter() {
    const count = Object.keys(window.livePartyMarkers).length;
    const el = document.getElementById('live-party-active-count');
    if (el) el.innerText = count;
}

function saveLiveUnitsToCache() {
    try {
        const cache = {};
        for (const k in window.livePartyMarkers) {
            const u = window.livePartyMarkers[k];
            cache[k] = {
                unitId: k,
                latitude: u.lat,
                longitude: u.lng,
                speed: (u.speedKmh || 0) / 3.6,
                bearing: u.bearing,
                accuracy: u.accuracy,
                isMoving: u.isMoving,
                categoryKey: u.catKey,
                mandal: u.mandal,
                unitName: u.unitName,
                officer: u.officer,
                phone: u.phone,
                lastUpdated: u.lastUpdated
            };
        }
        localStorage.setItem('gp_live_units_cache', JSON.stringify(cache));
    } catch(e) {}
}

function restoreLiveUnitsFromCache() {
    try {
        const cachedStr = localStorage.getItem('gp_live_units_cache');
        if (!cachedStr) return;
        const cached = JSON.parse(cachedStr);
        for (const k in cached) {
            updateLivePartyUnitOnMap(k, cached[k]);
        }
    } catch(e) {}
}


// ================= EXPORT LIVE & OFFLINE OFFICERS REPORT TO EXCEL =================
window.exportLiveOfficersToExcel = async function() {
    const btn = document.getElementById('btn-export-live-officers');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Generating Excel...';

    try {
        if (typeof XLSX === 'undefined') {
            await new Promise(function(resolve, reject) {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                script.onload = resolve;
                script.onerror = function() { reject(new Error('Network error loading XLSX')); };
                document.head.appendChild(script);
            });
        }

        const dataList = (window.ROUTE_MOBILES_DATA && Array.isArray(window.ROUTE_MOBILES_DATA)) ? window.ROUTE_MOBILES_DATA : [];
        const liveMarkers = window.livePartyMarkers || {};

        const processedKeys = {};
        const allRecords = [];

        dataList.forEach(function(u) {
            const key = u.id || u.unitId;
            processedKeys[String(key || '').trim().toLowerCase()] = true;

            const liveUnit = liveMarkers[key] || 
                             liveMarkers[String(key).toLowerCase()] || 
                             liveMarkers[String(key).toUpperCase()] || 
                             null;

            const isOnline = !!liveUnit;
            let speedText = '-';
            let moveStatus = isOnline ? 'STATIONARY' : 'OFFLINE';
            let latText = '-';
            let lngText = '-';
            let lastSeenText = 'Offline / Not Connected';
            let mapsLink = '-';

            if (isOnline) {
                const speedKmh = typeof liveUnit.speedKmh !== 'undefined' ? liveUnit.speedKmh : 0;
                speedText = speedKmh + ' KM/H';
                moveStatus = liveUnit.isMoving || speedKmh >= 2 ? 'MOVING' : 'STATIONARY';
                latText = liveUnit.lat ? Number(liveUnit.lat).toFixed(6) : '-';
                lngText = liveUnit.lng ? Number(liveUnit.lng).toFixed(6) : '-';

                if (liveUnit.lastUpdated) {
                    const diffSec = Math.max(0, Math.round((Date.now() - liveUnit.lastUpdated) / 1000));
                    lastSeenText = diffSec < 60 ? (diffSec + ' sec ago') : (Math.round(diffSec / 60) + ' min ago');
                } else {
                    lastSeenText = 'Online (Live)';
                }

                if (liveUnit.lat && liveUnit.lng) {
                    mapsLink = 'https://www.google.com/maps?q=' + liveUnit.lat + ',' + liveUnit.lng;
                }
            }

            allRecords.push({
                isOnline: isOnline,
                record: {
                    'Status': isOnline ? 'ONLINE' : 'OFFLINE',
                    'Party Category': u.category || u.categoryKey || 'Route Mobiles',
                    'Unit Name / Route': u.unitName || u.route || '-',
                    'Police Station / Mandal': u.mandal || '-',
                    'Headquarters': u.hq || u.route || '-',
                    'Officer Name & Rank': u.officer || '-',
                    'Officer Mobile No': u.phone || '-',
                    'Supporting Staff': u.supporting || '-',
                    'Assigned Polling Stations': u.pollingStations || '-',
                    'Movement Status': moveStatus,
                    'Speed (KM/H)': speedText,
                    'Latitude': latText,
                    'Longitude': lngText,
                    'Last Update Time': lastSeenText,
                    'Live Location Link': mapsLink
                }
            });
        });

        // Add any active live units transmitting ad-hoc not found in the initial data
        for (const k in liveMarkers) {
            const cleanK = String(k || '').trim().toLowerCase();
            if (!processedKeys[cleanK]) {
                const liveUnit = liveMarkers[k];
                const speedKmh = liveUnit.speedKmh || 0;
                allRecords.push({
                    isOnline: true,
                    record: {
                        'Status': 'ONLINE',
                        'Party Category': liveUnit.catKey || 'Live Party',
                        'Unit Name / Route': liveUnit.unitName || k,
                        'Police Station / Mandal': liveUnit.mandal || '-',
                        'Headquarters': '-',
                        'Officer Name & Rank': liveUnit.officer || 'Officer',
                        'Officer Mobile No': liveUnit.phone || '-',
                        'Supporting Staff': '-',
                        'Assigned Polling Stations': '-',
                        'Movement Status': liveUnit.isMoving || speedKmh >= 2 ? 'MOVING' : 'STATIONARY',
                        'Speed (KM/H)': speedKmh + ' KM/H',
                        'Latitude': liveUnit.lat ? Number(liveUnit.lat).toFixed(6) : '-',
                        'Longitude': liveUnit.lng ? Number(liveUnit.lng).toFixed(6) : '-',
                        'Last Update Time': 'Online (Live)',
                        'Live Location Link': liveUnit.lat && liveUnit.lng ? ('https://www.google.com/maps?q=' + liveUnit.lat + ',' + liveUnit.lng) : '-'
                    }
                });
            }
        }

        // Sort so ONLINE units are at the top
        allRecords.sort(function(a, b) {
            if (a.isOnline === b.isOnline) return 0;
            return a.isOnline ? -1 : 1;
        });

        const allRows = allRecords.map(function(r, idx) {
            const item = { 'S.No': idx + 1 };
            for (const key in r.record) item[key] = r.record[key];
            return item;
        });

        const onlineRows = allRecords.filter(function(r) { return r.isOnline; }).map(function(r, idx) {
            const item = { 'S.No': idx + 1 };
            for (const key in r.record) item[key] = r.record[key];
            return item;
        });

        const offlineRows = allRecords.filter(function(r) { return !r.isOnline; }).map(function(r, idx) {
            const item = { 'S.No': idx + 1 };
            for (const key in r.record) item[key] = r.record[key];
            return item;
        });

        const wb = XLSX.utils.book_new();

        const wsAll = XLSX.utils.json_to_sheet(allRows);
        XLSX.utils.book_append_sheet(wb, wsAll, 'All Officers (' + allRows.length + ')');

        const wsOnline = XLSX.utils.json_to_sheet(onlineRows.length > 0 ? onlineRows : [{ 'Message': 'No officers currently transmitting live.' }]);
        XLSX.utils.book_append_sheet(wb, wsOnline, 'Online (' + onlineRows.length + ')');

        const wsOffline = XLSX.utils.json_to_sheet(offlineRows);
        XLSX.utils.book_append_sheet(wb, wsOffline, 'Offline (' + offlineRows.length + ')');

        // Auto-fit column widths
        [wsAll, wsOnline, wsOffline].forEach(function(ws) {
            if (!ws['!ref']) return;
            const range = XLSX.utils.decode_range(ws['!ref']);
            const colWidths = [];
            for (let C = range.s.c; C <= range.e.c; ++C) {
                let maxLen = 12;
                for (let R = range.s.r; R <= range.e.r; ++R) {
                    const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
                    if (cell && cell.v) {
                        const len = String(cell.v).length;
                        if (len > maxLen) maxLen = Math.min(len, 40);
                    }
                }
                colWidths.push({ wch: maxLen + 2 });
            }
            ws['!cols'] = colWidths;
        });

        const now = new Date();
        const pad = function(n) { return (n < 10 ? '0' : '') + n; };
        const fileDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '_' + pad(now.getHours()) + '-' + pad(now.getMinutes());
        const fileName = 'Srikakulam_Police_Officers_Status_' + fileDate + '.xlsx';

        XLSX.writeFile(wb, fileName);

        alert('Excel Exported Successfully!\n\nTotal Officers: ' + allRows.length + '\nOnline: ' + onlineRows.length + '\nOffline: ' + offlineRows.length + '\n\nFile: ' + fileName);
    } catch (err) {
        console.error('Error exporting officers excel:', err);
        alert('Failed to export Excel report: ' + err.message);
    } finally {
        if (btn) btn.innerHTML = origHtml;
    }
};
