// Important: Needs the "bluetooth" permission when used in a iframe

function Scan() {
	Log("Starting scan ...");

	try {
		navigator.bluetooth.requestDevice({
			//acceptAllDevices: true,
			filters: GetBLEServiceFilter()
		}).then(device => {
			if (IsDeviceAlreadyConnected(device)) {
				Log("Device is already connected, ignoring request.");
				return;
			}

			Log("Selected device '" + device.name + "', connecting ...");

			new BLEDeviceConnection(device, document.body);
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

function ToggleSettingsMenu() {
	const overlay = document.getElementById('settings-overlay');

	if (overlay) {
		overlay.style.display = overlay.style.display === 'flex' ? 'none' : 'flex';
	}
}

function HandleSettingsOverlayClick(event: MouseEvent) {
	const target = event.target as HTMLElement;
	const content = document.querySelector('.overlay-content') as HTMLDivElement;

	if (!content.contains(target)) {
		ToggleSettingsMenu();
	}
}

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
		group2.addTextField("Text input", "Example", 30);
		group2.addCompass('Compass2', 45);
	}

	if ('serviceWorker' in navigator) {
		console.log('Registering service worker');

		navigator.serviceWorker.register('serviceworker.js').then((reg) => {
			reg.update();
		});

		// Force enable for the service worker
		navigator.serviceWorker.ready.then(() => {
			console.log('Service Worker ready.');
		});

		// Add event listener to forced page reload
		navigator.serviceWorker.addEventListener('message', (event) => {
			console.log(event);
			if (event.data === 'reload') {
				ReloadPage();
			}
		})
	}
}

Init();
