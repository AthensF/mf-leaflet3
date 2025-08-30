// Complaint data (sample) limited to four types: Graffiti, Rodent, Tree, Street lights
// Fields: id, lat, lng, address, date (ISO), type

function daysAgo(n) {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

export const complaints = [
  // Cambridge / Boston area samples mapped from prior station coordinates
  { id: 1,  lat: 42.3601, lng: -71.0589, address: "100 Summer St, Boston, MA 02110", date: daysAgo(5),   type: "Graffiti" },
  { id: 2,  lat: 42.3584, lng: -71.0636, address: "1 Charles St S, Boston, MA 02116", date: daysAgo(18),  type: "Rodent" },
  { id: 3,  lat: 42.3505, lng: -71.0495, address: "685 Washington St, Boston, MA 02118", date: daysAgo(42), type: "Street lights" },
  { id: 4,  lat: 42.3467, lng: -71.0972, address: "145 Dartmouth St, Boston, MA 02116", date: daysAgo(2),  type: "Tree" },

  { id: 5,  lat: 42.3736, lng: -71.1097, address: "95 Broadway, Cambridge, MA 02142", date: daysAgo(11), type: "Rodent" },
  { id: 6,  lat: 42.3737, lng: -71.1106, address: "1124 Massachusetts Ave, Cambridge, MA 02138", date: daysAgo(1), type: "Graffiti" },
  { id: 7,  lat: 42.3598, lng: -71.0927, address: "84 Massachusetts Ave, Cambridge, MA 02139", date: daysAgo(29), type: "Street lights" },
  { id: 8,  lat: 42.3875, lng: -71.0995, address: "1816 Massachusetts Ave, Cambridge, MA 02140", date: daysAgo(9), type: "Tree" },

  { id: 9,  lat: 42.3875, lng: -71.0995, address: "341 Elm St, Somerville, MA 02144", date: daysAgo(3),  type: "Graffiti" },
  { id: 10, lat: 42.3967, lng: -71.1206, address: "50 Prospect St, Somerville, MA 02143", date: daysAgo(21), type: "Rodent" },

  { id: 11, lat: 42.4072, lng: -71.1190, address: "5 Playstead Rd, Medford, MA 02155", date: daysAgo(55), type: "Tree" },
  { id: 12, lat: 42.3317, lng: -71.0202, address: "1250 Hancock St, Quincy, MA 02169", date: daysAgo(7),  type: "Street lights" },
  { id: 13, lat: 42.2753, lng: -71.0200, address: "250 Grossman Dr, Braintree, MA 02184", date: daysAgo(15), type: "Rodent" },
  { id: 14, lat: 42.4430, lng: -71.2294, address: "173 Bedford St, Lexington, MA 02421", date: daysAgo(33), type: "Graffiti" },
  { id: 15, lat: 42.5047, lng: -71.2356, address: "75 Middlesex Tpke, Burlington, MA 01803", date: daysAgo(4),  type: "Street lights" },

  { id: 16, lat: 42.3542, lng: -71.2356, address: "455 Washington St, Newton, MA 02458", date: daysAgo(24), type: "Tree" },
  { id: 17, lat: 42.3417, lng: -71.1581, address: "1180 Beacon St, Brookline, MA 02446", date: daysAgo(8),  type: "Rodent" },
  { id: 18, lat: 42.2928, lng: -71.2583, address: "950 Providence Hwy, Dedham, MA 02026", date: daysAgo(12), type: "Graffiti" },

  // a few extra around Cambridge core
  { id: 19, lat: 42.3662, lng: -71.0621, address: "200 Cambridge St, Boston, MA 02114", date: daysAgo(6),  type: "Street lights" },
  { id: 20, lat: 42.3722, lng: -71.1171, address: "36 JFK St, Cambridge, MA 02138", date: daysAgo(19), type: "Tree" },
  { id: 21, lat: 42.3684, lng: -71.1020, address: "77 Massachusetts Ave, Cambridge, MA 02139", date: daysAgo(10), type: "Rodent" },
  { id: 22, lat: 42.3709, lng: -71.0828, address: "1 Kendall Square, Cambridge, MA 02139", date: daysAgo(17), type: "Graffiti" },
  { id: 23, lat: 42.3716, lng: -71.1106, address: "1400 Massachusetts Ave, Cambridge, MA 02138", date: daysAgo(14), type: "Street lights" },
  { id: 24, lat: 42.3744, lng: -71.1189, address: "180 Garden St, Cambridge, MA 02138", date: daysAgo(22), type: "Tree" }
];
