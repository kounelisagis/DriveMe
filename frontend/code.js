$(document).ready(function() {

  var mymap = L.map('map').setView([60.1660,24.9400], 14);
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoicmVwdXRnbG9yeTEiLCJhIjoiY2p5YTdpdDF3MGIzeTNpb2duOWE2OHh1diJ9.D6EFltnyZ4QXGqu-pbXpsA', {
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: 'your.mapbox.access.token'
  }).addTo(mymap);
  mymap.doubleClickZoom.disable();
  var markersLayer = L.featureGroup().addTo(mymap);


  var popup = L.popup();
  var latlng = null;

  var drivers = [];
  var candidates = [];
  var destination = null;
  var destination_marker = null;

  var clicked_marker = null;


  $(document).on("click","#add_driver",function(){
    mymap.closePopup();
    delete_all_routes();
    create_driver();
  });

  function create_driver(){
    drivers.push(latlng);
    var marker = L.marker(latlng, {icon: yellowIcon}).addTo(mymap);
    marker.on('click', function(){
      onClick(marker, 'driver');
    });
  }

  $(document).on("click","#add_candidate",function(){
    mymap.closePopup();
    delete_all_routes();
    create_candidate();
  });

  function create_candidate(){
    candidates.push(latlng);
    var marker = L.marker(latlng, {icon: greenIcon}).addTo(mymap);
    marker.on('click', function(){
      onClick(marker, 'candidate');
    });
  }

  $(document).on("click","#add_destination",function(){
    mymap.closePopup();
    delete_all_routes();
    create_destination();
  });

  function create_destination(){
    if(destination_marker)
      mymap.removeLayer(destination_marker);
    destination = latlng;
    destination_marker = L.marker(destination, {icon: redIcon}).addTo(mymap);
    destination_marker.on('click', function(){
      onClick(destination_marker, 'destination');
    });
  }

  function onClick(marker, who) {
    clicked_marker = marker;
    latlng = marker.getLatLng();
    console.log(latlng.lat.toString() + ', '+ latlng.lng.toString());

    $.ajax({
      url: "http://open.mapquestapi.com/geocoding/v1/reverse?key=MY_KEY&location=" + latlng.lat.toString()+','+latlng.lng.toString(),
      type: "get",
      success: function(response) {
        console.log("Hooray, it worked!");
        console.log(response['results'][0]['locations'][0]['street']);
        popup
            .setLatLng(latlng)
            .setContent(who+'<br>'+response['results'][0]['locations'][0]['street']+'<br><button id="remove_' + who + '">Remove</button>')
            .openOn(mymap);
      },
      error: function (request, status, error) {
        console.log(request.responseText);
      }
    });
  }

  $(document).on("click","#remove_driver",function(){
    console.log("here");
    mymap.closePopup();
    mymap.removeLayer(clicked_marker);
    drivers.splice( drivers.indexOf(latlng), 1 );
    delete_all_routes();
  });

  $(document).on("click","#remove_candidate",function(){
    mymap.closePopup();
    mymap.removeLayer(clicked_marker);
    candidates.splice( candidates.indexOf(latlng), 1 );
    delete_all_routes();
  });

  $(document).on("click","#remove_destination",function(){
    mymap.closePopup();
    mymap.removeLayer(clicked_marker);
    destination = null;
    delete_all_routes();
  });


  $(document).on("click","#print",function(){
    //console.log(destination);
    if(drivers.length > 0 && destination != null)
      print_all_routes();
    else
      console.log("error");
  });

  var graphs = [];

  function print_route(waypoints) {
    console.log(waypoints);
    var index = graphs.length % colors.length;

    graphs.push(L.Routing.control({
        waypoints: waypoints,
        lineOptions: {
           styles: [{color: colors[index], opacity: 1, weight: 5}],
           addWaypoints: false
        },
        createMarker: function() { return null; },
        fitSelectedRoutes: false,
        router: L.Routing.mapbox('MY_KEY')
    }).addTo(mymap));
  }

  function delete_all_routes() {
    for (i = 0; i < graphs.length; i++)
      mymap.removeControl(graphs[i]);
    graphs = [];
  }

  function print_all_routes() {

    var to_send_data = {};
    to_send_data['destination'] = {'lat': destination.lat, 'lng': destination.lng};
    to_send_data['drivers'] = []
    for (i = 0; i < drivers.length; i++) {
      to_send_data['drivers'].push({'lat': drivers[i].lat, 'lng': drivers[i].lng});
    }
    to_send_data['candidates'] = []
    for (i = 0; i < candidates.length; i++) {
      to_send_data['candidates'].push({'lat': candidates[i].lat, 'lng': candidates[i].lng});
    }

    console.log(JSON.stringify(to_send_data));

    request = $.ajax({
      url: "https://reputglory1.pythonanywhere.com/driveme",
      type: "post",
      dataType: "json",
      contentType: "application/json",
      data: JSON.stringify(to_send_data)
    });

    // Callback handler that will be called on success
    request.done(function (response, textStatus, jqXHR){
      // Log a message to the console
      console.log("Hooray, it worked!");
      delete_all_routes();
      for (i = 0; i < response['routes'].length; i++) {
        print_route(response['routes'][i]);
      }
      //var directions = $();
      $('#directions').append($(".leaflet-routing-container"));
      //console.log(html);
    });

    // Callback handler that will be called on failure
    request.fail(function (jqXHR, textStatus, errorThrown){
      // Log the error to the console
      console.error(
          "The following error occurred: "+
          textStatus, errorThrown
      );
    });

  }

  function onMapClick(e) {
      latlng = e.latlng;
      popup
          .setLatLng(e.latlng)
          .setContent('<button id="add_driver">Add driver location</button><br><button id="add_candidate">Add candidate location</button><button id="add_destination">Choose destination location</button>')
          .openOn(mymap);
  }
  mymap.on('click', onMapClick);


  var colors = ['red', 'green', 'blue', 'orange', 'yellow'];


  /*
    Initial Example
  */
  /*
    Initial Example
  */
  // drivers
  var d_arr = [];
  d_arr.push(L.latLng(60.172641348219855, 24.919652938842777));
  d_arr.push(L.latLng(60.16901239775532, 24.9360466003418));
  d_arr.push(L.latLng(60.16990899927236, 24.953470230102543));
  d_arr.push(L.latLng(60.155389584558506, 24.950723648071293));
  for (i = 0; i < d_arr.length; i++) {
    latlng = d_arr[i];
    create_driver();
  }

  // candidates
  var c_arr = [];
  c_arr.push(L.latLng(60.17439163984145, 24.9085807800293));
  c_arr.push(L.latLng(60.17114712304643, 24.933643341064453));
  c_arr.push(L.latLng(60.16593814964542, 24.936389923095707));
  c_arr.push(L.latLng(60.170122472217564, 24.958448410034183));
  c_arr.push(L.latLng(60.164998738682264, 24.950380325317383));
  c_arr.push(L.latLng(60.164443619580254, 24.945402145385746));
  c_arr.push(L.latLng(60.160600230133824, 24.930210113525394));
  c_arr.push(L.latLng(60.15837940023762, 24.935445785522464));
  c_arr.push(L.latLng(60.15765332714606, 24.941368103027347));
  c_arr.push(L.latLng(60.15974608254767, 24.94900703430176));
  for (i = 0; i < c_arr.length; i++) {
    latlng = c_arr[i];
    create_candidate();
  }

  destination = L.latLng(60.16017315911549, 24.938192367553714);
  latlng = destination;
  create_destination();
  print_all_routes();

});
