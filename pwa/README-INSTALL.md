# Solo Realms V18 Android PWA

Publish the **contents** of this folder to the root of a free HTTPS static host (GitHub Pages works). Open the HTTPS address in Chrome on Android while online, choose **Install app** / **Add to Home screen**, and open the installed app once online so its service worker can cache the game shell.

Then open **More options → Rules & settings → Rules guide** and choose **Install free library**. V18 retrieves the SRD source files and caches the validated pack in IndexedDB where available. It restores that cache at later launches. Downloadable spell and Bestiary Markdown files, combined reference Markdown and full JSON backup/import are available in the relevant game pages.

The standalone HTML can run core offline play, but a browser may block cross-origin first-time reference downloads from a `file://` page. Use this HTTPS PWA address for the initial library install.

This is a PWA, not a signed APK. Solo play remains usable offline after the app shell has loaded. Multiplayer requires internet, public PeerJS signaling and public STUN; there is no bundled TURN relay, so some carrier/NAT combinations may block direct connections. Saves remain local unless exported manually.

See `../V18_SETUP.md` and `../README.md` for player steps, restart behavior and limitations.
