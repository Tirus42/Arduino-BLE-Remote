// Important: Needs the "bluetooth" permission when used in a iframe

const ConnectedCharacteristics = new Map();
const PendingCharacteristicPromises = new Map();

function Log(str, addNewLine = true) {
	const element = document.getElementById('log');
	element.value += str;

	if (addNewLine) {
		element.value += '\n';
	}

	element.scrollTop = element.scrollHeight;
}

function LogClear() {
	const element = document.getElementById('log');
	element.value = '';
}

function SetModelName(modelName) {
    const element = document.getElementById('modelName');
    element.value = modelName;
}

const SERVICE_UUID = "a6a2fc07-815c-4262-97a9-1cef5181a1e4";
const LED_CHARACTERISTICS = {
    "cd7ce55d-019d-4204-ad2e-a4d1464e3840": "Warp",
    "45864431-5197-4c89-9c52-30e8ec7ac523": "Impulse",
    "e38f4a08-6b53-4826-937d-d62183f02d1b": "Deflector",
    "529d6059-5633-4868-84a5-bfdef04296dd": "Bussard",

    "1dd3cff4-ee45-452c-a8c6-d3bd3a7986b3": "Mind Stone",
    "13e55e6a-1663-4272-ac08-e12617b2c822": "Soul Stone",
    "46c628e6-4a1d-48c3-ba76-412eff75ad6f": "Reality Stone",
    "269e55e4-0daf-47a9-86cc-ea8a5c680dd5": "Space Stone",
    "492a89d2-bcb8-4a3e-9b96-31000df7a3aa": "Power Stone",
    "03c7757e-be1c-42ef-9b58-c4be71fd3a7d": "Time Stone",
};

const CHARACTERISTIC_MODEL_NAME_UUID = "928ec7e1-b867-4b7d-904b-d3b8769a7299";

function OnColorChange(element) {
    SetColorWhenPresent(element.uuid, element.value);
}

function OnSliderChange(element) {
    let uuid = element.uuid;

    // Read RGBW value
    const rgbw = [
        document.getElementById(uuid + 'R').value,
        document.getElementById(uuid + 'G').value,
        document.getElementById(uuid + 'B').value,
        document.getElementById(uuid + 'W').value
    ];

    SetColorWhenPresent(element.uuid, rgbw);
}

function ToHexColor(color) {
    return '#' + parseInt(color[0]).toString(16).padStart(2, '0')
               + parseInt(color[1]).toString(16).padStart(2, '0')
               + parseInt(color[2]).toString(16).padStart(2, '0');
}

function GUIUpdateColorValue(uuid, newColor) {
    const guiName = LED_CHARACTERISTICS[uuid];

    // Update color picker
    const colorPicker = document.getElementById(uuid + 'ColorPicker');
    colorPicker.value = ToHexColor(newColor);

    // Update sliders
    document.getElementById(uuid + 'R').value = newColor[0];
    document.getElementById(uuid + 'G').value = newColor[1];
    document.getElementById(uuid + 'B').value = newColor[2];

    if (newColor.length == 4) {
        document.getElementById(uuid + 'W').value = newColor[3];
    } else {
        document.getElementById(uuid + 'W').value = 0;
    }
}

function SetColorWhenPresent(uuid, color) {
    let rgbw = color;

    if (!Array.isArray(color)) {
        rgbw = ExtractRGB(color);
    }

    if (ConnectedCharacteristics.has(uuid)) {
        SetColor(ConnectedCharacteristics.get(uuid), rgbw);
    }

    GUIUpdateColorValue(uuid, rgbw);
}

function ExtractRGB(color) {
    const r = parseInt(color.substr(1,2), 16)
    const g = parseInt(color.substr(3,2), 16)
    const b = parseInt(color.substr(5,2), 16)
    return [r, g, b];
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
            RemoveAllControls();
            return device.gatt.connect();
      }).then(server => {
      	Log("Connected, Read Services ...");
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

function AddConnectedCharacteristic(characteristic) {
    ConnectedCharacteristics.set(characteristic.uuid, characteristic);

    if (!!LED_CHARACTERISTICS[characteristic.uuid]) {
        const uuid = characteristic.uuid;
        const name = LED_CHARACTERISTICS[characteristic.uuid];

        CreateColorSelector(characteristic.uuid, name, characteristic.uuid);

        const colorPicker = document.getElementsByName(name)[0];

        if (!!colorPicker) {
            colorPicker.uuid = characteristic.uuid;
        }

        const divElement = document.getElementById(name);
        const sliderR = document.getElementById(uuid + 'R');
        const sliderG = document.getElementById(uuid + 'G');
        const sliderB = document.getElementById(uuid + 'B');
        const sliderW = document.getElementById(uuid + 'W');

        if (!!sliderR && !!sliderG && !!sliderB && !!sliderW) {
            sliderR.uuid = characteristic.uuid;
            sliderG.uuid = characteristic.uuid;
            sliderB.uuid = characteristic.uuid;
            sliderW.uuid = characteristic.uuid;
        }
    }
    else if (characteristic.uuid == CHARACTERISTIC_MODEL_NAME_UUID) {
        characteristic.readValue().then((dataView) => {
			console.log(dataView);

			const dec = new TextDecoder("utf-8");
			const decoded = dec.decode(dataView);

			document.getElementById('modelName').value = decoded;
		})
    }
}

function SetColor(characteristic, rgbw) {
    const array = new Uint8Array(4);
    array[0] = rgbw[0];
    array[1] = rgbw[1];
    array[2] = rgbw[2];
    array[3] = rgbw[3];

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

function GetSupportedProperties(characteristic) {
	const supportedProperties = [];

	for (const p in characteristic.properties) {
		if (characteristic.properties[p] === true) {
			supportedProperties.push(p.toUpperCase());
		}
	}

	return '[' + supportedProperties.join(', ') + ']';
}

function CreateTextElement(htmlText) {
    const element = document.createElement('span');
    element.innerHTML = htmlText;
    return element;
}

function CreateBRElement() {
    return document.createElement('br');
}

function CreateRangeSlider(id, title, uuid, component, containerClass = null) {
    const element = document.createElement('input');
    element.type = 'range';
    element.min = '0';
    element.max = '255';
    element.value = '0';
    element.classList.add('slider');
    element.id = id;
    element.oninput = () => OnSliderChange(element);
    element.dataset = {'uuid': uuid, 'component': component};

    const text = CreateTextElement(title);

    const container = document.createElement('div');

    if (!!containerClass) {
        container.classList.add('slider-background');
        container.classList.add(containerClass);
    }

    container.appendChild(element);
    container.appendChild(text);

    return container;
}

function CreateColorSelector(id, name, uuid, componentsList = ['R', 'G', 'B', 'W']) {
    const div = document.createElement('div');
    div.id = id;
    div.classList.add('control-panel');

    const colorPicker = document.createElement('input');
    colorPicker.id = uuid + 'ColorPicker';
    colorPicker.type = 'color';
    colorPicker.oninput = () => OnColorChange(element);

    const colorPickerText = CreateTextElement(' ' + name);

    div.appendChild(colorPicker);
    div.appendChild(colorPickerText);
    div.appendChild(CreateBRElement());

    const pElement = document.createElement('p');

    if (componentsList.includes('R')) {
        pElement.appendChild(CreateRangeSlider(id + 'R', 'Red', uuid, 'R', 'red'));
    }

    if (componentsList.includes('G')) {
        pElement.appendChild(CreateRangeSlider(id + 'G', 'Green', uuid, 'G', 'green'));
    }

    if (componentsList.includes('B')) {
        pElement.appendChild(CreateRangeSlider(id + 'B', 'Blue', uuid, 'B', 'blue'));
    }

    if (componentsList.includes('W')) {
        pElement.appendChild(CreateRangeSlider(id + 'W', 'White', uuid, 'W', 'white'));
    }

    div.appendChild(pElement);
    document.body.appendChild(div);
}

function RemoveAllControls() {
    const elements = document.querySelectorAll('.control-panel');

    for (let  i = 0; i < elements.length; i++) {
        const parentNode = elements[i].parentNode;
        parentNode.removeChild(elements[i]);
    }
}

function Init() {
	LogClear();

	if (!navigator.bluetooth) {
		Log("Sorry, your browser does not support web bluetooth.");
	}
}

Init();
