/**
 * Compass output element.
 * Draws a compass with N/S/W/E directions and a needle with the current azimuth value.
 */
class UICompassElement extends AUIElement {
	container: HTMLDivElement;
	compassContainer: HTMLDivElement;
	compass: HTMLDivElement;
	compassNeedle: HTMLDivElement;
	compassDirN: HTMLDivElement;
	compassDirS: HTMLDivElement;
	compassDirW: HTMLDivElement;
	compassDirE: HTMLDivElement;
	compassDirText: HTMLDivElement;

	constructor(name: string, parent: UIGroupElement, azimuth: number) {
		super(UIElementType.Compass, name, parent);

		this.container = HTML.CreateDivElement();
		this.compassContainer = HTML.CreateDivElement('compass-container');
		this.compass = HTML.CreateDivElement('compass-border');
		this.compassNeedle = HTML.CreateDivElement('compass-needle');
		this.compassDirN = HTML.CreateDivElement(['compass-direction', 'compass-n']);
		this.compassDirS = HTML.CreateDivElement(['compass-direction', 'compass-s']);
		this.compassDirW = HTML.CreateDivElement(['compass-direction', 'compass-w']);
		this.compassDirE = HTML.CreateDivElement(['compass-direction', 'compass-e']);
		this.compassDirText = HTML.CreateDivElement('compass-label');

		this.compassDirN.innerText = 'N';
		this.compassDirS.innerText = 'S';
		this.compassDirW.innerText = 'W';
		this.compassDirE.innerText = 'E';

		this.compass.appendChild(this.compassDirN);
		this.compass.appendChild(this.compassDirS);
		this.compass.appendChild(this.compassDirW);
		this.compass.appendChild(this.compassDirE);

		this.compassContainer.appendChild(this.compass);
		this.compassContainer.appendChild(this.compassNeedle);
		this.compassContainer.appendChild(this.compassDirText);
		this.container.appendChild(this.compassContainer);

		this.container.style.width = '150px';
		this.container.style.height = '150px';
		this.container.style.border = '5px';

		this.setValue(azimuth);
	}

	getDomRootElement() : HTMLElement {
		return this.container;
	}

	setValue(newAzimuth: number) {
		this.compass.style.transform = `rotate(${-newAzimuth}deg)`;
		this.compassDirText.innerText = `${newAzimuth}°`;
	}

	override setPathValue(path: string[], newValue: ValueWrapper) {
		this.checkValidPath(path);

		if (newValue.type !== ValueType.Number) {
			throw 'Try to set a incompatible value type';
		}

		this.setValue(newValue.getNumberValue());
	}
}
