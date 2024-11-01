enum GUIClientHeader {
	RequestGUI = 0x00,
	SetValue = 0x01,
}

enum GUIServerHeader {
	GUIData = 0x00,
	UpdateValue = 0x01,
}

class GUIProtocolHandler {
	characteristic: BluetoothRemoteGATTCharacteristic;
	onGuiJsonCallback: (json: ADataJSON) => void;
	onValueUpdateCallback: (path: string[], newValue: ValueWrapper) => void;
	dataWriter: BLEDataWriter;
	onCharacteristicChanged: (event: Event) => void;
	recvPendingData : BLEDataReader | undefined;
	pendingRequestIds: Set<number>;

	constructor(characteristic: BluetoothRemoteGATTCharacteristic, onGuiJsonCallback: (json: ADataJSON) => void, onValueUpdateCallback: (path: string[], newValue: ValueWrapper) => void) {
		this.characteristic = characteristic;
		this.onGuiJsonCallback = onGuiJsonCallback;
		this.onValueUpdateCallback = onValueUpdateCallback;
		this.dataWriter = new BLEDataWriter(characteristic);
		this.onCharacteristicChanged = (event: Event) => {this._onCharacteristicChanged(event);};
		this.pendingRequestIds = new Set();

		characteristic.addEventListener('characteristicvaluechanged', this.onCharacteristicChanged);

		const startNotificationFunction = () => {
			this.characteristic.startNotifications().then(() => {
				this._requestGUI();
			})
			.catch((err) => {
				Log("Error in startNotifications(): " + err + "; Repeating ...");
				startNotificationFunction();
			});
		};

		// Explicit stop notifications here, otherwise start notifications does not work when reconnecting.
		this.characteristic.stopNotifications().then(startNotificationFunction)
			.catch(() => {Log("Error in stopNotifications()");});
	}

	setValue(absoluteName: string[], newValue: ValueWrapper) {
		const requestId = this._generateRequestId();

		const head = PacketBuilder.CreatePacketHeader(GUIClientHeader.SetValue, requestId);
		const name = PacketBuilder.CreateLengthPrefixedString(absoluteName.toString());
		const value = PacketBuilder.CreateDynamicValue(newValue);

		const packet = MergeUint8Arrays3(head, name, value);

		this.dataWriter.sendData(absoluteName.toString(), packet);
	}

	private _generateRequestId() : number {
		// TODO: Better unique request id (random number)
		const requestId = Date.now() % 0xFFFFFFFF;
		this.pendingRequestIds.add(requestId);
		return requestId;
	}

	private _requestGUI() {
		const requestId = this._generateRequestId();
		const head = PacketBuilder.CreatePacketHeader(GUIClientHeader.RequestGUI, requestId);
		this.dataWriter.sendData('RequestHeader', head);
	}

	private _onCharacteristicChanged(event: Event) {
		const value = <DataView> this.characteristic.value;
		const view = new Uint8Array(value.buffer);

		if (this.recvPendingData) {
			const completed : boolean = this.recvPendingData.appendData(view);

			if (completed) {
				this.recvPendingData = undefined;
			}

			return;
		}

		this._handlePacketBegin(view);
	}

	private _handlePacketBegin(data: Uint8Array) {
		const content = new DataView(data.buffer.slice(1));

		switch (data[0]) {
			case GUIServerHeader.GUIData: {
				this._handlePacket_GUIData(content)
				break;
			}
			case GUIServerHeader.UpdateValue: {
				this._handlePacket_UpdateValue(content);
				break;
			}
			default:
				Log("Reveived unknown data for the GUI!, packet id: " + data[0]);
		}
	}

	private _handlePacket_GUIData(content: DataView) {
		const reader : NetworkBufferReader = new NetworkBufferReader(content);

		const requestId = reader.extractUint32();
		const length = reader.extractUint32();

		const isOwnRequest : boolean = this.pendingRequestIds.has(requestId);

		Log("JSON data length: " + length + " bytes, is own request: " + isOwnRequest);

		const ref = this;

		const remainingContent = new Uint8Array(reader.extractRemainingData().buffer);

		this.recvPendingData = new BLEDataReader(length, remainingContent, function(wholeBlock: Uint8Array) {
			const jsonString = DecodeUTF8String(wholeBlock);
			const object = <ADataJSON>JSON.parse(jsonString);

			if (isOwnRequest) {
				ref.pendingRequestIds.delete(requestId);
				ref.onGuiJsonCallback(object);
			}
		});
	}

	private _handlePacket_UpdateValue(content: DataView) {
		const reader : NetworkBufferReader = new NetworkBufferReader(content);

		const requestId = reader.extractUint32();
		const length = reader.extractUint32();

		const isOwnRequest : boolean = this.pendingRequestIds.has(requestId);

		if (isOwnRequest) {
			// We don't need to handle our own value updates, ignore them
			return;
		}

		// Value update by another instance (or remote itself)
		const key = reader.extractString();
		const value : ValueWrapper = this._readDataValue(reader);

		try {
			this.onValueUpdateCallback(key.split(','), value);
		} catch (err) {
			Log("Error during UpdateValue packet: " + err);
		}
	}

	private _readDataValue(reader : NetworkBufferReader) : ValueWrapper {
		const valueType = reader.extractUint8();

		switch (valueType) {
			case ValueType.Number: {
				const numberValue : number = reader.extractInt32();
				return new ValueWrapper(numberValue);
			}
			case ValueType.Boolean: {
				const boolValue : boolean = reader.extractUint8() > 0;
				return new ValueWrapper(boolValue);
			}
			case ValueType.RGBWColor: {
				const packedValue : number = reader.extractUint32();
				const rgbwValue : RGBWColor = ExtractPackedRGBW(packedValue);
				return new ValueWrapper(rgbwValue);
			}
			default: {
				throw "Received unhandled data type " + valueType + " via UpdateValue packet.";
			}
		}
	}
}
