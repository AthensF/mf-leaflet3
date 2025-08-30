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
        "1 Main St, Boston, MA 02101",
        "2 Commonwealth Ave, Boston, MA 02116",
        "3 Newbury St, Boston, MA 02116",
        "4 Boylston St, Boston, MA 02116",
        "5 Washington St, Boston, MA 02108",
        "6 Tremont St, Boston, MA 02108",
        "7 Beacon St, Boston, MA 02108",
        "8 Charles St, Boston, MA 02114",
        "9 Cambridge St, Cambridge, MA 02141",
        "10 Massachusetts Ave, Cambridge, MA 02139",
        "11 Harvard Square, Cambridge, MA 02138",
        "12 JFK St, Cambridge, MA 02138",
        "13 Broadway, Cambridge, MA 02142",
        "14 Prospect St, Cambridge, MA 02139",
        "15 Concord Ave, Cambridge, MA 02138",
        "16 Elm St, Somerville, MA 02144",
        "17 Broadway, Somerville, MA 02145",
        "18 McGrath Hwy, Somerville, MA 02143",
        "19 Washington St, Somerville, MA 02143",
        "20 Mystic Ave, Somerville, MA 02145",
        "21 Medford St, Somerville, MA 02143",
        "22 Fellsway, Medford, MA 02155",
        "23 High St, Medford, MA 02155",
        "24 Salem St, Medford, MA 02155"
    ];
    for (let i = 0; i < originalComplaints.length; i++) {
        const type = types[i % 4];
        const lat = 42.2 + Math.random() * 0.2;
        const lng = -71.2 + Math.random() * 0.2;
        const address = addresses[i];
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
        this.showZoomInfo = false; // Feature flag for zoom info display.  Set tru
        
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
        // Initialize the map
        this.map = L.map('map', { zoomControl: true }).setView([42.3655, -71.1018], 10);
        
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
                    <div style="padding: 16px 20px; background: #f8f9fb; border-bottom: 1px solid #e1e5e9; font-size: 12px; color: #718096;">
                        Showing ${visibleStations.length} incidents
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
                <div style="padding: 16px 20px; background: #f8f9fb; border-bottom: 1px solid #e1e5e9; font-size: 12px; color: #718096;">
                    Showing ${filteredStations.length} incidents
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
});