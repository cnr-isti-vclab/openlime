

function addSignals(proto, ...signals) {

    
     proto.prototype.signals = Object.fromEntries(signals.map( s => [s, []]));
     
	/**
	  * Adds a Layer Event
	  * @param {string} event A label to identify the event.
	  * @param {*} callback The event callback function.
	*/
	proto.prototype.addEvent = function(event, callback) {
		this.signals[event].push(callback);
	}

	/*
	  * Emits an event (running all the callbacks referred to it).
	  * @param {*} event The event name
	  */
	/** @ignore */
	proto.prototype.emit = function(event, ...parameters) {
		for (let r of this.signals[event])
			r(...parameters);
	}
}

export { addSignals }