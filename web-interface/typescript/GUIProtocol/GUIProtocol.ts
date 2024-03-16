enum GUIClientHeader {
	RequestGUI = 0x00,
	SetValue = 0x01,
}

enum GUIServerHeader {
	GUIData = 0x00,
}

class GUIProtocolHandler {
	characteristic: BluetoothRemoteGATTCharacteristic;
	onGuiJsonCallback: (json: ADataJSON) => void;
	dataWriter: BLEDataWriter;
	onCharacteristicChanged: (event: Event) => void;
	recvPendingData : BLEDataReader | undefined;
	pendingRequestIds: Set<number>;

	constructor(characteristic: BluetoothRemoteGATTCharacteristic, onGuiJsonCallback: (json: ADataJSON) => void) {
		this.characteristic = characteristic;
		this.onGuiJsonCallback = onGuiJsonCallback;
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
		switch (data[0]) {
			case GUIServerHeader.GUIData: {
				const requestId = new DataView(data.buffer).getUint32(1, false);
				const length = new DataView(data.buffer).getUint32(5, false);

				const isOwnRequest : boolean = this.pendingRequestIds.has(requestId);

				Log("JSON data length: " + length + " bytes, is own request: " + isOwnRequest);

				const ref = this;

				this.recvPendingData = new BLEDataReader(length, data.subarray(9), function(wholeBlock: Uint8Array) {
					const jsonString = DecodeUTF8String(wholeBlock);
					const object = <ADataJSON>JSON.parse(jsonString);

					if (isOwnRequest) {
						ref.pendingRequestIds.delete(requestId);
						ref.onGuiJsonCallback(object);
					}
				});

				break;
			}

			default:
				Log("Reveived unknown data for the GUI!");
		}
	}
}
