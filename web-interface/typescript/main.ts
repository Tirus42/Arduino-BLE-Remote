// Important: Needs the "bluetooth" permission when used in a iframe

function OnConnected(device: BluetoothDevice) {
    UI_GetDisconnectButton().disabled = false;

    ConnectedDevice = device;
}

function OnDisconnected() {
    UI_GetDisconnectButton().disabled = true;

    ConnectedDevice = null;

    Log("Disconnected");
    RemoveAllControls();
}

function Disconnect() {
    if (!ConnectedDevice || !ConnectedDevice.gatt) {
        return;
    }

    Log("Disconnecting from '" + ConnectedDevice.name + "' ...");
    ConnectedDevice.gatt.disconnect();
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
            Log("Connected to device '" + device.name + "'");

            device.addEventListener('gattserverdisconnected', OnDisconnected);

            OnConnected(device)
            RemoveAllControls();

            if (!device.gatt) {
                Log("Connected, but not GATT on device available!");
                throw "Connected, but not GATT on device available!";
            }

            return device.gatt.connect();
        }).then(server => {
            Log("Getting Services ...");
            return server.getPrimaryServices();
        }).then(services => {
            Log("Gettings Characteristics ...");
            let queue = Promise.resolve();
            services.forEach(service => {
                queue = queue.then(_ => service.getCharacteristics().then(characteristics => {
                    Log('> Service: ' + service.uuid);
                    characteristics.forEach(characteristic => {
                    Log('>> Characteristic: ' + characteristic.uuid + ' ' +
                    GetSupportedProperties(characteristic));

                    AddConnectedCharacteristic(characteristic);
                });
            }));
        });
        return queue;
      })
    }
    catch (ex) {
        Log('Error: ' + ex);
    }
}

function AddConnectedCharacteristic(characteristic: BluetoothRemoteGATTCharacteristic) {
    ConnectedCharacteristics.set(characteristic.uuid, characteristic);

	const knownName = LED_CHARACTERISTICS.get(characteristic.uuid);

    if (knownName) {
        const uuid = characteristic.uuid;
        const name = LED_CHARACTERISTICS.get(characteristic.uuid);

        CreateColorSelector(characteristic.uuid, knownName, characteristic.uuid, OnColorChange, new ColorChannels());
    }
    else if (characteristic.uuid == CHARACTERISTIC_MODEL_NAME_UUID) {
        characteristic.readValue().then((dataView) => {
			const dec = new TextDecoder("utf-8");
			const decoded = dec.decode(dataView);

			SetModelName(decoded);
		})
    }
    else if (characteristic.uuid == CHARACTERISTIC_LEDINFO_UUID) {
        characteristic.startNotifications().then(_ => {
            function handleFunc(event: Event) {
				if (!event.target) {
					Log("Notification event without a target");
					return;
				}

				if (event.target.hasOwnProperty('value')) {
					Log("Notification event without a value");
					return;
				}

                const value = <DataView> characteristic.value;
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

                    RemoveColorSelectorWhenExists(uuid);
                    CreateColorSelector(uuid, name, uuid, OnColorChange, colors);
                }
            }

            characteristic.addEventListener('characteristicvaluechanged', handleFunc);
        });

        SendBLERequest(characteristic, "list").then(_ => {
        }, _ => {
            Log("Info query failure?: " + _);
            Log("Try again ...");
            // This is a workaround for android, because most times the first request failes with a "unknown reason"
            // Also see https://github.com/LedgerHQ/ledgerjs/issues/352
            SendBLERequest(characteristic, "list");
        });
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
    const header = new Uint8Array(1);
    header[0] = 0x00;

    const request = MergeUint8Arrays(header, EncodeUTF8String(cmd));
    return characteristic.writeValue(request);
}

function OnSliderChange(element: HTMLElement) {
    let uuid = element.dataset.uuid;

	if (uuid == null) {
		throw "UUID on DOM Element not found!";
	}

    // Read RGBW value
    const rgbw = UI_GetSliderRGBWValueForUUID(uuid);

    SetColorWhenPresent(uuid, rgbw);
}

function OnColorChange(uuid: string, newColor: RGBWColor) {
    SetColorWhenPresent(uuid, newColor);
}

function SetColorWhenPresent(uuid: string, rgbw: RGBWColor) {
    if (ConnectedCharacteristics.has(uuid)) {
        SetColor(ConnectedCharacteristics.get(uuid), rgbw);
    } else {
        Log("Try to set value for uuid '" + uuid + "', but not found");
    }

    GUIUpdateColorValue(uuid, rgbw);
}

function GUIUpdateColorValue(uuid: string, newColor: RGBWColor) {
    const guiName = LED_CHARACTERISTICS.get(uuid);

    // Update color picker
    const colorPicker = <HTMLInputElement> document.getElementById(uuid + 'ColorPicker');

	if (colorPicker) {
		colorPicker.value = newColor.toHexColor();
	}

    // Update sliders
    UI_SetSliderRGBWValueForUUID(uuid, newColor);
}

function Init() {
	LogClear();

	if (!navigator.bluetooth) {
		Log("Sorry, your browser does not support web bluetooth.");
	}
}

Init();
