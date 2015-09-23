var model =  {

	//Set up locations
	locations: ko.observableArray(),

	//Push locations from Yelp query into array
	getLocations: function(businesses) {
		for (var i=0; i < businesses.length; i++ ){
			this.locations.push( new this.bizInfo( businesses[i]));
		}
	},

	//Get information about each business from Yelp query data
	bizInfo: function(bizObj) {
		this.lat =  bizObj.location.coordinate.latitude;
		this.lng = bizObj.location.coordinate.longitude;
		this.name =  bizObj.name;
		this.phone = bizObj.phone;
		this.imgUrl = bizObj.image_url;
		this.address = bizObj.location.address[0];
		this.phone = bizObj.phone;
		this.dphone = bizObj.display_phone;
		this.rating = bizObj.rating;
		this.stars = bizObj.rating_img_url_small;
		this.snippet = bizObj.snippet_text;
		this.reviewer = bizObj.snippet_image_url;
		this.url = bizObj.url;
	},

	//Send API Query to Yelp
	getYelpData: function(cb) {

		var auth = {
		  consumerKey: "fCSqFxVC56k7RxD-CXhtFg",
		  consumerSecret: "_phQk4XXGzIsVRJ8ZfarixIURVw",
		  accessToken: "Ar-g_-LjgtRcBcXgKbTZ9zahrH2kdNNH",
		  accessTokenSecret: "NX2X5wtTxbjKn4Q04N0FWQoH-88",
		  serviceProvider: {
			signatureMethod: "HMAC-SHA1"
		  }
		};

		//var terms = 'food';
		var near = 'Red+Bank+NJ';
		var accessor = {
		  consumerSecret: auth.consumerSecret,
		  tokenSecret: auth.accessTokenSecret
		};
		parameters = [];
		parameters.push(['location', near]);
		//parameters.push(['term', terms]);
		parameters.push(['callback', 'cb']);
		parameters.push(['oauth_consumer_key', auth.consumerKey]);
		parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
		parameters.push(['oauth_token', auth.accessToken]);
		parameters.push(['oauth_signature_method', 'HMAC-SHA1']);

		var message = {
		  'action': 'http://api.yelp.com/v2/search',
		  'method': 'GET',
		  'parameters': parameters
		};
		OAuth.setTimestampAndNonce(message);
		OAuth.SignatureMethod.sign(message, accessor);
		var parameterMap = OAuth.getParameterMap(message.parameters);
		parameterMap.oauth_signature = OAuth.percentEncode(parameterMap.oauth_signature);

		$.ajax({
			  url: message.action,
			  data: parameterMap,
			  cache: true,
			  dataType: 'jsonp',
			  jsonpCallback: 'cb'
		})
		//When sucessful send to getLocations
		.done( function( data ) {
			model.getLocations(data.businesses);
			console.log(data.businesses);
		})
	    //When fail show error message
		//TOD0: Make response more robust
		.fail ( function(){
			alert( "fail" );
			console.log("Could not get data");
		});

	}
}

var ViewModel =  function() {

    var self = this;

	this.locations = model.locations();

	//Initialize Google Map
	this.initialize = function() {

		var mapCanvas = document.getElementById('map');
		var mapOptions = {
		  center: new google.maps.LatLng(40.34653, -74.07409),
		  zoom: 15,
		  mapTypeId: google.maps.MapTypeId.ROADMAP
		};
		var map = new google.maps.Map(mapCanvas, mapOptions);

		//Add markers to map
		self.setMarkers(map);

	};

	//Set locations for markers
	this.setMarkers = function(map) {
		places = this.locations;
		for (var i = 0; i < places.length; i++) {
			var place = places[i];
			var marker = new google.maps.Marker({
				position: {lat: place.lat, lng: place.lng },
				map: map,
				title: place.title
			});

			//define content for info window
			var contentString = '<div class="place-name"><a href="' + place.url + '">'+ place.name + '</a></div>';
				contentString += '<img class="place-image"src="' + place.imgUrl + '" alt="image of '+ place.name + '">';
				contentString += '<div class="place-info">' + place.address + '<br>' + '<a href="tel:' + place.phone + '">' + place.dphone + '</a>';
				contentString += '<img class="rating-image" src="' + place.stars + '" alt="star ratung: '+ place.rating + '"></div>';
				contentString += '<div class="review"><strong>Yelp Review Snippet</strong><br><span class="place-snippet">'+ place.snippet + '</span>';
				contentString += '<img class="reviewer-image" src="' + place.reviewer + '" alt="reviewer image"></div>';
			//add info window
			var infoWindow = new google.maps.InfoWindow();

			//add click function to info window
			google.maps.event.addListener(marker,'click', (function(marker,contentString,infoWindow){
				return function() {
					infoWindow.setContent(contentString);
					infoWindow.open(map,marker);
				};
			})(marker,contentString,infoWindow));
		}
	}
	model.getYelpData();
	google.maps.event.addDomListener(window, 'load', self.initialize);
}

ko.applyBindings( new ViewModel() );