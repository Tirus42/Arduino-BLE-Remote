class PendingDataEntry {
	groupName: string;
	data: Uint8Array;

	constructor(groupName: string, data: Uint8Array) {
		this.groupName = groupName;
		this.data = data;
	}
}

/**
 * Reliable data writer.
 * Writes data to the BLE characteristic.
 * Allows to override pending values by using the groupName.
 *
 * If the identical groupName is used multiple times then the last value is ensured
 * to be written. On changing groupName's every one will be written.'
 */
class BLEDataWriter {
	characteristic: BluetoothRemoteGATTCharacteristic;
	pendingData: PendingDataEntry[];
	failedRepeatCount: number;

	constructor(characteristic: BluetoothRemoteGATTCharacteristic) {
		this.characteristic = characteristic;
		this.pendingData = [];
		this.failedRepeatCount = 0;
	}

	sendData(groupName: string, data: Uint8Array) {
		const noOperationPending = this.pendingData.length === 0;

		const entry = new PendingDataEntry(groupName, data);

		if (this.pendingData.length > 0 && this.pendingData[0].groupName === groupName) {
			// Try to send data with the same content, replace the entry for next send operation
			this.pendingData[0].data = data;
			return;
		}

		this.pendingData.push(entry);

		if (noOperationPending) {
			this._sendData();
		}
	}

	private _sendData() {
		const obj = this;
		const sendData = this.pendingData[0].data;

		const reqSendFunction = function(characteristic: BluetoothRemoteGATTCharacteristic, data: Uint8Array) {
			characteristic.writeValue(data).then(_ => {
				if (obj.pendingData[0].data === sendData) {
					// Only remove the entry when the content was not replaced in the meantime
					obj.pendingData.shift();
				} else {
					obj._sendData();
				}

			}).catch(_ => {
				// This is a workaround for android, because most times the first request failes with a "unknown reason"
				// Also see https://github.com/LedgerHQ/ledgerjs/issues/352
				Log('BLE send operation failed, repeating ...');

				obj.failedRepeatCount++;

				if (obj.failedRepeatCount > 10) {
					Log('Aborting repeat operation due to 10 failed retries ...');
					return;
				}

				reqSendFunction(characteristic, data);
			});
		}

		reqSendFunction(this.characteristic, this.pendingData[0].data);
	}
}
