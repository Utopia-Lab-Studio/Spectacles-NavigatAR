// LocationService.js
// Version: 1.0.0
// Event: OnStartEvent()
// Description: Uses LocationService to get users current position.
// Copyright (c) 2023 Snap Inc.

//@ui {"widget":"label"}
//@ui {"widget":"label", "label":"How often should user location be updated"}
//@input int sampleRateMillis = 100

// Recommended to use smoother compass heading instead of raw compass
// Note: Smoothed compass option is not avaible on older Lens Studio versions
//@input bool useRawCompassHeading 


var userLocation = { longitude: 0.0, latitude: 0.0, heading: null };

/**
 * Returns user location 
 */
script.getUserLocation = function () {
    return userLocation;
};

script.createEvent("OnStartEvent").bind(function () {
    // Create location handler
    locationService = GeoLocation.createLocationService();
    locationService.accuracy = GeoLocationAccuracy.High;

    // Compass Updates
    var onOrientationUpdate = function (northAlignedOrientation) {

        //compass heading from device motion
        var heading = GeoLocation.getNorthAlignedHeading(northAlignedOrientation);
        userLocation.heading = heading;
    };

    if (!script.useRawCompassHeading) {
        locationService.onNorthAlignedOrientationUpdate.add(onOrientationUpdate);
    }

    repeatUpdateUserLocation.reset(0.0);
});

/**
 * Delayed event for updating user location
 */
var repeatUpdateUserLocation = script.createEvent("DelayedCallbackEvent");
repeatUpdateUserLocation.bind(function () {
    locationService.getCurrentPosition(
        function (geoPosition) {
            var longitude = geoPosition.longitude;
            var latitude = geoPosition.latitude;
            var horizontalAccuracy = geoPosition.horizontalAccuracy;
            var verticalAccuracy = geoPosition.verticalAccuracy;

            // raw position heading
            var heading = geoPosition.heading;
            var headingAvailable = geoPosition.isHeadingAvailable;

            userLocation.longitude = longitude;
            userLocation.latitude = latitude;

            if (script.useRawCompassHeading) {
                userLocation.heading = heading;
            }
        },
        function (error) {
            print("Location not found");
        }
    );
    repeatUpdateUserLocation.reset(script.sampleRateMillis / 1000);
});