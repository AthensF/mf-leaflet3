// Main application entry point
import { complaints } from './data/complaints.js';
import { clusterStations, CLUSTER_CONFIG } from './modules/clustering.js';
import { createClusterMarker, createStationMarker, showStationPopup } from './modules/markers.js';
import { createStationListItem, MobilePanel, updateToggleButtons, updateZoomInfo } from './modules/ui.js';

// Map complaints into station-shaped objects to reuse existing UI/logic
// Each item keeps original fields under _meta for future UI enhancements
const DISPLAY_NAME = {
    'Graffiti': 'Graffiti Removal Request',
    'Rodent': 'Rodent Baiting',
    'Tree': 'Tree Debris Clean-up',
    'Street lights': 'Street Light Out'
};

const originalComplaints = [...complaints];

function randomDateBetween(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateComplaintsForRange(dateFilter) {
    if (dateFilter === 'all') return originalComplaints;
    const now = new Date();
    let start, end;
    if (dateFilter === 'past6') {
        start = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
        end = now;
    } else if (dateFilter === 'past3') {
        start = new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000);
        end = now;
    } else if (dateFilter === 'next3') {
        start = now;
        end = new Date(now.getTime() + 3 * 30 * 24 * 60 * 60 * 1000);
    }
    const complaints = [];
    const types = ['Graffiti', 'Rodent', 'Tree', 'Street lights'];
    const addresses = [
        "1 N Michigan Ave, Chicago, IL 60601",
        "2 W Wacker Dr, Chicago, IL 60601",
        "3 S State St, Chicago, IL 60603",
        "4 W Madison St, Chicago, IL 60602",
        "5 S Michigan Ave, Chicago, IL 60603",
        "6 N Clark St, Chicago, IL 60602",
        "7 W Randolph St, Chicago, IL 60601",
        "8 N Wells St, Chicago, IL 60654",
        "9 W Chicago Ave, Chicago, IL 60654",
        "10 N Halsted St, Chicago, IL 60642",
        "11 W Division St, Chicago, IL 60610",
        "12 N Damen Ave, Chicago, IL 60647",
        "13 W North Ave, Chicago, IL 60642",
        "14 W Fullerton Ave, Chicago, IL 60614",
        "15 N Ashland Ave, Chicago, IL 60622",
        "16 W Belmont Ave, Chicago, IL 60657",
        "17 N Sheffield Ave, Chicago, IL 60614",
        "18 W Lawrence Ave, Chicago, IL 60625",
        "19 N Broadway, Chicago, IL 60657",
        "20 W Addison St, Chicago, IL 60613",
        "21 S Lake Shore Dr, Chicago, IL 60616",
        "22 S State St, Chicago, IL 60605",
        "23 W 35th St, Chicago, IL 60616",
        "24 S Pulaski Rd, Chicago, IL 60632"
    ];
    const multiplier = window.multiplier || 200; // in console, enter window.setMultiplier(100)
    const total = originalComplaints.length * multiplier;
    for (let i = 0; i < total; i++) {
        const type = types[i % types.length];
        // Chicago area randomisation (kept on land; avoid Lake Michigan)
        const lat = 41.73 + Math.random() * 0.32; // ~41.73 to 42.05
        const lng = -87.85 + Math.random() * 0.20; // ~-87.85 to -87.65 (west of shoreline)
        const address = addresses[i % addresses.length];
        const date = randomDateBetween(start, end).toISOString();
        complaints.push({ id: i + 1, lat, lng, address, date, type });
    }
    return complaints;
}

class ChargingStationApp {
    constructor() {
        this.map = null;
        this.currentMarkers = [];
        this.selectedStation = null;
        this.currentFilter = 'Graffiti';
        this.currentDateFilter = 'past6';
        this.chargingStations = [];
        this.showZoomInfo = false; // Feature flag for zoom info display
        
        this.regenerateData();
        this.init();
    }

    regenerateData() {
        const filteredComplaints = generateComplaintsForRange(this.currentDateFilter);
        this.chargingStations = filteredComplaints.map(c => ({
            id: c.id,
            lat: c.lat,
            lng: c.lng,
            name: DISPLAY_NAME[c.type] || `${c.type} Complaint`,
            address: c.address,
            status: 'open',
            ports: 0,
            availablePorts: 0,
            _meta: { type: c.type, date: c.date }
        }));
    }

    getFilteredStations() {
        if (this.currentFilter === 'all') return this.chargingStations;
        return this.chargingStations.filter(s => s._meta.type === this.currentFilter);
    }

    setFilter(type) {
        this.currentFilter = type;
        this.updateFilterButtons();
        this.updateMarkers();
        this.updateStationLists();
    }

    setDateFilter(date) {
        this.currentDateFilter = date;
        this.updateDateFilterButtons();
        this.regenerateData();
        this.updateMarkers();
        this.updateStationLists();
    }

    updateFilterButtons() {
        document.querySelectorAll('.filter-buttons .toggle-btn').forEach(btn => {
            if (btn.dataset.type === this.currentFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    updateDateFilterButtons() {
        document.querySelectorAll('.date-filter-buttons .toggle-btn').forEach(btn => {
            if (btn.dataset.date === this.currentDateFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    init() {
        console.log('🚀 Initializing ChargePoint-style app with clustering + responsive sidebar');
        
        this.initMap();
        this.setupMobilePanel();
        this.setupEventListeners();
        this.updateMarkers();
        this.updateStationLists();
        
        setTimeout(() => {
            console.log('✅ App initialized successfully!');
            console.log('📊 Features enabled:');
            console.log(`   • Zoom-based clustering (transitions at zoom ${CLUSTER_CONFIG.minZoomForIndividual})`);
            console.log('   • Responsive sidebar (desktop) / slide-up panel (mobile)');
            console.log('   • Station selection sync between map and list');
            console.log('   • Touch/swipe gestures for mobile panel');
            console.log('📱 Try resizing window or using mobile view to test responsiveness');
            console.log('🔍 Zoom in/out or use toggle buttons to see clustering behavior');
        }, 100);
    }

    initMap() {
        // Initialize the map (Chicago)
        this.map = L.map('map', { zoomControl: true }).setView([41.8781, -87.6298], 11);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Position zoom control to bottom right
        this.map.zoomControl.setPosition('bottomright');
    }

    setupMobilePanel() {
        this.mobilePanel = new MobilePanel('mobilePanel', 'panelHandle');
    }

    setupEventListeners() {
        // Map events
        this.map.on('zoomend moveend', () => {
            this.updateMarkers();
            this.updateStationLists();
        });
        
        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-buttons .toggle-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.setFilter(type);
            });
        });

        // Date filter buttons
        const dateButtons = document.querySelectorAll('.date-filter-buttons .toggle-btn');
        dateButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = e.target.dataset.date;
                this.setDateFilter(date);
            });
        });

        // Sidebar toggle
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const sidebar = document.querySelector('.sidebar');
                sidebar.classList.toggle('collapsed');
                toggleBtn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
            });
        }

        // Window resize handler
        window.addEventListener('resize', () => {
            this.map.invalidateSize();
        });

        this.updateFilterButtons();
        this.updateDateFilterButtons();
    }

    selectStation(station) {
        this.selectedStation = station;
        this.updateMarkers();
        this.updateStationLists();
        
        // Show popup
        showStationPopup(station, this.map);
    }

    updateMarkers() {
        // Clear existing markers
        this.currentMarkers.forEach(marker => this.map.removeLayer(marker));
        this.currentMarkers = [];

        const currentZoom = this.map.getZoom();
        
        // Get stations within current view (optimization)
        const bounds = this.map.getBounds();
        const allStations = this.getFilteredStations();
        const visibleStations = allStations.filter(station => 
            bounds.contains([station.lat, station.lng])
        );

        // Cluster the stations
        const clusters = clusterStations(visibleStations, currentZoom, false, this.map);
        
        // Add markers to map
        clusters.forEach(cluster => {
            let marker;
            if (cluster.type === 'individual') {
                marker = createStationMarker(cluster.station, this.selectedStation, (station) => this.selectStation(station));
            } else {
                marker = createClusterMarker(cluster, this.map, (station, action) => {
                    if (action === 'select') {
                        this.selectStation(station);
                    }
                });
            }
            
            this.currentMarkers.push(marker);
            marker.addTo(this.map);
        });

        // Update zoom info displays
        updateZoomInfo(currentZoom, this.showZoomInfo);
        
        console.log(`Zoom ${currentZoom}: Showing ${clusters.length} markers (${clusters.filter(c => c.type === 'cluster').length} clusters, ${clusters.filter(c => c.type === 'individual').length} individual)`);
    }

    updateStationLists() {
        const currentZoom = this.map.getZoom();
        const shouldShowClustered = currentZoom < CLUSTER_CONFIG.minZoomForIndividual;
        
        let stationListHTML;
        
        if (shouldShowClustered) {
            // Get current visible bounds
            const bounds = this.map.getBounds();
            const allStations = this.getFilteredStations();
            const visibleStations = allStations.filter(station => 
                bounds.contains([station.lat, station.lng])
            );
            
            const clusters = clusterStations(visibleStations, currentZoom, false, this.map);
            const clusterCount = clusters.filter(c => c.type === 'cluster').length;
            const individualCount = clusters.filter(c => c.type === 'individual').length;
            
            if (clusters.length === 0) {
                stationListHTML = '<div class="loading">No incidents in current view</div>';
            } else {
                stationListHTML = `
                    <div class="sticky-count">
                        <div class="count-text" style="padding: 16px 20px; background: #f8f9fb; border-bottom: 1px solid #e1e5e9; font-size: 12px; color: #718096;">
                            Showing ${visibleStations.length} incidents
                        </div>
                        <button class="direction-btn" onclick="window.open('https://maps.app.goo.gl/5NjEEM5sNt1caMi68', '_blank')">➦ Directions</button>
                    </div>
                `;
                
                clusters.forEach(cluster => {
                    if (cluster.type === 'cluster') {
                        cluster.stations.forEach(station => {
                            stationListHTML += createStationListItem(station, this.selectedStation);
                        });
                    } else {
                        stationListHTML += createStationListItem(cluster.station, this.selectedStation);
                    }
                });
            }
        } else {
            // Show all individual stations
            const filteredStations = this.getFilteredStations();
            stationListHTML = `
                <div class="sticky-count">
                    <div class="count-text" style="padding: 16px 20px; background: #f8f9fb; border-bottom: 1px solid #e1e5e9; font-size: 12px; color: #718096;">
                        Showing ${filteredStations.length} incidents
                    </div>
                    <button class="direction-btn" onclick="window.open('https://maps.app.goo.gl/5NjEEM5sNt1caMi68', '_blank')">➦ Directions</button>
                </div>
            ` + filteredStations.map(station => createStationListItem(station, this.selectedStation)).join('');
        }
        
        const desktopList = document.getElementById('desktopStationList');
        const mobileList = document.getElementById('mobileStationList');
        
        if (desktopList) desktopList.innerHTML = stationListHTML;
        if (mobileList) mobileList.innerHTML = stationListHTML;
        
        // Add click listeners
        document.querySelectorAll('.station-item').forEach(item => {
            const stationId = item.dataset.stationId;
            if (stationId) {
                item.addEventListener('click', (e) => {
                    const station = this.chargingStations.find(s => s.id === parseInt(stationId));
                    if (station) {
                        this.selectStation(station);
                        this.map.setView([station.lat, station.lng], Math.max(this.map.getZoom(), 15));
                    }
                });
            }
        });
    }

}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new ChargingStationApp();
    window.app = app;
    window.toggleZoomInfo = () => {
        window.app.showZoomInfo = !window.app.showZoomInfo;
        window.app.updateZoomInfo(window.app.map.getZoom(), window.app.showZoomInfo);
        console.log(`Zoom info ${window.app.showZoomInfo ? 'enabled' : 'disabled'}`);
    };
    window.multiplier = 200; // Configurable incident multiplier
    window.setMultiplier = (value) => {
        if (typeof value === 'number' && value > 0) {
            window.multiplier = value;
            console.log(`Multiplier set to ${value}. Regenerate data to apply.`);
        } else {
            console.log('Invalid multiplier value. Must be a positive number.');
        }
    };
});