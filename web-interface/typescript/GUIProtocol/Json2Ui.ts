interface ADataJSON {
	type: string;
	name: string;
}

interface RootDataJSON extends ADataJSON {
	elements : ADataJSON[];
}

interface GroupDataJSON extends ADataJSON {
	elements : ADataJSON[];
	collapsed : undefined | boolean;
}

interface NumberValueJSON extends ADataJSON {
	value: number;
}

interface RangeDataJSON extends NumberValueJSON {
	min: number;
	max: number;
}

interface CheckboxJSON extends NumberValueJSON {}

interface RadioDataJSON extends NumberValueJSON {
	items: string[];
}

interface DropDownJSON extends NumberValueJSON {
	items: string[];
}

interface NumberFieldJSON extends NumberValueJSON {
	readOnly: boolean;
}

interface TextFieldJSON extends ADataJSON {
	value: string;
	maxLength: number;
}

interface RGBWRangeFieldJSON extends ADataJSON {
	value: number;
	channel: string;
}

interface CompassFieldJSON extends NumberValueJSON {}

function ProcessJSON(currentRoot: UIGroupElement, jsonNode: ADataJSON) {
	const jType = jsonNode.type.toLowerCase();
	const jName = jsonNode.name;

	switch (jType) {
		case 'root': {
			const rootNode = <RootDataJSON>(jsonNode);
			// Note: Name is ignored here

			rootNode.elements.forEach(entry => {
				ProcessJSON(currentRoot, entry);
			});

			break;
		}

		case 'group': {
			const groupNode = <GroupDataJSON>(jsonNode);

			const elem = currentRoot.addGroup(jName);

			if (groupNode.collapsed !== undefined) {
				elem.setCollapsable(true);
				elem.setCollapsed(groupNode.collapsed);
			}

			for (let i = 0; i < groupNode.elements.length; ++i) {
				const entry = groupNode.elements[i];

				ProcessJSON(elem, entry);
			}
			break;
		}

		case 'range': {
			const rangeNode = <RangeDataJSON>(jsonNode);

			const jMin = rangeNode.min;
			const jMax = rangeNode.max;
			const jValue = rangeNode.value;

			currentRoot.addRange(jName, jMin, jMax, jValue);
			break;
		}

		case 'checkbox': {
			const checkboxNode = <CheckboxJSON>(jsonNode);
			const jValue = checkboxNode.value == 1 ? true : false;

			currentRoot.addCheckBox(jName, jValue);
			break;
		}

		case 'radio': {
			const radioNode = <RadioDataJSON>(jsonNode);
			const entries = radioNode.items;
			const jValue = radioNode.value;

			currentRoot.addRadioGroup(jName, entries, jValue);
			break;
		}

		case 'dropdown': {
			const dropDownNode = <DropDownJSON>(jsonNode);
			const entries = dropDownNode.items;
			const jValue = dropDownNode.value;

			currentRoot.addDropDown(jName, entries, jValue);
			break;
		}

		case 'button': {
			currentRoot.addButton(jName);
			break;
		}

		case 'numberfield_int32': {
			const numberFieldNode = <NumberFieldJSON>(jsonNode);
			const jValue = numberFieldNode.value;
			const jReadOnly = numberFieldNode.readOnly;

			currentRoot.addNumberFieldInt32(jName, jValue).setReadOnly(jReadOnly);
			break;
		}

		case 'textfield': {
			const textFieldNode = <TextFieldJSON>(jsonNode);
			const jValue = textFieldNode.value;
			const jMaxLength = textFieldNode.maxLength;

			currentRoot.addTextField(jName, jValue, jMaxLength);
			break;
		}

		case 'password': {
			const textFieldNode = <TextFieldJSON>(jsonNode);
			const jValue = textFieldNode.value;
			const jMaxLength = textFieldNode.maxLength;

			currentRoot.addPasswordField(jName, jValue, jMaxLength);
			break;
		}

		case 'rgbwrange': {
			const rgbwFieldNode = <RGBWRangeFieldJSON>(jsonNode);
			const jValue = rgbwFieldNode.value;
			const channel = rgbwFieldNode.channel;

			const colorChannels = ExtractColorChannels(channel);
			const initialColor = ExtractPackedRGBW(jValue);

			const elem = currentRoot.addRGBWColorPicker(jName, colorChannels);
			elem.setValue(initialColor);

			break;
		}

		case 'compass': {
			const compassNode = <CompassFieldJSON>(jsonNode);
			const azimuth = compassNode.value;

			currentRoot.addCompass(jName, azimuth);
			break;
		}

		default:
			Log("Unhandled JSON element type: '" + jType + "'");
			break;
	}
}
