class BLEDeviceConnection extends UIGroupElement {
	device: BluetoothDevice;
	modelName: string | null;
	buttonDisconnect: HTMLButtonElement;
	disconnectHandler: () => void;
	connectionFailedHandler: (err: Error) => void;
	ledInfoChangeHandler: (event: Event) => void;
	ledInfoCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;
	guiControl: GUIProtocolHandler | undefined;
	connectingAnimationElement: HTMLDivElement | null;

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

		this.connectingAnimationElement = this._createConnectingAnimation();
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
		// Remove connecting animation
		this._removeConnectingAnimation();

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
				// Remove connecting animation
				this._removeConnectingAnimation();

				// Process received GUI-JSON and construct the GUI controls
				ProcessJSON(this, json);
			}

			const handleUpdateValueFunction = (path: string[], newValue: ValueWrapper) => {
				const completePath : string[] = [this.getName()].concat(path);

				this.setPathValue(completePath, newValue);
			}

			const handleFlagUpdateFunction = (path: string[], flag: UIFlagType, newState: boolean) => {
				const completePath : string[] = [this.getName()].concat(path);
				let targetElem = this.getByPath(completePath);

				if (!targetElem) {
					throw "UI element for path '" + path + "' not found";
				}

				targetElem.setFlag(flag, newState);
			}

			this.guiControl = new GUIProtocolHandler(characteristic, handleJsonFunction, handleUpdateValueFunction, handleFlagUpdateFunction);
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

	private _createConnectingAnimation() : HTMLDivElement {
		let container = HTML.CreateDivElement('ble-connect-container');

		for (let i = 0; i < 6; ++i) {
			container.appendChild(HTML.CreateDivElement('ble-connect-dot'));
		}

		container.appendChild(HTML.CreateDivElement('ble-connect-glyph'));

		this.container.appendChild(container);
		return container;
	}

	private _removeConnectingAnimation() {
		if (this.connectingAnimationElement) {
			this.getDomRootElement().removeChild(this.connectingAnimationElement);
			this.connectingAnimationElement = null;
		}
	}
}
