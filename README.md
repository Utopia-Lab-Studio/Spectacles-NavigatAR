# Spectacles-NavigatAR
<p align="center">
<img src="https://github.com/Utopia-Lab-Studio/Spectacles-NavigatAR/blob/main/screenshot.JPG" alt="shot 1" width="800">
</p>

## What is it
A next-generation outdoor navigation system leveraging Snap Spectacles’ advanced AR capabilities. With NavigatAR, users can search nearby places, receive AR navigation guidance, and explore intuitive visual cues on their Spectacles. This README outlines the core features, current development progress, and how to get started integrating or customizing NavigatAR for your own use.

## Features
<p align="left">
<b>1. Search Mode</b>
<ul>
</p>
<li>Location search</li>
<li>Neaby places search (currently available: Hotel, Restaurant, Coffee shop)</li>
</ul>
<p align="left">
<b>2. Command</b>
<ul>
</p>
<li>Hand</li>
<li>Voice Command</li>
<li>Keyboard input</li>
</ul>
</p>
<p align="left">
<b>3. AR guide system </b>
<ul>
<li>AR visual cues</li>
<li>Navigation suggestion with Map Web View</li>
<li>On hand Minimap</li>
</ul>
</p>


## Prerequisites
- Lens Studio: v5.4.0+
- Spectacles OS Version: v5.59.218+
- Spectacles App (iOS/Android): v0.59.1.1+

Make sure your Spectacles and mobile app are updated. Follow the Spectacles update guide to ensure you’re running the latest firmware.

## User Flow

### 1. Choose a Destination

<p align="left">
  <img src="https://github.com/user-attachments/assets/fcbd5256-63af-4cf7-bd91-8de67218253a" width="600" />
</p>
<p style="line-height: 2.5; text-align: left;">
  <b>Choose Destination:</b><br> Say “Take me to [Destination name]” → Pinch “Start”<br>
</p>
<p style="line-height: 2.5; text-align: left;">
  <b>Nearby places search:</b><br> Say “Find [Destination type]” → View results → Select Destination → Pinch “Start”<br>
</p>
<p style="line-height: 2.5; text-align: left;">
  <b>For Keyboard input:</b><br> Say “Show keyboard” to type on AR Keyboard → Pinch “Start”
</p>

<p align="left">
  <img src="https://github.com/user-attachments/assets/5a545fae-0f96-4580-8c8d-20d861ad8de9" width="600" />
</p>
<p align="left">
  Select your desired destination from Nearby Place list and see direction steps → Pinch “Start”
</p>

### 2. AR Navigation System

<p align="left">
  <img src="https://github.com/user-attachments/assets/41ecd7fe-3231-45a6-92a9-584d76024e66" width="600" />
</p>
<p align="left">
  Arrow guide, “Turn-by-Turn” Notification, Direction details, and Speech notifications
</p>

<p align="left">
  <img src="https://github.com/user-attachments/assets/3f4921eb-9038-4c54-b6cf-e4fb3721dffe" width="300" />
</p>
<p align="left">
  Look at your right palm to see progress on hand Minimap and Controls
</p>

<p align="left">
  <img src="https://github.com/user-attachments/assets/211a1e02-8d5e-4e4f-86ba-14207694148c" width="600" />
</p>
<p align="left">
  Arrival Notification – Destination pin + text confirmation
</p>


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
<p style="line-height: 1.5; text-align: left;">
<b>1. This project relied on Google MAP API.  Before using the project please obtain a Google MAP api key by following this instruction</b> 
   https://developers.google.com/maps/documentation/javascript/get-api-key
</p>

<p style="line-height: 1.5; text-align: left;">
<b>2. Enable the following APIs</b> 
   Geocoding API, Directions API, Map Javascripts API, Places API (new)
</p>

<p style="line-height: 1.5; text-align: left;">
<b>3. Host the files in the Web folder in some web hosting.</b>
   These files are customized Google Map that will be called from Spectacles app
</p>

<p style="line-height: 1.5; text-align: left;">
  <b>4. Set the API key and the webpages URL in the project</b>
</p>
<p style="line-height: 1.5; text-align: left;">
  <img src="https://github.com/user-attachments/assets/90fbc0d2-491b-4845-9b97-9ab8ed76ba51" width="1000" />
</p>
<p style="line-height: 2.5; text-align: left;">
<ul>
<li>Select <b>findPlace</b> scene object, enter <b>the Api Key</b> in the Inspector panel.</li>
<li><b>Route URL:</b> set to index.html</li>
<li><b>Nearby URL:</b> set to places.html</li>
</ul>
</p>

>[!NOTE]
>Enable Experimental mode in Lens studio and in the Spectacles app on your mobile phone.
<p align="left">
<b>5. Deploy the project to your Spectacles device.</b>
</p>

## Disclaimer   
NavigatAR is a prototype designed for demonstration and educational purposes. Ensure you follow Snap’s API usage policies, data privacy guidelines, and local regulations for appropriate use.


## Acknowledgment
We would like to say a big THANK YOU to the Snap teams to help us refinning the app. More features to come. Stay tunes.
