#include "BLELedController.h"

#pragma GCC diagnostic ignored "-Wreorder"
#include <ArduinoBLE.h>

static BLELedController* instance = nullptr;

static const std::map<std::string, UUID> WELL_KNOWN_LED_CHARACTERISTICS = {
	// Star Trek ship lights
	{"Warp", "cd7ce55d-019d-4204-ad2e-a4d1464e3840"},
	{"Bussard", "529d6059-5633-4868-84a5-bfdef04296dd"},
	{"Deflector", "e38f4a08-6b53-4826-937d-d62183f02d1b"},
	{"Impulse", "45864431-5197-4c89-9c52-30e8ec7ac523"},

	// Infinity stones
	{"Mind Stone", "1dd3cff4-ee45-452c-a8c6-d3bd3a7986b3"},
	{"Soul Stone", "13e55e6a-1663-4272-ac08-e12617b2c822"},
	{"Reality Stone", "46c628e6-4a1d-48c3-ba76-412eff75ad6f"},
	{"Space Stone", "269e55e4-0daf-47a9-86cc-ea8a5c680dd5"},
	{"Power Stone", "492a89d2-bcb8-4a3e-9b96-31000df7a3aa"},
	{"Time Stone", "03c7757e-be1c-42ef-9b58-c4be71fd3a7d"},
};

BLEService bleService{"a6a2fc07-815c-4262-97a9-1cef5181a1e4"};
BLECharacteristic modelNameCharacteristic {"928ec7e1-b867-4b7d-904b-d3b8769a7299", BLERead, 128};
BLECharacteristic ledInfoCharacteristic("013201e4-0873-4377-8bff-9a2389af3883", BLEWrite | BLENotify, 128);

static std::string DEVICE_NAME = "";

struct BLELedController::LedMappingData {
	std::function<void(RGBW newColor)> callback;
	std::string name;
	std::shared_ptr<std::string> uuidString;
	BLECharacteristic characteristic;

	LedMappingData(UUID uuid, std::function<void(RGBW newColor)> callback, std::string name) :
		callback(callback),
		name(name),
		uuidString(std::make_shared<std::string>(uuid.toString().c_str())),
		characteristic(uuidString->c_str(), BLEWrite, 4) {}
};

BLELedController::BLELedController(const char* deviceName, const char* modelName) :
	onConnectCallback(),
	onDisconnectCallback(),
	uuidToCharacteristicMap() {

	// Set global instance
	instance = this;

	if (!modelName) {
		modelName = deviceName;
	}

	DEVICE_NAME = deviceName;

	modelNameCharacteristic.setValue(modelName);

	BLE.begin();
	BLE.setLocalName(deviceName);

	BLE.setEventHandler(BLEConnected, OnConnect);
	BLE.setEventHandler(BLEDisconnected, OnDisconnect);
}

BLELedController::~BLELedController() {
	// Remove characteristics from global service instance.
	bleService.clear();

	BLE.end();

	// Unset global instance
	instance = nullptr;
}

void BLELedController::begin() {
	for (auto iter : uuidToCharacteristicMap) {
		iter.second.characteristic.setEventHandler(BLEWritten, &OnCharacteristicWritten);

		bleService.addCharacteristic(iter.second.characteristic);
	}

	bleService.addCharacteristic(modelNameCharacteristic);

	bleService.addCharacteristic(ledInfoCharacteristic);
	ledInfoCharacteristic.setEventHandler(BLEWritten, &OnCharacteristicWritten);

	BLE.addService(bleService);

	// Build advertising data packet
	BLEAdvertisingData advData;

	advData.setLocalName(DEVICE_NAME.c_str());

	// Set parameters for advertising packet
	advData.setAdvertisedService(bleService);
	// Copy set parameters in the actual advertising packet
	BLE.setAdvertisingData(advData);
	BLE.setScanResponseData(advData);
	BLE.advertise();
}

void BLELedController::update() {
	BLE.poll(0);
}

void BLELedController::addRGBWCharacteristic(const std::string& name, std::function<void(RGBW newColor)> callback) {
	auto iter = WELL_KNOWN_LED_CHARACTERISTICS.find(name);

	UUID uuid(false);

	if (iter != WELL_KNOWN_LED_CHARACTERISTICS.end()) {
		uuid = iter->second;
	} else {
		uuid.generate();
	}

	Serial.printf("Create RGBW mapping with name '%s' on uuid '%s'\n", name.c_str(), uuid.toString().c_str());

	LedMappingData mapping(uuid, callback, name);
	uuidToCharacteristicMap.insert({uuid, mapping});
}

void BLELedController::setOnConnectCallback(std::function<void(const char*)> onConnectCallback) {
    this->onConnectCallback = onConnectCallback;
}

void BLELedController::setOnDisconnectCallback(std::function<void(const char*)> onDisconnectCallback) {
    this->onDisconnectCallback = onDisconnectCallback;
}

/////////////////////
// Private methods //
/////////////////////

void BLELedController::onCharacteristicWritten(BLEDevice device, BLECharacteristic characteristic) {
	auto iter = uuidToCharacteristicMap.find(characteristic.uuid());

	if (iter != uuidToCharacteristicMap.end()) {
		RGBW newColor = ExtractRGBW(characteristic);

		iter->second.callback(newColor);

	} else if (strcmp(characteristic.uuid(), ledInfoCharacteristic.uuid()) == 0) {
		handleLedInfoRequest(characteristic);
	} else {
		Serial.printf("Unhandled characteristic with uuid: '%s'\n", characteristic.uuid());
	}
}

void BLELedController::handleLedInfoRequest(BLECharacteristic& characteristic) {
	if (characteristic.valueLength() >= 1 && characteristic.value()[0] == 0x00) {
		std::vector<uint8_t> data(characteristic.valueLength());
		characteristic.readValue(data.data(), data.size());

		std::string cmd(data.begin() + 1, data.end());

		if (cmd == "list") {
			writeLedInfoDataV1(characteristic);
		} else {
			Serial.printf("Unhandled led info request: '%s'\n", cmd.c_str());
		}
	}
}

void BLELedController::writeLedInfoDataV1(BLECharacteristic& characteristic) {
	for (auto i : uuidToCharacteristicMap) {
		uint8_t buffer[128];
		buffer[0] = 0x01;

		char* charPtr = reinterpret_cast<char*>(buffer + 1);
		size_t length = 1 + snprintf(charPtr, sizeof(buffer) - 1, "%s:%s:RGBW", i.first.toString().c_str(), i.second.name.c_str());

		ledInfoCharacteristic.writeValue(buffer, length);
	}
}

void BLELedController::OnCharacteristicWritten(BLEDevice device, BLECharacteristic characteristic) {
	if (instance) {
		instance->onCharacteristicWritten(device, characteristic);
	}
}

void BLELedController::OnConnect(BLEDevice bleDevice) {
	if (instance && instance->onConnectCallback) {
		instance->onConnectCallback(bleDevice.address().c_str());
	}
}

void BLELedController::OnDisconnect(BLEDevice bleDevice) {
	if (instance && instance->onDisconnectCallback) {
		instance->onDisconnectCallback(bleDevice.address().c_str());
	}
}

RGBW BLELedController::ExtractRGBW(const BLECharacteristic& characteristic) {
	if (characteristic.valueLength() < 4) {
		return RGBW();
	}

	const uint8_t* ptr = characteristic.value();

	RGBW newColor;
	memcpy(&newColor, ptr, 4);
	return newColor;
}
