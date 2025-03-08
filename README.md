# Spectacles-NavigatAR

## What is it
- An AR navigation app for Spectacles.  Want to go somewhere? Just tell Spectacles. "Take me to the [place name]." \
Real time AR path will lead you to the destination. Are you hungry? Just say >>> “Find restaurants” \
Need a place to stay? Yes, you can ask for that too >>> “Find hotels” 

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
-


## Acknowledgment
