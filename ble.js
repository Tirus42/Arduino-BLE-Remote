// Important: Needs the "bluetooth" permission when used in a iframe

let ConnectedCharacteristics = new Map();

let PendingCharacteristicPromises = new Map();

function Log(str, addNewLine = true) {
	let element = document.getElementById('log');
	element.value += str;

	if (addNewLine) {
		element.value += '\n';
	}

	element.scrollTop = element.scrollHeight;
}

function SetModelName(modelName) {
    let element = document.getElementById('modelName');
    element.value = modelName;

}

const SERVICE_UUID = "a6a2fc07-815c-4262-97a9-1cef5181a1e4";
const LED_CHARACTERISTICS = {
    "cd7ce55d-019d-4204-ad2e-a4d1464e3840": "Warp",
    "45864431-5197-4c89-9c52-30e8ec7ac523": "Impulse",
    "e38f4a08-6b53-4826-937d-d62183f02d1b": "Deflector",
    "529d6059-5633-4868-84a5-bfdef04296dd": "Bussard"
};

const CHARACTERISTIC_MODEL_NAME_UUID = "928ec7e1-b867-4b7d-904b-d3b8769a7299";

function OnColorChange(element) {
    SetColorWhenPresent(element.uuid, element.value);
}

function OnSliderChange(element) {
    let name = element.name;
    let inputName = name.substr(0, name.length - 1);

    // Read RGBW value
    let rgbw = [
        document.getElementsByName(inputName + 'R')[0].value,
        document.getElementsByName(inputName + 'G')[0].value,
        document.getElementsByName(inputName + 'B')[0].value,
        document.getElementsByName(inputName + 'W')[0].value
    ];

    SetColorWhenPresent(element.uuid, rgbw);
}

function ToHexColor(color) {
    return '#' + parseInt(color[0]).toString(16).padStart(2, '0')
               + parseInt(color[1]).toString(16).padStart(2, '0')
               + parseInt(color[2]).toString(16).padStart(2, '0');
}

function GUIUpdateColorValue(uuid, newColor) {
    let guiName = LED_CHARACTERISTICS[uuid];

    // Update color picker
    let colorPicker = document.getElementsByName(guiName)[0];
    colorPicker.value = ToHexColor(newColor);

    // Update sliders
    document.getElementsByName(guiName + 'R')[0].value = newColor[0];
    document.getElementsByName(guiName + 'G')[0].value = newColor[1];
    document.getElementsByName(guiName + 'B')[0].value = newColor[2];

    if (newColor.length == 4) {
        document.getElementsByName(guiName + 'W')[0].value = newColor[3];
    } else {
        document.getElementsByName(guiName + 'W')[0].value = 0;
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
                  getSupportedProperties(characteristic));

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
        let name = LED_CHARACTERISTICS[characteristic.uuid];
        let colorPicker = document.getElementsByName(name)[0];

        if (!!colorPicker) {
            colorPicker.uuid = characteristic.uuid;
            colorPicker.disabled = false;
        }

        let sliderR = document.getElementsByName(name + 'R')[0];
        let sliderG = document.getElementsByName(name + 'G')[0];
        let sliderB = document.getElementsByName(name + 'B')[0];
        let sliderW = document.getElementsByName(name + 'W')[0];

        if (!!sliderR && !!sliderG && !!sliderB && !!sliderW) {
            sliderR.uuid = characteristic.uuid;
            sliderG.uuid = characteristic.uuid;
            sliderB.uuid = characteristic.uuid;
            sliderW.uuid = characteristic.uuid;
            sliderR.disabled = false;
            sliderG.disabled = false;
            sliderB.disabled = false;
            sliderW.disabled = false;
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
    let array = new Uint8Array(4);
    array[0] = rgbw[0];
    array[1] = rgbw[1];
    array[2] = rgbw[2];
    array[3] = rgbw[3];

    let uuid = characteristic.uuid;

    let updatePending = PendingCharacteristicPromises.has(uuid);

    // Set or replace pending value
    PendingCharacteristicPromises.set(uuid, rgbw);

    if (!updatePending) {
		characteristic.writeValue(array).then(() => {
			let currentSetValue = rgbw;
			let targetValue = PendingCharacteristicPromises.get(uuid);

			PendingCharacteristicPromises.delete(uuid);

			if (targetValue != currentSetValue) {
				// User has set a different value in the mean time, need to send again
				SetColor(characteristic, targetValue);
			}
		});
    }
}

function getSupportedProperties(characteristic) {
  let supportedProperties = [];
  for (const p in characteristic.properties) {
    if (characteristic.properties[p] === true) {
      supportedProperties.push(p.toUpperCase());
    }
  }
  return '[' + supportedProperties.join(', ') + ']';
}

