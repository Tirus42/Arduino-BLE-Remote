#include "BLEGUIClient.h"

#include "BLELedController.h"

#include <lwip/def.h>	// for htonl()

// UUIDs from the "BLE Remote" library used for the GUI Protocol
// TODO: Deduplicate, use a shared header
static BLEUUID CHARACTERISTIC_UUID("013201e4-0873-4377-8bff-9a2389af3884");

BLEGUIClient::BLEGUIClient(const BLEAddress& addr) :
	pClient(nullptr),
	pRemoteCharacteristic(nullptr) {
	// See https://github.com/h2zero/NimBLE-Arduino/blob/1.4.2/examples/NimBLE_Client/NimBLE_Client.ino
	// for reference.

	pClient = NimBLEDevice::getDisconnectedClient();

	if (!pClient) {
		pClient = NimBLEDevice::createClient();
	}

	// Set connection parameters for faster connection
	pClient->setConnectionParams(12,12,0,51);

	// Set timeout to one second
	pClient->setConnectTimeout(1);

	Serial.printf("BLEClient: Connecting to device %s ...\n", addr.toString().c_str());
	if (!pClient->connect(addr, false)) {
		Serial.printf("BLEClient: Connect failed!\n");
		return;
	}

	Serial.print("Connected\n");

	BLERemoteService* remoteService = pClient->getService(BLELedController::GetServiceUUID(DeviceType::Primary));

	if (remoteService == nullptr) {
		// Try as secondary device service UUID
		remoteService = pClient->getService(BLELedController::GetServiceUUID(DeviceType::Secondary));
	}

	if (remoteService == nullptr) {
		Serial.printf("BLEClient: Service on device not found! Disconnecting.\n");
		pClient->disconnect();
		return;
	}

	BLERemoteCharacteristic* characteristic = remoteService->getCharacteristic(CHARACTERISTIC_UUID);

	if (characteristic == nullptr) {
		Serial.printf("BLEClient: Characteristic on device not found! Disconnecting.\n");
		pClient->disconnect();
		return;
	}

	pRemoteCharacteristic = characteristic;
}

BLEGUIClient::~BLEGUIClient() {
	if (pClient) {
		if (pClient->isConnected()) {
			pClient->disconnect();
		}

		NimBLEDevice::deleteClient(pClient);
	}
}

bool BLEGUIClient::isConnected() const {
	return pClient && pClient->isConnected();
}

void BLEGUIClient::setValue(const char* name, uint32_t newValue) {
	// This is a dirty client hack of the GUI protocol from the library.
	// TODO: Improve this

	uint8_t buffer[1024];
	// "SetValue"
	buffer[0] = 0x01;
	// Request Id
	buffer[1] = 255;
	buffer[2] = 0;
	buffer[3] = 0;
	buffer[4] = 0;

	uint32_t nameLength = strlen(name);
	uint32_t networkBytes = htonl(nameLength);

	memcpy(buffer + 5, &networkBytes, 4);
	memcpy(buffer + 9, name, nameLength);

	uint32_t offset = 9 + nameLength;

	// type: Number value
	buffer[offset + 0] = 0;

	uint32_t networkValue = htonl(newValue);

	memcpy(buffer + offset + 1, &networkValue, 4);

	if (pRemoteCharacteristic) {
		// Note: Third parameter must be false, otherwise the BLE connections will fail
		// after some operations! Maybe a full queue resulting in a send/receive deadlock?
		pRemoteCharacteristic->writeValue(buffer, offset + 5, false);
	}
}

void BLEGUIClient::setValue(const char* name, const std::string& newValue) {
	// This is a dirty client hack of the GUI protocol from the library.
	// TODO: Improve this

	uint8_t buffer[1024];
	// "SetValue"
	buffer[0] = 0x01;
	// Request Id
	buffer[1] = 255;
	buffer[2] = 0;
	buffer[3] = 0;
	buffer[4] = 0;

	uint32_t nameLength = strlen(name);
	uint32_t networkBytes = htonl(nameLength);

	memcpy(buffer + 5, &networkBytes, 4);
	memcpy(buffer + 9, name, nameLength);

	uint32_t offset = 9 + nameLength;

	// type: String value
	buffer[offset + 0] = 1;

	uint32_t strLength = htonl(newValue.length());

	memcpy(buffer + offset + 1, &strLength, 4);
	memcpy(buffer + offset + 5, newValue.c_str(), newValue.length());

	if (pRemoteCharacteristic) {
		// Note: Third parameter must be false, otherwise the BLE connections will fail
		// after some operations! Maybe a full queue resulting in a send/receive deadlock?
		pRemoteCharacteristic->writeValue(buffer, offset + 5 + newValue.length(), false);
	}
}
