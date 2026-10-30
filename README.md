# Apex Heights Plot 14 Preview

A mobile-first property visualization prototype for a real estate sign. Run it with `npm install` and `npm run dev`, or create a production build with `npm run build`.

## UI Wireframe

- **Header:** Apex Heights branding, Plot 14 identification, GPS status, sound control, and an experience guide.
- **Camera viewport:** A full-screen plot preview, an interactive architectural model, a center reticle, and a compass heading. A live camera can replace the sample image after permission is granted.
- **Property sheet:** Villa details and price, wireframe/full-render selector, floor-level slider, site-visit action, and PDF download.
- **Dialogs:** A short experience guide and a demo visit-request form.

## User Flow

1. Scan a sign's QR code linked to the deployed HTTPS URL and open the plot preview in a browser.
2. Start the live camera and allow camera and location permissions. The GPS badge reports the device's actual accuracy when available.
3. Drag the model to rotate it, switch between wireframe and full render, and change the number of floors.
4. Download the illustrative floor plan or save a demo request for a site visit or agent conversation.

## Prototype Limits

The model is a screen-space visual overlay, not a ground-anchored or GPS-positioned AR object. Real-world tracking would require a compatible spatial-tracking/geospatial service and actual plot coordinates. Camera and location access require a secure context and user permission. The floor plan is illustrative, and visit requests are stored only on the current device; they are not sent to an agent.