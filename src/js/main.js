//****************** MODEL **************************//
//	* Get data from Yelp API
//	* Build array of locations
//	* Handle errors in data retrieval
//***************************************************//

function Model() {
	var self = this;

	//Set up locations
	self.locations =  ko.observableArray();

	//Push locations from Yelp query into array
	self.getLocations = function(businesses) {
		for (var i=0; i < businesses.length; i++ ){
			this.locations.push( new viewModel.bizInfo( businesses[i], i ));
		}
	};

	//Get Yelp image
    self.pwdByYelp = "img/Powered_By_Yelp_Black.png",

	//Send API Query to Yelp
	self.getYelpData = function(cb) {

		var auth = {
			consumerKey: "fCSqFxVC56k7RxD-CXhtFg",
			consumerSecret: "_phQk4XXGzIsVRJ8ZfarixIURVw",
			accessToken: "Ar-g_-LjgtRcBcXgKbTZ9zahrH2kdNNH",
			accessTokenSecret: "NX2X5wtTxbjKn4Q04N0FWQoH-88",
			serviceProvider: {
				signatureMethod: "HMAC-SHA1"
			}
		};

		//var category = 'movietheaters,musicvenues';
		var category = 'restaurants';
		//var category = 'hotels';
		var near = 'Red+Bank+NJ';
		var radius = 5000;
		var sort = 1;
		var accessor = {
			consumerSecret: auth.consumerSecret,
			tokenSecret: auth.accessTokenSecret
		};
		parameters = [];
		parameters.push(['location', near]);
		parameters.push(['category_filter', category]);
		parameters.push(['radius_filter', radius]);
		parameters.push(['sort', sort]);
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

	};
}

//****************** VIEW **************************//
//	* Use Google Map to display locations
//  * Show markers and infoWindows
//**************************************************//

function GoogleMap() {
	var self = this;

	//Initialize Google Map
	self.initialize = function() {

		var mapCanvas = document.getElementById('map');
		var mapOptions = {
			center: new google.maps.LatLng(40.34653, -74.07409),
			zoom: 15,
			mapTypeId: google.maps.MapTypeId.ROADMAP
		};
		self.map = new google.maps.Map(mapCanvas, mapOptions);

		//Add markers to map
		self.setMarkers();

	};

	//Set locations for markers
	self.setMarkers = function() {

		//Get locations from viewModel;
		var locations = viewModel.locations();

		//Set up marker for each location
		for (var i = 0; i < locations.length; i++) {
			var location = locations[i];
			location.marker = new google.maps.Marker({
				position: {lat: location.lat, lng: location.lng },
				map: self.map,
				title: location.title,
				icon: location.icon,
			//	icon: location.icon(),
				animation: google.maps.Animation.DROP
			});
			var marker = location.marker;

			//Define content for info window
			var contentString = location.contentString;

			//Add info window
			location.infoWindow = new google.maps.InfoWindow();
			var infoWindow = location.infoWindow;

			//Add click function to info window
			google.maps.event.addListener(marker,'click', (function(marker,contentString,infoWindow){
				return function() {
					//Show infoWindow content on click
					infoWindow.setContent(contentString);
					infoWindow.open(self.map,marker);
				};
			})(marker,contentString,infoWindow));

		}
	};

	//When filtered item is clicked, map marker bounces and infoWindow opens
	self.showDetails = function(location) {
		location.infoWindow.close();
		var marker = location.marker;
		var infoWindow = location.infoWindow;

		//Set marker animation to about one bounce
		marker.setAnimation(google.maps.Animation.BOUNCE);
		setTimeout(function(){ marker.setAnimation(null); }, 900);

		//Show contentString when infoWindow is opened
		infoWindow.setContent(location.contentString);
		infoWindow.open(self.map,marker);

	};

	google.maps.event.addDomListener(window, 'load', this.initialize);
}

//************************** VIEW MODEL *****************************//
//	* Use Knockoutjs to bind observable data to page
//  * Filter locations by user input (name and/or category)
//  * Set marker visibilty to show only filtered locations on map
//******************************************************************//

function ViewModel() {

    var self = this;

	//Get Yelp data from API
	model.getYelpData();

	//Get data from model
    self.locations = ko.computed(function(){
        return model.locations();
    });

	//Get information about each business from Yelp query data
	self.bizInfo = function(bizObj) {

		//Get coordinates for map placement
		this.lat =  bizObj.location.coordinate.latitude;
		this.lng = bizObj.location.coordinate.longitude;

		//Get info for infoWindow
		this.name =  bizObj.name;
		this.imgUrl = bizObj.image_url;
		this.address = bizObj.location.address[0];
		this.rating = bizObj.rating;
		this.stars = bizObj.rating_img_url;
		this.snippet = bizObj.snippet_text;
		this.city = bizObj.location.city;
        this.state = bizObj.location.state_code;
		this.url = bizObj.url;

		//Format phone number for display
		this.phone = bizObj.phone;
		this.dphone = "(" + bizObj.phone.slice(0,3) + ") " + bizObj.phone.slice(3,6) + "-" + bizObj.phone.slice(6);

		//Create a single array of items for search function: categories and business name
		var keywords = [];
		bizObj.categories.forEach(function(catType){
			catType.forEach(function(cat){
				keywords.push(cat);
			});
		});
		keywords.push(this.name);
		this.keywords = keywords;
		this.icon = "img/restaurant.png";
//		this.fav = ko.observable;

		//Define content for info window
		var windowContent = document.createElement('div'), button;

		windowHTML = '<div class="iw"><div class="place-name">' + this.name + '</div>';
		windowHTML += '<img class="place-image"src="' + this.imgUrl + '" alt="image of '+ this.name + '">';
		windowHTML += '<div class="place-info">' + this.address + '<br>' + this.city + ',' + this.state + '<br>';
		windowHTML += '<a href="tel:' + this.phone + '">' + this.dphone + '</a><br>';
		windowHTML += '<img class="rating-image" src="' + this.stars + '" alt="Yelp star ratung: '+ this.rating + '">';
		windowHTML += '<img class="yelp" src="' + model.pwdByYelp + '" alt="Powered by Yelp"></div>';
		windowHTML += '<div class="review"><strong>Review Snippet</strong><br><span class="place-snippet">'+ this.snippet + '</span></div>';
		windowHTML += '<div><a href="' + this.url + '" class="button" target="_blank">Read Full Review</a>';
		windowHTML += '<div class="button">Add to Favorites</div></div></div>';
		windowContent.innerHTML = windowHTML;
				button = windowContent.appendChild(document.createElement('input'));
        button.type = 'button';
        button.value = 'Add to Favorites';
		var that = this;
		google.maps.event.addDomListener(button, 'click', function () {
			self.makeFav(that);
		});

		this.contentString = windowContent;

	};

	//Set filter as an observable
	self.filter = ko.observable('');

	//Filter locations using computed function
	self.filteredLocations = ko.computed(function() {

		//Convert filter to lower case (simplifies comparison)
		var filter = self.filter().toLowerCase();

		if (!filter){
			return self.locations();

		} else {

			//set output to empty variable
			var output = null;

			//Call filter function to pull out locations that match keyword
			output = ko.utils.arrayFilter(self.locations(), keyWordfilter);

			//Return array matching locations
			return output;
		}
		//Keyword filter function
		function keyWordfilter(location) {

			//Set match to false so location is not returned by default
			var match = false;

			//Set marker visibility to false
			location.marker.setVisible(false);

			//Close infoWindow if open
			location.infoWindow.close();

			//Check each item in keywords array for match
			location.keywords.forEach(function(keyword) {

				//If keyword matches filter, change match to true and make marker visible
				if (keyword.toLowerCase().indexOf(filter) >= 0) {
					match = true;
					location.marker.setVisible(true);
				}
			});

			//return location if any match is found
			return match;
		}
	});



	//When item is favorited icon bounces and info window closes
	self.makeFav = function(location) {
		location.infoWindow.close();
		location.marker.icon = "img/hotel.png";

		//Set marker animation to about one bounce
		location.marker.setAnimation(google.maps.Animation.BOUNCE);
		setTimeout(function(){ location.marker.setAnimation(null); }, 750);
	};

}

var model = new Model();
var viewModel =  new ViewModel();
var map = new GoogleMap();
ko.applyBindings(viewModel);
//TODO: Add other business types (hotels, theaters/music venues, coffee shops)
//TODO: Add localstorage so filter persists
//TODO: Add another API -- NJ Transit, weather channel, sunrise and sunset times
//TODO: Customize map and icon colors
//TODO: Upgrade search capacity to include autocomplete or filter by multiple items
//TODO: Make error handling more robust