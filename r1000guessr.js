// ==UserScript==
// @name         WorldGuessr Helper (Map Included)
// @namespace    http://tampermonkey.net/
// @author       r1000
// @version      5.0
// @description  F3: Scan & Show Map (Top-Right). F4: Toggle. Wide zoom. Clean code. Please don't skid
// @match        https://www.worldguessr.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=worldguessr.com
// @grant        none
// @license      GPL-3.0
// ==/UserScript==


//  ██████╗  ██╗██████╗  ██████╗  ███████╗
//  ██╔══██╗███║██╔══██╗██╔═══██╗██╔══   ██╗
//  ██████╔╝╚██║██║  ██║██║   ██║██║     ██║
//  ██╔══██╗ ██║██║  ██║██║   ██║██║     ██║
//  ██║  ██║ ██║╚██████╔╝╚██████╔╝╚██████╔╝
//  ╚═╝  ╚═╝ ╚═╝ ╚═════╝  ╚═════╝  ╚═════╝


( function ( ) {
    'use strict';

    const CONTAINER_ID = "wg-helper-v13";
    const oldIds = [ "wg-helper-v12", "wg-helper-v11", "wg-aimbot-ui-v10", "wg-interactive-map-v9", "wg-interactive-map-v8", "coords-overlay", CONTAINER_ID ];
    
    oldIds.forEach( ( id ) => {
        const el = document.getElementById( id );
        if ( el ) el.remove( );
    } );

    const container = document.createElement( "div" );
    container.id = CONTAINER_ID;
    container.style.cssText = "position:fixed;top:20px;right:20px;width:400px;background:rgba(15,15,15,0.95);border:1px solid #444;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,0.8);z-index:9999999;font-family:'Segoe UI',sans-serif;overflow:hidden;display:none;backdrop-filter:blur(5px);flex-direction:column;transition:opacity 0.2s ease;";

    const header = document.createElement( "div" );
    header.style.cssText = "padding:10px 15px;background:#222;color:#aaa;font-size:13px;font-weight:bold;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;";

    const statusText = document.createElement( "span" );
    statusText.id = "wg-status";
    statusText.innerHTML = "🛰️ Ready [F3]";
    header.appendChild( statusText );

    const controls = document.createElement( "div" );
    
    const extLink = document.createElement( "span" );
    extLink.innerHTML = "↗️";
    extLink.title = "Open full Google Maps";
    extLink.style.cssText = "cursor:pointer;margin-right:15px;font-size:15px;opacity:0.7;";
    extLink.onclick = ( ) => {
        const lat = container.getAttribute( "data-lat" );
        const lng = container.getAttribute( "data-lng" );
        if ( lat && lng ) window.open( `https://www.google.com/maps/place/${lat},${lng}/@${lat},${lng},6z`, "_blank" );
    };
    controls.appendChild( extLink );

    const closeBtn = document.createElement( "span" );
    closeBtn.textContent = "✖";
    closeBtn.style.cssText = "cursor:pointer;font-size:15px;opacity:0.7;";
    closeBtn.onclick = ( ) => { container.style.display = "none"; };
    controls.appendChild( closeBtn );

    header.appendChild( controls );
    container.appendChild( header );

    const mapContainer = document.createElement( "div" );
    mapContainer.style.cssText = "width:100%;height:300px;position:relative;background:#000;flex-shrink:0;";
    
    const mapFrame = document.createElement( "iframe" );
    mapFrame.id = "wg-map-frame";
    mapFrame.style.cssText = "width:100%;height:100%;border:none;";
    mapFrame.src = "about:blank";
    mapFrame.setAttribute( "allowfullscreen", "" );
    mapFrame.setAttribute( "loading", "lazy" );
    
    mapContainer.appendChild( mapFrame );
    container.appendChild( mapContainer );

    const footer = document.createElement( "div" );
    footer.id = "wg-footer";
    footer.innerHTML = "Press F3 to scan location";
    footer.style.cssText = "padding:12px 15px;background:#1a1a1a;color:#fff;font-size:13px;text-align:center;border-top:1px solid #333;line-height:1.4;white-space:normal;word-wrap:break-word;";
    container.appendChild( footer );

    document.body.appendChild( container );

    function getAllMapCoords( ) {
        const iframes = document.getElementsByTagName( 'iframe' );
        const candidates = [ ];
        for ( let i = 0; i < iframes.length; i++ ) {
            if ( iframes[ i ].id === "wg-map-frame" ) continue;
            try {
                if ( iframes[ i ].src && ( iframes[ i ].src.includes( 'lat=' ) || iframes[ i ].src.includes( '!1d' ) ) ) {
                    const url = new URL( iframes[ i ].src );
                    let lat = parseFloat( url.searchParams.get( 'lat' ) );
                    let lng = parseFloat( url.searchParams.get( 'long' ) );
                    if ( isNaN( lat ) ) {
                        const match = iframes[ i ].src.match( /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/ );
                        if ( match ) { lat = parseFloat( match[ 1 ] ); lng = parseFloat( match[ 2 ] ); }
                    }
                    if ( !isNaN( lat ) && !isNaN( lng ) ) candidates.push( { lat, lng } );
                }
            } catch ( e ) {}
        }
        return candidates;
    }

    async function reverseGeocode( lat, lng ) {
        try {
            const res = await fetch( `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1` );
            const data = await res.json( );
            return data.display_name || "Unknown Location";
        } catch ( e ) {
            return `${lat.toFixed( 5 )}, ${lng.toFixed( 5 )}`;
        }
    }

    async function handleScan( ) {
        container.style.display = "flex";
        const status = document.getElementById( "wg-status" );
        const footerEl = document.getElementById( "wg-footer" );
        const frame = document.getElementById( "wg-map-frame" );

        status.innerHTML = "🛰️ Scanning...";
        status.style.color = "cyan";

        await new Promise( ( r ) => setTimeout( r, 200 ) );

        const coords = getAllMapCoords( );
        if ( coords.length > 0 ) {
            const target = coords[ coords.length - 1 ];
            
            container.setAttribute( "data-lat", target.lat );
            container.setAttribute( "data-lng", target.lng );

            frame.src = `https://maps.google.com/maps?q=${target.lat},${target.lng}&z=4&output=embed`;

            status.innerHTML = "📍 LOCKED";
            status.style.color = "#0f0";
            
            footerEl.innerHTML = "Resolving address...";
            const address = await reverseGeocode( target.lat, target.lng );
            footerEl.innerHTML = `✅ <b>${address}</b>`;
        } else {
            status.innerHTML = "❌ NO SIGNAL";
            status.style.color = "orange";
            footerEl.innerHTML = "Wait for round start.";
            frame.src = "about:blank";
        }
    }

    document.addEventListener( "keydown", ( e ) => {
        if ( e.key === "F3" ) {
            e.preventDefault( );
            handleScan( );
        }
        if ( e.key === "F4" ) {
            e.preventDefault( );
            container.style.display = ( container.style.display === "none" ) ? "flex" : "none";
        }
    } );

    const toast = document.createElement( "div" );
    toast.textContent = "Helper Ready: F3 Scan | F4 Hide";
    toast.style.cssText = "position:fixed;top:20px;right:20px;background:#222;color:#fff;padding:8px 12px;border-radius:4px;font-size:11px;z-index:9998;pointer-events:none;opacity:0.8;border:1px solid #444;";
    document.body.appendChild( toast );
    setTimeout( ( ) => { toast.style.opacity = "0"; setTimeout( ( ) => toast.remove( ), 500 ); }, 3000 );

} )( );

//  ██████╗  ██╗██████╗  ██████╗  ███████╗
//  ██╔══██╗███║██╔══██╗██╔═══██╗██╔══   ██╗
//  ██████╔╝╚██║██║  ██║██║   ██║██║     ██║
//  ██╔══██╗ ██║██║  ██║██║   ██║██║     ██║
//  ██║  ██║ ██║╚██████╔╝╚██████╔╝╚██████╔╝
//  ╚═╝  ╚═╝ ╚═╝ ╚═════╝  ╚═════╝  ╚═════╝
