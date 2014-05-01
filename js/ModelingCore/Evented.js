
export class Evented {
    constructor() {
        this.events = {};
    }

    on(eventName, callback) {
        if (typeof callback !== 'function')
            return;
        if (! this.events.hasOwnProperty(eventName)) {
            var e = this.events[eventName] = [];
            e.push(callback);
        }
    }

    off(eventName, callback) {
        if (this.events.hasOwnProperty(eventName)) {
            if (typeof callback === 'function')
                this.events[eventName] = _.without(this.events[eventName], callback);
            else {
                delete this.events[eventName];
            }
        }
    }

    fire(eventName, argument) {
        _.each(this.events[eventName], (cb) => setTimeout(() => cb(argument)));
    }
}
