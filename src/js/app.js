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

const chargingStations = complaints.map(c => ({
    id: c.id,
    lat: c.lat,
    lng: c.lng,
    name: DISPLAY_NAME[c.type] || `${c.type} Complaint`,
    address: c.address,
    // Status/ports kept for compatibility; not meaningful for complaints
    status: 'open',
    ports: 0,
    availablePorts: 0,
    _meta: { type: c.type, date: c.date }
}));

class ChargingStationApp {
    constructor() {
        this.map = null;
        this.currentMarkers = [];
        this.selectedStation = null;
        this.currentFilter = 'all';
        this.mobilePanel = null;
        
        this.init();
    }

    getFilteredStations() {
        if (this.currentFilter === 'all') return chargingStations;
        return chargingStations.filter(s => s._meta.type === this.currentFilter);
    }

    setFilter(type) {
        this.currentFilter = type;
        this.updateFilterButtons();
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
        // Initialize the map
        this.map = L.map('map').setView([42.3655, -71.1018], 10);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
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

        // Window resize handler
        window.addEventListener('resize', () => {
            this.map.invalidateSize();
        });

        this.updateFilterButtons();
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
        updateZoomInfo(currentZoom);
        
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
                    <div style="padding: 16px 20px; background: #f8f9fb; border-bottom: 1px solid #e1e5e9; font-size: 12px; color: #718096;">
                        Showing ${clusterCount} clusters and ${individualCount} individual incidents
                    </div>
                `;
                
                clusters.forEach(cluster => {
                    if (cluster.type === 'cluster') {
                        const availableCount = cluster.stations.filter(s => s.status === 'available').length;
                        stationListHTML += `
                            <div class="station-item" style="background: #f0f8ff; border-left: 4px solid #2c5aa0;">
                                <div class="station-name">📍 ${cluster.stations.length} Incidents Reported</div>
                                <div class="station-address">Total incidents: ${cluster.stations.length}</div>
                                <div class="station-details">
                                    <span style="font-size: 11px; color: #718096;">Click cluster on map to zoom in</span>
                                </div>
                            </div>
                        `;
                    } else {
                        stationListHTML += createStationListItem(cluster.station, this.selectedStation);
                    }
                });
            }
        } else {
            // Show all individual stations
            const filteredStations = this.getFilteredStations();
            stationListHTML = `
                <div style="padding: 16px 20px; background: #f8f9fb; border-bottom: 1px solid #e1e5e9; font-size: 12px; color: #718096;">
                    Showing all ${filteredStations.length} individual incidents
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
                    const station = chargingStations.find(s => s.id === parseInt(stationId));
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
    new ChargingStationApp();
});