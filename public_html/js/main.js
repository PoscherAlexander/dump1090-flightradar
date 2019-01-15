//globals
var GoogleMap = null;
var Planes = {};
var PlanesOnMap = 0;
var PlanesOnTable = 0;
var PlanesToReap = 0;
var SelectedPlane = null;
var SelectedPlaneOnTable = null;
var SelectedPlaneICAO = null;
var SpecialSquawk = false;
var AviApiKey = 'YOUR_API_KEY';

//env
CenterLat = Number(localStorage['CenterLat']) || CONST_CENTERLAT;
CenterLon = Number(localStorage['CenterLon']) || CONST_CENTERLON;
ZoomLvl = Number(localStorage['ZoomLvl']) || CONST_ZOOMLVL;

/**
 *  Live ticker for current time
 */
function startTime() {
    var today = new Date();
    var h = today.getHours();
    var m = today.getMinutes();
    var s = today.getSeconds();
    m = checkTime(m);
    s = checkTime(s);
    document.getElementById('live-time-header').innerHTML = h + ":" + m + ":" + s;
    document.getElementById('live-time').innerHTML = h + ":" + m + ":" + s;
    var t = setTimeout(startTime, 500);
}

/**
 *  Adds leading 0 to 1 digit numbers
 *
 *  @param {number} i given hours/minutes/seconds
 *  @returns {string}
 */
function checkTime(i) {
    if (i < 10) {
        i = "0" + i
    };
    return i;
}

/**
 *  Gets flight data from data.json file, adds all valid planes
 *  to Planes array, updates PlanesOnMap and PlanesOnTable var
 */
function fetchData() {
    $.getJSON('/dump1090/data.json', function(data) {
        PlanesOnMap = 0;
        SpecialSquawk = false;

        //Loop through all the planes in the data file
        for (var j = 0; j < data.length; j++) {
            if (Planes[data[j].hex]) {
                var plane = Planes[data[j].hex];
            } else {
                var plane = jQuery.extend(true, {}, planeObject);
            }

            if (data[j].squawk == '7500' || data[j].squawk == '7600' || data[j].squawk == '7700') {
                SpecialSquawk = true;
            }

            //Call the function update
            plane.funcUpdateData(data[j]);
            Planes[plane.icao] = plane;
        }
        PlanesOnTable = data.length;
    });
}

/**
 *  Initializes all necessary components
 *  Set Google Maps settings for an optimal displaying of the planes
 *  Set Styles, Eventhandlers and Maps for Google Maps
 *  Set Timer for pulling data from the antenna
 */
function init() {

    var mapTypeIds = [];
    for (var type in google.maps.MapTypeId) {
        mapTypeIds.push(google.maps.MapTypeId[type]);
    }

    mapTypeIds.push("OSM");
    mapTypeIds.push("dark_map");

    // outline airports and highways from Google Maps
    var styles = [{
        "featureType": "administrative",
        "stylers": [{
            "visibility": "off"
        }]
    }, {
        "featureType": "landscape",
        "stylers": [{
            "visibility": "off"
        }]
    }, {
        "featureType": "poi",
        "stylers": [{
            "visibility": "off"
        }]
    }, {
        "featureType": "road",
        "stylers": [{
            "visibility": "off"
        }]
    }, {
        "featureType": "transit",
        "stylers": [{
            "visibility": "off"
        }]
    }, {
        "featureType": "landscape",
        "stylers": [{
                "visibility": "on"
            },
            {
                "weight": 8
            },
            {
                "color": "#000000"
            }
        ]
    }, {
        "featureType": "water",
        "stylers": [{
            "lightness": -74
        }]
    }, {
        "featureType": "transit.station.airport",
        "stylers": [{
                "visibility": "on"
            },
            {
                "weight": 8
            },
            {
                "invert_lightness": true
            },
            {
                "lightness": 27
            }
        ]
    }, {
        "featureType": "road.highway",
        "stylers": [{
                "visibility": "simplified"
            },
            {
                "invert_lightness": true
            },
            {
                "gamma": 0.3
            }
        ]
    }, {
        "featureType": "road",
        "elementType": "labels",
        "stylers": [{
            "visibility": "off"
        }]
    }]

    // Add styled map
    var styledMap = new google.maps.StyledMapType(styles, {
        name: "Dark Map"
    });

    // Define the Google Map
    var mapOptions = {
        center: new google.maps.LatLng(CenterLat, CenterLon),
        zoom: ZoomLvl,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        streetViewControl: false,
        mapTypeControlOptions: {
            mapTypeIds: mapTypeIds,
            position: google.maps.ControlPosition.TOP_LEFT,
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
        }
    };

    GoogleMap = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);

    GoogleMap.mapTypes.set("OSM", new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            return "http://tile.openstreetmap.org/" + zoom + "/" + coord.x + "/" + coord.y + ".png";
        },
        tileSize: new google.maps.Size(256, 256),
        name: "OpenStreetMap",
        maxZoom: 18
    }));

    GoogleMap.mapTypes.set("dark_map", styledMap);

    // Event Listeners for newly created Map
    google.maps.event.addListener(GoogleMap, 'center_changed', function() {
        localStorage['CenterLat'] = GoogleMap.getCenter().lat();
        localStorage['CenterLon'] = GoogleMap.getCenter().lng();
    });
    google.maps.event.addListener(GoogleMap, 'zoom_changed', function() {
        localStorage['ZoomLvl'] = GoogleMap.getZoom();
    });

    // Timer
    window.setInterval(function() {
        fetchData();
        refreshTableInfo();
        refreshHeaderTableInfo();
        refreshSelected();
        refreshTablePrimaryRow();
        reaper();
        //extendedPulse();
    }, 1000);
}

/**
 *  If plane has not sent any messages for a certain time it gets reaped
 *  and disapears from the table and the map
 */
function reaper() {
    PlanesToReap = 0;
    reaptime = new Date().getTime();
    for (var reap in Planes) {
        if (Planes[reap].reapable == true) {
            // Has it not been seen for 5 minutes?
            // Due to loss of signal or other reasons
            if ((reaptime - Planes[reap].updated) > 300000) {
                delete Planes[reap];
            }
            PlanesToReap++;
        }
    };
}

/**
 * refreshes the data of a selcted plan
 * and displays the refreshed data in a table
 */
function refreshSelected() {
    var selected = Planes[SelectedPlaneICAO];

    var html = '';

    if (selected && selected.flight != '') {
        $('#flightModalTitle').text('Data for ' + selected.flight);
        html += '<tr><td><b>Flight:<b></td><td id="selectedinfotitle">' + selected.flight + '</td></tr>';
    } else {
        $('#flightModalTitle').text('Data');
    }

	if(selected) {
		html += '<tr><td><b>Speed:</b></td><td>' + Math.round(selected.speed * 1.852) + ' km/h</td></tr>';
        html += '<tr><td><b>Altitude:</b></td><td>' + Math.round(selected.altitude / 3.2828) + ' m</td></tr>';
	}

	if(selected && selected.vTrack) {
		html += '<tr><td><b>Track:</b></td><td>' + selected.track + '&deg;' + ' (' + normalizeTrack(selected.track, selected.vTrack)[1] + ')' + '</td></tr>';
	}

	if(selected && selected.vPosition) {
		html += '<tr><td><b>Latitude:</b><td>' + selected.latitude + '°</td></tr>';
        html += '<tr><td><b>Longitude:</b><td>' + selected.longitude + '°</td></tr>';
	}
    //html +='</table>';

	document.getElementById('plane_detail').innerHTML = html;
}

/**
 *  refreshes the main table for all flights
 *  add every valid plane to the table as tr
 */
function refreshTableInfo() {
    var html = '';
    for (var tablep in Planes) {
        var tableplane = Planes[tablep];
        if (!tableplane.reapable) {
            html += '<tr onclick="selectPlane(\'' + tableplane.icao + '\')" id="table_plane_row_' + tableplane.icao + '">';
            if(tableplane.flight) {
                html += '<td>' + tableplane.flight + '</td>';
            } else {
                html += '<td> - </td>';
            }
            if(tableplane.altitude) {
                html += '<td>' + Math.round(tableplane.altitude / 3.2828) + ' m</td>';
            } else {
                html += '<td> - </td>';
            }
            if(tableplane.speed) {
                html += '<td>' + Math.round(tableplane.speed * 1.852) + ' km/h</td>';
            } else {
                html += '<td> - </td>';
            }
            html += '<td>';
            if (tableplane.vTrack) {
                html += normalizeTrack(tableplane.track, tableplane.vTrack)[2] + '°';
                html += ' (' + normalizeTrack(tableplane.track, tableplane.vTrack)[1] + ')';
            } else {
                html += '&nbsp;';
            }
            html += '</td>';
            html += '</tr>';
        }
    }

    // check if there are valid planes
    if(PlanesOnTable == 0 || PlanesOnMap == 0) {
        // hide table and show message
        document.getElementById('table_planes_table').hidden = true;
        document.getElementById('table_planes_message').hidden = false;
    } else {
        document.getElementById('table_planes_table').hidden = false;
        document.getElementById('table_planes_message').hidden = true;
        document.getElementById('planes_table').innerHTML = html;
    }
}

/**
 *  refreshes the header table for the latest three flights
 *  add every valid plane to the table as tr
 */
function refreshHeaderTableInfo() {
    var html = '';
    var count = 0;

    for (var tablep in Planes) {
        var tableplane = Planes[tablep];
        if (!tableplane.reapable && count < 3) {
            html += '<tr onclick="selectPlane(\'' + tableplane.icao + '\')">';
            if(tableplane.flight) {
                html += '<td>' + tableplane.flight + '</td>';
            } else {
                html += '<td> - </td>';
            }
            if(tableplane.altitude) {
                html += '<td>' + Math.round(tableplane.altitude / 3.2828) + ' m</td>';
            } else {
                html += '<td> - </td>';
            }
            if(tableplane.speed) {
                html += '<td>' + Math.round(tableplane.speed * 1.852) + ' km/h</td>';
            } else {
                html += '<td> - </td>';
            }
            html += '<td>';
            if (tableplane.vTrack) {
                html += normalizeTrack(tableplane.track, tableplane.vTrack)[2] + '°';
                html += ' (' + normalizeTrack(tableplane.track, tableplane.vTrack)[1] + ')';
            } else {
                html += '&nbsp;';
            }
            html += '</td>';
            html += '</tr>';
            count++;
        }
    }
    // check if there are valid planes
    if(PlanesOnTable == 0 || PlanesOnMap == 0) {
        // hide table and show message
        document.getElementById('table_planes_header_table').hidden = true;
        document.getElementById('table_planes_header_message').hidden = false;
    } else {
        document.getElementById('table_planes_header_table').hidden = false;
        document.getElementById('table_planes_header_message').hidden = true;
        document.getElementById('planes_table_header').innerHTML = html;
    }
}

function refreshTablePrimaryRow() {
    if(SelectedPlaneOnTable != null) {
        if(Planes[SelectedPlaneOnTable].is_selected) {
            $('#table_plane_row_' + SelectedPlaneOnTable).addClass('table-primary');
        } else {
            $('#table_plane_row_' + SelectedPlaneOnTable).removeClass('table-primary');
        }
    }
}

/**
 *  hide all rows containing an API request
 */
function refreshApiInfo() {
    $('#modalAirlineRow').hide();
    $('#modalModelRow').hide();
    $('#modalDepartureAirportRow').hide();
    $('#modalArrivalAirportRow').hide();
}

/**
 *  determines the direction as text and returns
 *  an array with the track information
 *
 *  @param {number} track the direction in degrees
 *  @param {boolean} valid is the flight valid?
 *  @returns {array} with the track information [full Text, short Text, degrees]
 */
function normalizeTrack(track, valid){
	x = []
	if ((track > -1) && (track < 22.5)) {
		x = ["North", "N", track]
	}
	if ((track > 22.5) && (track < 67.5)) {
		x = ["North East", "NE", track]
	}
	if ((track > 67.5) && (track < 112.5)) {
		x = ["East", "E", track]
	}
	if ((track > 112.5) && (track < 157.5)) {
		x = ["South East", "SE", track]
	}
	if ((track > 157.5) && (track < 202.5)) {
		x = ["South", "S", track]
	}
	if ((track > 202.5) && (track < 247.5)) {
		x = ["South West", "SW", track]
	}
	if ((track > 247.5) && (track < 292.5)) {
		x = ["West", "W", track]
	}
	if ((track > 292.5) && (track < 337.5)) {
		x = ["North West", "NW", track]
	}
	if ((track > 337.5) && (track < 361)) {
		x = ["North", "N", track]
	}
	if (!valid) {
		x = [" ", "n/a", ""]
	}
	return x
}

/**
 *  marks a plane as selected without opening the info modal
 *
 *  @param {string} icao the hex of the plane
 */
function selectPlaneWithoutModal(icao) {
    markPlaneSelected(icao);
}

/**
 *  marks a plane as selected
 *
 *  @param {string} icao the hex of the plane
 */
function markPlaneSelected(icao) {
    if (SelectedPlane != null) {
		Planes[SelectedPlane].is_selected = false;
		Planes[SelectedPlane].markerColor = MarkerColor;
		// If the selected has a marker, make it not stand out
		if (Planes[SelectedPlane].marker) {
			Planes[SelectedPlane].marker.setIcon(Planes[SelectedPlane].funcGetIcon());
		}
	}
    if (String(SelectedPlane) != String(icao)) {
		// Assign the new selected
		SelectedPlane = icao;
		Planes[SelectedPlane].is_selected = true;
		// If the selected has a marker, make it stand out
		if (Planes[SelectedPlane].marker) {
			Planes[SelectedPlane].marker.setIcon(Planes[SelectedPlane].funcGetIcon());
		}
	} else {
		SelectedPlane = null;
	}
}

function unmarkSelectedPlane() {
    Planes[SelectedPlane].is_selected = false;
    Planes[SelectedPlaneOnTable].is_selected = false;
    $('#table_plane_row_' + SelectedPlaneOnTable).removeClass('table-primary');
    SelectedPlaneOnTable = null;
    refreshTablePrimaryRow();
}

function markPlaneOnTable(icao) {
    if (SelectedPlaneOnTable != null) {
		Planes[SelectedPlaneOnTable].is_selected = false;
        $('#table_plane_row_' + icao).removeClass('table-primary');
	}
    if (String(SelectedPlaneOnTable) != String(icao)) {
		// Assign the new selected
		SelectedPlaneOnTable = icao;
		Planes[SelectedPlaneOnTable].is_selected = true;
        $('#table_plane_row_' + icao).addClass('table-primary');
	} else {
		SelectedPlaneOnTable = null;
	}
}

/**
 *  marks a plane as selected and open the info modal
 *
 *  @param {string} icao the hex of the plane
 */
function selectPlane(icao) {
    if(icao) {
        SelectedPlaneICAO = icao;
        refreshTableInfo();
        refreshSelected();
        refreshApiInfo();
        getAircraftInfo(icao);
        getFlight(icao);

        $('#table_plane_row_' + SelectedPlane).addClass('table-primary');
        $('#flightDetailModal').modal('show');
    }
    markPlaneSelected(icao);
    markPlaneOnTable(icao);
}

/**
 *  Get iata code of airline and model code for given icao code
 *  and pass it asynchronously to the next ajax functions
 *
 *  @param {string} icao the hex of the plane
 */
function getAircraftInfo(icao) {
    $.ajax ({
        type: 'GET',
        url: 'https://aviation-edge.com/v2/public/airplaneDatabase?key=' + AviApiKey + '&hexIcaoAirplane=' + icao,
        success: function(data) {
            var aircraft = JSON.parse(data);
            if(aircraft[0] !== undefined) {
                if(aircraft[0].codeIataAirline !== undefined || aircraft[0].codeIataAirline !== '') {
                    getAirline(aircraft[0].codeIataAirline);
                }
                if(aircraft[0].planeModel !== undefined || aircraft[0].planeModel !== '') {
                    getPlaneModel(aircraft[0].planeModel);
                }
            } else {
                $('#modalAirline').text('-');
            }
        }
    });
}

/**
 *  Get plane name of given model and display it on
 *  info model
 *
 *  @param {string} modelCode the unique code of the plane model
 */
function getPlaneModel(modelCode) {
    $.ajax ({
        type: 'GET',
        url: 'http://flightradar.poscher.me/v1/plane/?icao=' + modelCode,
        success: function(data) {
            var plane = data;
            if(plane.name != '') {
                $('#modalModelValue').text(plane.name);
                $('#modalModelRow').show();
            }
        }
    });
}


/**
 *  Get airline name for given iata code
 *  Display it, if found, on the info modalAirline
 *
 *  @param {string} iataCode of the current airline
 */
function getAirline(iataCode) {
    $.ajax ({
        type: 'GET',
        url: 'http://flightradar.poscher.me/v1/airline/?iata=' + iataCode,
        success: function(data) {
            var airline = data;
            if(airline.name != '') {
                $('#modalAirlineValue').text(airline.name);
                $('#modalAirlineRow').show();
            } else {
                $('#modalAirlineValue').text('-');
            }
        }
    });
}

/**
 *  Get departure and arrival airport information
 *  for the current flight
 *
 *  @param {string} icao the hex of the plane
 */
function getFlight(icao) {
    var ts = Math.round((new Date()).getTime() / 1000);
    var begin = ts - 5000;
    var end = ts + 5000;
    $.ajax ({
        type: 'GET',
        url: 'https://alexander:Testkey12@opensky-network.org/api/flights/aircraft?icao24=' + icao + '&begin=' + begin + '&end=' + end,
        success: function(data) {
            var flight = data;
            if(flight[0].estDepartureAirport != null) {
                getDepartureAirport(flight[0].estDepartureAirport);
            }
            if(flight[0].estArrivalAirport != null) {
                getArrivalAirport(flight[0].estArrivalAirport);
            }
        }
    });
}


/**
 *  Get the airporticao for the current departure airport
 *   If the name and the country are given, it displays the airport name and the airport country in the info modal
 *
 *  @param {string} airporticao the id of the departure airport
 */
function getDepartureAirport(airporticao) {
    $.ajax ({
        type: 'GET',
        url: 'http://flightradar.poscher.me/v1/airport/?icao=' + airporticao,
        success: function(data) {
            var airport = data;
            if(airport.name != '') {
                $('#modalDepartureAirportValue').text(airport.name);
                if(airport.country != '') {
                    $('#modalDepartureAirportValue').text(airport.name + ' (' + airport.country + ')');
                }
                $('#modalDepartureAirportRow').show();
            }
        }
    });
}


/**
 *   Get the airporticao for the current arrival airport
 *   If the name and the country are given, it displays the airport name and the airport country
 *   in the info modal
 *
 *   @param {string} airporticao the id of the departure airport
 */
function getArrivalAirport(airporticao) {
    $.ajax ({
        type: 'GET',
        url: 'http://flightradar.poscher.me/v1/airport/?icao=' + airporticao,
        success: function(data) {
            var airport = data;
            if(airport.name != '') {
                $('#modalArrivalAirportValue').text(airport.name);
                if(airport.country != '') {
                    $('#modalArrivalAirportValue').text(airport.name + ' (' + airport.country + ')');
                }
                $('#modalArrivalAirportRow').show();
            }
        }
    });
}
