# Spectacles-NavigatAR
<img src="https://github.com/Utopia-Lab-Studio/Spectacles-NavigatAR/blob/main/screenshot.JPG" alt="shot 1" width="600" height="400">

## What is it
A next-generation outdoor navigation system leveraging Snap Spectacles’ advanced AR capabilities. With NavigatAR, users can search nearby places, receive AR navigation guidance, and explore intuitive visual cues on their Spectacles. This README outlines the core features, current development progress, and how to get started integrating or customizing NavigatAR for your own use.

## Features
1. AR guide system
2. Voice Command
3. Keyboard input
4. Navigation suggestion with Map Web View 
5. On hand Minimap 


## Prerequisites
- Lens Studio: v5.4.0+
- Spectacles OS Version: v5.59.218+
- Spectacles App (iOS/Android): v0.59.1.1+

Make sure your Spectacles and mobile app are updated. Follow the Spectacles update guide to ensure you’re running the latest firmware.


## User Flow
1. Confirm North-facing direction
2. Choose a Destination
    - Choose Destination: Say “Take me to [Destination name]” → Pinch “Start”
    - Nearby places: Say “Find [Destination type]” → View results → Select Destination → Pinch “Start”
    - Keyboard input: Say “Show keyboard” to type on AR Keyboard → Pinch “Start”
    - AR Navigation System – Arrow guide, Hand Mini-map, Direction details, and Speech notifications
    - “Turn-by-Turn” Notification
    - Arrival Notification – Destination pin + text confirmation

## Current limitations
- The Spectacles' GPS accurate to within a 5 meters radius. (similar to the mobile phones' GPS)
- If the users start near the junction (<10 meters), the app can give the wrong N,E,W,S directions due to the GPS precision. \
  Ex. the user is at the North side of the junction, but the app thinks that the user is on the East side.  \
  Better to start the navigation a little bit farther from the junction.
- The app detects that users have successfully turned left/right to a new road segment and shows the new road direction if the users turn their head into the new direction for 0.5 second.  \
  We cannot use the user's distance to the junction point because of the GPS accuracy.
- In the current version, the app can only handle turns left and right.  It cannot handle unusual instructions that might be returned from Google Map API. \
  We plan to cover other instructions in the next version. 


## Setting up the project in Lens Studio
1. This project relied on Google MAP API.  Before using the project please obtain a Google MAP api key by following this instruction \
   https://developers.google.com/maps/documentation/javascript/get-api-key
2. Enable the following APIs \
   Geocoding API, Directions API, Map Javascripts API, Places API (new) 
3. Host the files in the Web folder in some web hosting. \
   These files are customized Google Map that will be called from Spectacles app
4. Set the API key and the webpages URL in the project \
![Image](https://github.com/user-attachments/assets/90fbc0d2-491b-4845-9b97-9ab8ed76ba51)
   Select findPlace scene object, enter the Api Key in the Inspector panel. \
   Route URL: set to index.html \
   Nearby URL: set to places.html


6. Enable Experimental mode in Lens studio and in the Spectacles app on your mobile phone
7. Start the app. 

## Disclaimer   
NavigatAR is a prototype designed for demonstration and educational purposes. Ensure you follow Snap’s API usage policies, data privacy guidelines, and local regulations for appropriate use.


## Acknowledgment
We would like to say a big THANK YOU to the Snap teams to help us refinning the app. More features to come. Stay tunes.
