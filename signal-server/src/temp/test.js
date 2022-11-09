const { time } = require('console');

class EventQueue {
	queue = [];
	messageListeners = [];
	running = false;

	FireMessage(message) {
		const request = new MessageEvent(message, this.messageListeners);
		this.queue.push(request);
	}

	//start the event queue
	Start() {
		this.running = true;
		this.runLoop();
	}

	//run the event loop async
	async runLoop() {
		while (this.running && this.queue.length > 0) {
			const curr = this.queue.shift();
			await curr.broadcast();
		}
	}
	RegisterMessageListener(component) {
		this.messageListeners.push(component);
	}
}

class MessageEvent {
	payload;
	listeners = [];

	constructor(p, l) {
		this.payload = p;
		this.listeners = l;
	}

	broadcast() {
		for (let lis in this.listeners) {
			let curr = this.listeners[lis];
			curr.HandleMessage(this.payload);
		}
	}
}

class ComponentA {
	//component implements HandleMessage declared in the broadcast method for Message Event
	HandleMessage(message) {
		//do someting with message here
		console.log(message + ' received by componentA');
	}
}

class ComponentB {
	HandleMessage(message) {
		//do something with message here
		console.log(message + ' received by componentB');
	}
}

class ComponentC {
	eventQ;
	//requires eventQueue access to use FireMessage()
	constructor(e) {
		this.eventQ = e;
	}
	//sends a message event using EventQ's method FireMessage
	sendMessage(m) {
		this.eventQ.FireMessage(m);
	}
}
let A = new ComponentA();
let B = new ComponentB();

//init the eventQueue
let eventQ = new EventQueue();

//this component will fire events so it needs access to the eventQueue
let C = new ComponentC(eventQ);

//Registering components to listen for Message events
eventQ.RegisterMessageListener(A);

//sending a message
C.sendMessage('hello world');
eventQ.Start();
//starting the event loop

eventQ.RegisterMessageListener(B);
//sending a message to make sure loop isn't blocking

eventQ.Start();
