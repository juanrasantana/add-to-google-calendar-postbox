"use strict";

window.addEventListener("load", function firstload(e) { 
	startup();
	window.removeEventListener("load", firstload, false);
}, false);

function hideContextMenu() {
	let contextMenu = document.getElementById("addtogooglecalendarid");
	contextMenu.hidden = true;
}

function showContextMenu() {
	let contextMenu = document.getElementById("addtogooglecalendarid");
	contextMenu.hidden = false;
}

function checkICSattachment(e) {
	let extension = null;
	if (currentAttachments.length <= 0) {
		hideContextMenu();
		return
	}
	for (let i in currentAttachments) {
		extension = currentAttachments[i].displayName.split('.').pop();
		if (extension === 'ics' || extension === 'ICS') {
			showContextMenu();
			break;
		}
	}
}

function parseICSString(data) {
	let event = {};
	let events = [];
	let arrayICS;
	let beginEventRegExp = new RegExp("BEGIN:VEVENT");
	let endEventRegExp = new RegExp("END:VEVENT");
	let startEventTimeRegExp = new RegExp("DTSTART");
	let endEventTimeRegExp = new RegExp("DTEND");
	let summaryEventRegExp = new RegExp("SUMMARY");
	let descriptionEventRegExp = new RegExp("DESCRIPTION");
	let locationEventRegExp = new RegExp("LOCATION");
	let statusEventRegExp = new RegExp("STATUS");
	arrayICS = data.split("\n");

	for (let i in arrayICS) {
		if (beginEventRegExp.test(arrayICS[i])) {
			let j = 0;
			while (j < arrayICS.length) {
				if (startEventTimeRegExp.test(arrayICS[j])) {
					let indexTime = arrayICS[j].indexOf(':');
					let indexTZ = arrayICS[j].indexOf('=');
					event.start = arrayICS[j].substr(indexTime + 1);
					event.start = event.start.replace(/[\n\r]/g, '');
					event.timezone = arrayICS[j].substr(indexTZ + 1, indexTime - indexTZ -1);
				}
				if (endEventTimeRegExp.test(arrayICS[j])) {
					event.end = arrayICS[j].substr(arrayICS[j].indexOf(':') + 1);
					event.end = event.end.replace(/[\n\r]/g, '');
				}
				if (descriptionEventRegExp.test(arrayICS[j])) {
					event.description = arrayICS[j].substr(12);
					while (arrayICS[j+1][0] == ' ') {
						event.description += arrayICS[j+1].substr(1);
						j += 1;
					}
					event.description = event.description.replace(/[\n\r]/g, '');
					event.description = event.description.replace(/\\n/g, '%0A');
				}
				if (summaryEventRegExp.test(arrayICS[j])) {
					event.summary = arrayICS[j].substr(8).replace(/[\n\r]/g, '');
				}
				if (locationEventRegExp.test(arrayICS[j])) {
					event.location = arrayICS[j].substr(9).replace(/[\n\r]/g, '');
				}
				if (statusEventRegExp.test(arrayICS[j])) {
					event.status = arrayICS[j].substr(7).replace(/[\n\r]/g, '');
				}
				if (endEventRegExp.test(arrayICS[j])) {
					events.push(event);
					event = {};
				}
				j += 1;
			}
		}
	}
	for (let k in events) {
		messenger.launchExternalURL('https://www.google.com/calendar/render?action=TEMPLATE' +
		'&text=' + events[k].summary +
		'&dates=' + events[k].start + '/' + events[k].end +
		'&ctz=' + events[k].timezone +
		'&details=' +  events[k].description +
		'&location=' +  events[k].location +
		'&sf=true&output=xml');
	}
}

function createEventFromICS(e) {
	Components.utils.import("resource://gre/modules/Services.jsm");  
	Components.utils.import("resource://gre/modules/NetUtil.jsm");
	let extension;
	let attachment;
	for (let i in currentAttachments) {
	  	extension = currentAttachments[i].displayName.split('.').pop();
		if (extension === 'ics' || extension === 'ICS') {
			attachment = currentAttachments[i];
			break;
		} else {
			alert("No .ics file found.");
		}
  	}
	let url = Services.io.newURI(attachment.url, null, null);
	let channel = Services.io.newChannelFromURI(url);
	let chunks = [];
	let unicodeConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]  
	                       .createInstance(Ci.nsIScriptableUnicodeConverter);  
	unicodeConverter.charset = "UTF-8";
	let listener = {  
	  onStartRequest: function ( aRequest, aContext) {  
	  },
	  onStopRequest: function (aRequest, aContext, aStatusCode) {  
	    let data = chunks.join("");
	    parseICSString(data);
	  },
	  onDataAvailable: function (aRequest, aContext, aStream, aOffset, aCount) {  
	    let data = NetUtil.readInputStreamToString(aStream, aCount);
	    let array = [];
	    for (let i = 0; i < data.length; ++i)
	      array[i] = data.charCodeAt(i);
	    chunks.push(unicodeConverter.convertFromByteArray(array, array.length));
	  },  
	  QueryInterface: XPCOMUtils.generateQI([Ci.nsISupports, Ci.nsIStreamListener, Ci.nsIRequestObserver])  
	};  
	channel.asyncOpen(listener, null);
}

function startup() {
	// Initialise the listener for context menus
	let messagepane = document.getElementById("messagepane");
	if (messagepane) {
		messagepane.addEventListener("contextmenu", function(e) {
			checkICSattachment(e); 
		}, false);	
	}

	// Initialise the listener for the menu click
	let addtogooglecalendarid = document.getElementById("addtogooglecalendarid");
	if (addtogooglecalendarid) {
		addtogooglecalendarid.addEventListener("click", function(e) { 
			createEventFromICS(e);
		}, false);	
	}
}
