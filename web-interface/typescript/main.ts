// Important: Needs the "bluetooth" permission when used in a iframe

enum ControlMappingType {
	 UUID
}

interface ControlMapping {
	 type: ControlMappingType
}

class DeviceConnection extends UIGroupElement {
	device: BluetoothDevice;
	modelName: string | null;
	buttonDisconnect: HTMLButtonElement;
	disconnectHandler: () => void;
	connectionFailedHandler: (err: Error) => void;
	ledInfoChangeHandler: (event: Event) => void;
	ledInfoCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;
	guiControl: GUIProtocolHandler | undefined;

	classicCharacteristicMapping: Map<string, BluetoothRemoteGATTCharacteristic>;

	constructor(device: BluetoothDevice, rootDiv: HTMLElement) {
		super(device.name ? device.name : device.id, null);

		this.device = device;
		this.modelName = null;

		this.classicCharacteristicMapping = new Map();
		this.buttonDisconnect = HTML.CreateButtonElement('Disconnect');
		this.disconnectHandler = () => {this.disconnect();};
		this.connectionFailedHandler = (err) => {this._connectionFailed(err);}
		this.ledInfoChangeHandler = (event: Event) => {this._handleLedInfoEvent(event);};

		this.addToGroupHeader(this.buttonDisconnect);

		this._connect();

		ConnectedDevices.add(device);

		this.buttonDisconnect.onclick = () => {
			if (this.device.gatt && this.device.gatt.connected) {
					this.device.gatt.disconnect();
			} else {
					Log("Was not connected properly ... cleaning up");
					this.destroy();
			}
		}
	}

	override destroy() {
		this.device.removeEventListener('gattserverdisconnected', this.disconnectHandler);

		if (this.ledInfoCharacteristic) {
			this.ledInfoCharacteristic.removeEventListener('characteristicvaluechanged', this.ledInfoChangeHandler);
		}

		if (this.device.gatt && this.device.gatt.connected) {
			this.device.gatt.disconnect();
		}

		//this.device.forget(); // Not supported on Android

		ConnectedDevices.delete(this.device);

		// Remove HTML Elements
		super.destroy();
	}

	disconnect() {
		try {
			this.destroy();
		}
		catch (err) {
			Log(String(err));
		}

		Log("Disconnected from " + this.getName());
	 }

	private _connect() {
		if (!this.device.gatt) {
			Log("Connected, but not GATT on device available!");
			throw "Connected, but not GATT on device available!";
		}

		this.device.gatt.connect().then(server => {
			Log("Getting Services ...");
			return server.getPrimaryServices();
		}).then(services => {
			Log("Gettings Characteristics ...");
			let queue = Promise.resolve();
			services.forEach(service => {
				queue = queue.then(_ => service.getCharacteristics().then(characteristics => {
					Log('> Service: ' + service.uuid);
					characteristics.forEach(characteristic => {
						this.onNewCharacteristic(characteristic);

						Log('>> Characteristic: ' + characteristic.uuid + ' ' + GetSupportedProperties(characteristic));
					});
				}));
			});
		}).catch(this.connectionFailedHandler);

		this.device.addEventListener('gattserverdisconnected', this.disconnectHandler);
	}

	private _connectionFailed(err: Error) {
		Log("Connection failed with error: " + err.message);
		this.disconnect();
	}

	private _addRGBWCharacteristicElement(name: string, characteristic: BluetoothRemoteGATTCharacteristic, colorChannels: ColorChannels) {
		const controlElement = this.addRGBWColorPicker(name, colorChannels);
		const absoluteName = controlElement.getAbsoluteName();

		this.classicCharacteristicMapping.set(absoluteName.toString(), characteristic);
	}

	private _removeRGBWCharacteristicElementWhenExists(name: string, characteristic: BluetoothRemoteGATTCharacteristic) : boolean {
		return this.removeChildByName(name);
	}

	override onInputValueChange(sourceElement: AUIElement, newValue: ValueWrapper) {
		const sourceAbsoluteName = sourceElement.getAbsoluteName();

		if (this._handleClassicCharacteristicMapping(sourceAbsoluteName, sourceElement, newValue))
			return;

		if (this.guiControl) {
			const remoteName = sourceAbsoluteName.slice(1);
			this.guiControl.setValue(remoteName, newValue);
			return;
		}

		Log("Unhandled input event from element: " + sourceAbsoluteName);
	}

	private _handleClassicCharacteristicMapping(absoluteName: string[], sourceElement: AUIElement, newValue: ValueWrapper) : boolean {
		const entry = this.classicCharacteristicMapping.get(absoluteName.toString());

		if (!entry)
			return false;

		if (sourceElement.type !== UIElementType.ColorSelector)
			throw 'Input event from classic characteristic mapping, but source is not a color selector!';

		if (newValue.type !== ValueType.RGBWColor)
			throw 'Input value is not a color value!';

		SetColor(entry, newValue.getRGBWValue());

		return true;
	}

	onNewCharacteristic(characteristic: BluetoothRemoteGATTCharacteristic) {
		if (this._handleKnownNameCharacteristic(characteristic))
			return;

		if (characteristic.uuid == CHARACTERISTIC_MODEL_NAME_UUID) {
			characteristic.readValue().then((data) => {
				const name = DecodeUTF8String(data);
				this.modelName = name;

				// TODO: Do something with the model name?
			});
		}
		else if (characteristic.uuid == CHARACTERISTIC_LEDINFO_UUID) {
			this.ledInfoCharacteristic = characteristic;

			this._handleLedInfoCharacteristic(characteristic);
		}
		else if (characteristic.uuid == CHARACTERISTIC_GUI_UUID) {
			const handleJsonFunction = (json: ADataJSON) => {
				ProcessJSON(this, json);
			}

			const handleUpdateValueFunction = (path: string[], newValue: ValueWrapper) => {
				const completePath : string[] = [this.getName()].concat(path);

				this.setPathValue(completePath, newValue);
			}

			this.guiControl = new GUIProtocolHandler(characteristic, handleJsonFunction, handleUpdateValueFunction);
		}
	}

	private _handleLedInfoCharacteristic(characteristic: BluetoothRemoteGATTCharacteristic) {
		characteristic.addEventListener('characteristicvaluechanged', this.ledInfoChangeHandler);

		const reqSendFunction = function(characteristic: BluetoothRemoteGATTCharacteristic, cmd: string) {
			SendBLERequest(characteristic, cmd).catch(_ => {
				// This is a workaround for android, because most times the first request failes with a "unknown reason"
				// Also see https://github.com/LedgerHQ/ledgerjs/issues/352
				Log('Request ' + cmd + ' failed, repeating ...');
				reqSendFunction(characteristic, cmd);
			});
		}

		const startNotificationFunction = () => {
			characteristic.startNotifications().then(() => {
				reqSendFunction(characteristic, 'list');
			})
			.catch((err) => {
				Log("Error in startNotifications(): " + err + "; Repeating ...");
				startNotificationFunction();
			});
		};

		// Explicit stop notifications here, otherwise start notifications does not work when reconnecting.
		characteristic.stopNotifications().then(startNotificationFunction)
			.catch(() => {Log("Error in stopNotifications()");});
	}

	private _handleLedInfoEvent(event: Event) {
		if (!event.target) {
			Log("Notification event without a target");
			return;
		}

		if (event.target.hasOwnProperty('value')) {
			Log("Notification event without a value");
			return;
		}

		if (!this.ledInfoCharacteristic) {
			throw "Something bad happend";
		}

		const value = <DataView> this.ledInfoCharacteristic.value;
		const view = new Uint8Array(value.buffer);

		if (view[0] == 0x01) {
			const rest = value.buffer.slice(1);

			const dec = new TextDecoder("utf-8");
			const decoded = dec.decode(rest);

			const params = decoded.split(':');

			const uuid = params[0];
			const name = params[1];
			const colorChannels = params[2];

			Log("Custom UUID [" + uuid + "] with color channels: " + colorChannels);

			const colors: ColorChannels = ExtractColorChannels(colorChannels);

			this.ledInfoCharacteristic.service.getCharacteristic(uuid).then(c => {
				this._removeRGBWCharacteristicElementWhenExists(name, c);
				this._addRGBWCharacteristicElement(name, c, colors);
			});
		}
	}

	private _handleKnownNameCharacteristic(characteristic: BluetoothRemoteGATTCharacteristic) : boolean {
		const knownName = LED_CHARACTERISTICS.get(characteristic.uuid);

		if (!knownName)
			return false;

		const uuid = characteristic.uuid;
		const name = LED_CHARACTERISTICS.get(characteristic.uuid);

		if (name == null)
			throw 'Lookup failure';

		this._addRGBWCharacteristicElement(name, characteristic, new ColorChannels());
		return true;
	}
}

function IsDeviceAlreadyConnected(device: BluetoothDevice) : boolean {
	return ConnectedDevices.has(device);
}

function Scan() {
	Log("Starting scan ...");

	try {
		navigator.bluetooth.requestDevice({
			//acceptAllDevices: true,
			filters: [{
				services: [SERVICE_UUID]
			}]
		}).then(device => {
			if (IsDeviceAlreadyConnected(device)) {
				Log("Device is already connected, ignoring request.");
				return;
			}

			Log("Selected device '" + device.name + "', connecting ...");

			new DeviceConnection(device, document.body);
		});
	}
	catch (ex) {
		Log('Error: ' + ex);
	}
}

function SetColor(characteristic: BluetoothRemoteGATTCharacteristic, rgbw: RGBWColor) {
	const array = rgbw.toUint8Array();

	const uuid = characteristic.uuid;
	const updatePending = PendingCharacteristicPromises.has(uuid);

	// Set or replace pending value
	PendingCharacteristicPromises.set(uuid, rgbw);

	if (!updatePending) {
	characteristic.writeValue(array).then(() => {
		const currentSetValue = rgbw;
		const targetValue = PendingCharacteristicPromises.get(uuid);

		PendingCharacteristicPromises.delete(uuid);

		if (targetValue != currentSetValue) {
			// User has set a different value in the mean time, need to send again
			SetColor(characteristic, targetValue);
		}
	});
	}
}

function GetSupportedProperties(characteristic: BluetoothRemoteGATTCharacteristic): String {
	const supportedProperties: string[] = [];

	for (const p in characteristic.properties) {
		if (characteristic.properties[p as keyof BluetoothCharacteristicProperties] === true) {
			supportedProperties.push(p.toUpperCase());
		}
	}

	return '[' + supportedProperties.join(', ') + ']';
}

function SendBLERequest(characteristic: BluetoothRemoteGATTCharacteristic, cmd: string) {
	Log("Sending request '" + cmd + "'");
	const header = new Uint8Array(1);
	header[0] = 0x00;

	const request = MergeUint8Arrays(header, EncodeUTF8String(cmd));
	return characteristic.writeValue(request);
}

// Set global error handler to debug limited devices (...)
window.onerror =  (event: string | Event) => {
	if (event instanceof ErrorEvent) {
		Log(event.message);
		return;
	}
	else if (event instanceof String) {
		Log("" + event);
	}
};

function Init() {
	LogClear();

	if (!navigator.bluetooth) {
		Log("Sorry, your browser does not support web bluetooth.");
	}

	const params = new URLSearchParams(window.location.search);
	const showTestElements = params.get('test');

	if (showTestElements == 'true') {
		Log("==> Adding test GUI elements <==");

		const rootGroup = new UIGroupElement('Test group', null);
		rootGroup.addToGroupHeader(HTML.CreateButtonElement('Test button without a function'));
		rootGroup.addRGBWColorPicker('Test color selection', new ColorChannels());

		const nestedGroup = rootGroup.addGroup('Sub Group');
		nestedGroup.addRGBWColorPicker('Sub color picker with only the white channel', new ColorChannels(false, false, false, true));
		nestedGroup.addRadioGroup('Radio select test', ['Entry 1', 'Entry 2', 'Entry 3'], 1);
		nestedGroup.addDropDown('Drop down test', ['Entry 1', 'Entry 2', 'Entry 3'], 1);

		const group2 = rootGroup.addGroup("Sub Group 2");
		group2.addCheckBox('CheckBox 1', false);
		group2.addCheckBox('CheckBox 2', true);
		group2.addRange('Range [0, 255]', 0, 255, 0).setValue(10);
		group2.addRange('Range [-1, 1]', -1, 1, 0);
		group2.addButton('Test button');
		group2.addNumberFieldInt32('Number field 1', 42);
		group2.addNumberFieldInt32('Number field 2', 42).setReadOnly(true);
	}
}

Init();
