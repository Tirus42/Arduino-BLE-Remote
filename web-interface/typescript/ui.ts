function UI_GetModelNameField() : HTMLInputElement {
    const element = <HTMLInputElement> document.getElementById('modelName');

	if (element == null) {
		Log("ModelName UI element not found!");
        throw "ModelName UI element not found!"
	}

	return element;
}

function SetModelName(modelName: string) {
    UI_GetModelNameField().innerText = modelName;
}

function UI_GetDisconnectButton() : HTMLButtonElement {
	const btn = <HTMLButtonElement> document.getElementById('btnDisconnect');

	if (!btn) {
		throw "UI element of disconnect button not found!";
	}

	return btn;
}

function CreateTextElement(htmlText: string) {
    const element = document.createElement('span');
    element.innerHTML = htmlText;
    return element;
}

function CreateBRElement() {
    return document.createElement('br');
}


function CreateRangeSlider(id: string, title: string, uuid: string, onColorChangeFunction: (uuid: string, newColor: RGBWColor) => any, containerClass: string | null = null) {
    const element = document.createElement('input');
    element.type = 'range';
    element.min = '0';
    element.max = '255';
    element.value = '0';
    element.classList.add('slider');
    element.id = id;
    element.oninput = () => {

        let newColor = UI_GetSliderRGBWValueForUUID(uuid);

        onColorChangeFunction(uuid, newColor);
    }
    element.dataset.uuid = uuid;

    const text = CreateTextElement(title);

    const container = document.createElement('div');

    if (containerClass) {
        container.classList.add('slider-background');
        container.classList.add(containerClass);
    }

    container.appendChild(element);
    container.appendChild(text);

    return container;
}

function CreateColorSelector(id: string, name: string, uuid: string, onColorChangeFunction: (uuid: string, newColor: RGBWColor) => any, componentsList = ['R', 'G', 'B', 'W']) {
    const div = document.createElement('div');
    div.id = id;
    div.classList.add('control-panel');

    const colorPicker = document.createElement('input');
    colorPicker.id = uuid + 'ColorPicker';
    colorPicker.type = 'color';
    colorPicker.oninput = (_: Event) => {
        const htmlColor = colorPicker.value;
        const rgb = ExtractRGB(htmlColor);

        onColorChangeFunction(uuid, new RGBWColor(rgb.r, rgb.g, rgb.b, 0));
    }
    colorPicker.dataset.uuid = uuid;

    const colorPickerText = CreateTextElement(' ' + name);

    div.appendChild(colorPicker);
    div.appendChild(colorPickerText);
    div.appendChild(CreateBRElement());

    const pElement = document.createElement('p');

    if (componentsList.includes('R')) {
        pElement.appendChild(CreateRangeSlider(id + 'R', 'Red', uuid, onColorChangeFunction, 'red'));
    }

    if (componentsList.includes('G')) {
        pElement.appendChild(CreateRangeSlider(id + 'G', 'Green', uuid, onColorChangeFunction, 'green'));
    }

    if (componentsList.includes('B')) {
        pElement.appendChild(CreateRangeSlider(id + 'B', 'Blue', uuid, onColorChangeFunction, 'blue'));
    }

    if (componentsList.includes('W')) {
        pElement.appendChild(CreateRangeSlider(id + 'W', 'White', uuid, onColorChangeFunction, 'white'));
    }

    div.appendChild(pElement);
    document.body.appendChild(div);
}


function RemoveAllControls() {
    const elements = document.querySelectorAll('.control-panel');

    for (let  i = 0; i < elements.length; i++) {
        const parentNode = elements[i].parentNode;

        if (parentNode != null) {
            parentNode.removeChild(elements[i]);
        }
    }

    ConnectedCharacteristics.clear();
}

function UI_GetSliderById(id: string) : HTMLInputElement {
    const elem = <HTMLInputElement> document.getElementById(id);

    if (!elem) {
        throw "HTML Slider element by id '" + id + "' not found!";
    }

    return elem;
}

function UI_GetSliderRGBWValueForUUID(uuid: string): RGBWColor {
    const rSlider = UI_GetSliderById(uuid + "R");
    const gSlider = UI_GetSliderById(uuid + "G");
    const bSlider = UI_GetSliderById(uuid + "B");
    const wSlider = UI_GetSliderById(uuid + "W");

    return new RGBWColor(parseInt(rSlider.value), parseInt(gSlider.value), parseInt(bSlider.value), parseInt(wSlider.value));
}

function UI_SetSliderRGBWValueForUUID(uuid: string, newColor: RGBWColor) {
    const rSlider = UI_GetSliderById(uuid + "R");
    const gSlider = UI_GetSliderById(uuid + "G");
    const bSlider = UI_GetSliderById(uuid + "B");
    const wSlider = UI_GetSliderById(uuid + "W");

    rSlider.value = "" + newColor.r;
    gSlider.value = "" + newColor.g;
    bSlider.value = "" + newColor.b;
    wSlider.value = "" + newColor.w;
}

function RemoveColorSelectorWhenExists(id: string) {
    const element = document.getElementById(id);

    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}
