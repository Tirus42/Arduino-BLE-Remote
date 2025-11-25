#include "BLELedController.h"

#include <NimBLEDevice.h>
#include <mbedtls/md5.h>

#include "Util.h"

#include "GUIProtocol.h"

#include "gui/WebGUIHandler.h"

#include <string.h>	// For memcpy()
#include <optional>

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


static const BLEUUID SERVICE_PRIMARY_UUID("a6a2fc07-815c-4262-97a9-1cef5181a1e4");
static const BLEUUID SERVICE_SECONDARY_UUID("a6a2fc07-815c-4262-97a9-1cef5181a1e5");

static const BLEUUID MODEL_NAME_CHARACTERISTIC_UUID("928ec7e1-b867-4b7d-904b-d3b8769a7299");
static const BLEUUID LED_INFO_CHARACTERISTIC_UUID("013201e4-0873-4377-8bff-9a2389af3883");
static const BLEUUID GUI_CHARACTERISTIC_UUID("013201e4-0873-4377-8bff-9a2389af3884");

struct BLELedController::CharacteristicCallbacks : public BLECharacteristicCallbacks {
	virtual void onWrite(BLECharacteristic* pCharacteristic/*, esp_ble_gatts_cb_param_t* param*/) override {
		instance->onCharacteristicWritten(pCharacteristic);
	}
} callbackHandler;

struct BLELedController::LedMappingData {
	std::function<void(RGBW newColor)> callback;
	std::string name;
	std::shared_ptr<std::string> uuidString;
	BLECharacteristic* characteristic;
	ColorChannels colorChannels;

	LedMappingData(UUID uuid, std::function<void(RGBW newColor)> callback, std::string name, BLEService* pService, ColorChannels colorChannels) :
		callback(callback),
		name(name),
		uuidString(std::make_shared<std::string>(uuid.toString().c_str())),
		characteristic(pService->createCharacteristic(uuidString->c_str(), NIMBLE_PROPERTY::WRITE)),
		colorChannels(colorChannels) {}
};

static std::string BleMacToString(const ble_addr_t& addr) {
	char buffer[6 * 2 + 5 + 1];
	snprintf(buffer, sizeof(buffer), "%02X:%02X:%02X:%02X:%02X:%02X",
	         addr.val[5], addr.val[4], addr.val[3], addr.val[2], addr.val[1], addr.val[0]);

	return std::string(buffer);
}

struct BLELedController::InternalData : public BLEServerCallbacks {
	BLEServer* pServer;
	BLEService* pService;
	BLECharacteristic* modelNameCharacteristic;
	BLECharacteristic* ledInfoCharacteristic;
	std::unique_ptr<WebGUIHandler> optWebGUIHandler;

	uint8_t clientLimit;

	InternalData(uint8_t clientLimit, DeviceType deviceType) :
		pServer(BLEDevice::createServer()),
		pService(pServer->createService(GetServiceUUID(deviceType))),
		modelNameCharacteristic(pService->createCharacteristic(MODEL_NAME_CHARACTERISTIC_UUID, NIMBLE_PROPERTY::READ)),
		ledInfoCharacteristic(nullptr),
		optWebGUIHandler(),
		clientLimit(clientLimit) {

		pServer->setCallbacks(this);
	}

	~InternalData() {
		// We must remove the callback-ptr or the server will try to delete this
		pServer->setCallbacks(nullptr);

		if (optWebGUIHandler) {
			optWebGUIHandler.reset();
		}

		pServer->removeService(pService, true);
	}

	void addCharacteristic(BLECharacteristic* characteristic) {
		pService->addCharacteristic(characteristic);
	}

	void removeCharacteristic(BLECharacteristic* characteristic) {
		pService->removeCharacteristic(characteristic, false);
	}

	void addLedInfoCharacteristicOnDemand() {
		if (!ledInfoCharacteristic) {
			ledInfoCharacteristic = pService->createCharacteristic(LED_INFO_CHARACTERISTIC_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY);
			ledInfoCharacteristic->setCallbacks(&callbackHandler);
		}
	}

	void setGUI(std::shared_ptr<webgui::RootElement> guiRoot) {
		optWebGUIHandler.reset();

		if (guiRoot) {
			optWebGUIHandler = std::make_unique<WebGUIHandler>(guiRoot, pService);
		}
	}

	/**
	 * Returns the smallest MTU of all connected clients.
	 */
	std::optional<uint16_t> getClientsMtu() const {
		if (pServer->getConnectedCount() == 0) {
			return {};
		}

		uint16_t maxMtu = std::numeric_limits<uint16_t>::max();

		for (size_t i = 0; i < pServer->getConnectedCount(); ++i) {
			uint16_t clientMtu = pServer->getPeerMTU(i);

			printf("Client %u has a MTU of %u\n", i, clientMtu);

			if (clientMtu == 0) {
				// Override seems defect, override it ...
				clientMtu = 128;

				//if (errorLogTarget) {
				//	errorLogTarget->printf("MTU of client %u reported as 0, overridden to 128\n", *clientMtu);
				//}
			}

			maxMtu = std::min(maxMtu, clientMtu);
		}

		return {maxMtu};
	}

	/**
	 * Returns the maximum amount of bytes that can be written into a characteristic
	 * that all conneted clients can handle.
	 */
	std::optional<uint16_t> getClientsContentMtu() const {
		std::optional<uint16_t> clientsMtu = getClientsMtu();

		if (!clientsMtu)
			return clientsMtu;

		if (*clientsMtu > 3) {
			return {*clientsMtu - 3};
		}

		return {};
	}

	virtual void onConnect(BLEServer* _server, ble_gap_conn_desc* param) override {
		clientLimit--;

		instance->OnConnect(BleMacToString(param->peer_ota_addr).c_str());

		if (clientLimit > 0) {
			pServer->getAdvertising()->start();
		}
	}

	virtual void onDisconnect(BLEServer* _server, ble_gap_conn_desc* param) override {
		clientLimit++;

		instance->OnDisconnect(BleMacToString(param->peer_ota_addr).c_str());
	}
};

BLELedController::BLELedController(const char* deviceName, const char* modelName, uint8_t clientLimit, DeviceType deviceType) :
	onConnectCallback(),
	onDisconnectCallback(),
	uuidToCharacteristicMap(),
	internal(),
	errorLogTarget(nullptr),
	deviceType(deviceType) {

	if (clientLimit == 0) {
		clientLimit = 1;
	}

	BLEDevice::init(deviceName);

	internal.reset(new InternalData(clientLimit, deviceType));

	// Set global instance
	instance = this;

	if (!modelName) {
		modelName = deviceName;
	}

	internal->modelNameCharacteristic->setValue(reinterpret_cast<const uint8_t*>(modelName), strlen(modelName));
}

BLELedController::~BLELedController() {
	internal.reset();

	BLEDevice::deinit(true);

	// Unset global instance
	instance = nullptr;
}

void BLELedController::setErrorLogTarget(Print* errorTarget) {
	this->errorLogTarget = errorTarget;
}

Print* BLELedController::getErrorLogTarget() const {
	return this->errorLogTarget;
}

void BLELedController::begin() {
	for (auto& iter : uuidToCharacteristicMap) {
		iter.second.characteristic->setCallbacks(&callbackHandler);
	}

	internal->pService->start();

	// Start advertising
	BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
	pAdvertising->addServiceUUID(GetServiceUUID(deviceType));
	internal->pServer->getAdvertising()->start();
}

void BLELedController::update() {
	// Nothing to do here (deprecated)
}

void BLELedController::addRGBWCharacteristic(const std::string& name, std::function<void(RGBW newColor)> callback, const ColorChannels& colorChannels) {
	auto iter = WELL_KNOWN_LED_CHARACTERISTICS.find(name);

	UUID uuid(false);

	if (iter != WELL_KNOWN_LED_CHARACTERISTICS.end()) {
		uuid = iter->second;
	} else {
		uuid = GenerateUUIDByName(name);

		// Custom UUID generated, add info characteristic to allow the client to read the mapping
		internal->addLedInfoCharacteristicOnDemand();
	}

	Serial.printf("Create RGBW mapping with name '%s' on UUID '%s'\n", name.c_str(), uuid.toString().c_str());

	LedMappingData mapping(uuid, callback, name, internal->pService, colorChannels);
	uuidToCharacteristicMap.insert({uuid, std::move(mapping)});
}

void BLELedController::setGUI(std::shared_ptr<webgui::RootElement> guiRoot) {
	internal->setGUI(guiRoot);
}

bool BLELedController::notifyGUIValueChange(const std::vector<std::string>& path) {
	if (!internal->optWebGUIHandler)
		return false;

	return internal->optWebGUIHandler->notifyGUIValueChange(path);
}

void BLELedController::setOnConnectCallback(std::function<void(const char*)> onConnectCallback) {
	this->onConnectCallback = onConnectCallback;
}

void BLELedController::setOnDisconnectCallback(std::function<void(const char*)> onDisconnectCallback) {
	this->onDisconnectCallback = onDisconnectCallback;
}

size_t BLELedController::getConnectedCount() const {
	return internal->pServer->getConnectedCount();
}

std::optional<uint16_t> BLELedController::getClientsContentMtu() const {
	return internal->getClientsContentMtu();
}

UUID BLELedController::GenerateUUIDByName(const std::string& name) {
	mbedtls_md5_context ctx;

	mbedtls_md5_init(&ctx);

	mbedtls_md5_starts_ret(&ctx);
	mbedtls_md5_update_ret(&ctx, reinterpret_cast<const uint8_t*>(name.c_str()), name.length());

	UUID result;

	mbedtls_md5_finish(&ctx, result.bytes.data());
	mbedtls_md5_free(&ctx);

	return result;
}

BLEUUID BLELedController::GetServiceUUID(DeviceType deviceType) {
	return deviceType == DeviceType::Primary ? SERVICE_PRIMARY_UUID : SERVICE_SECONDARY_UUID;
}

/////////////////////
// Private methods //
/////////////////////

void BLELedController::onCharacteristicWritten(BLECharacteristic* characteristic) {
	auto iter = uuidToCharacteristicMap.find(UUID(characteristic->getUUID().toString().c_str()));

	if (iter != uuidToCharacteristicMap.end()) {
		RGBW newColor = ExtractRGBW(*characteristic);

		iter->second.callback(newColor);

	} else if (internal->ledInfoCharacteristic && characteristic->getUUID().equals(internal->ledInfoCharacteristic->getUUID())) {
		handleLedInfoRequest(*characteristic);
	} else {
		Serial.printf("Unhandled characteristic with UUID: '%s'\n", characteristic->getUUID().toString().c_str());
	}
}

void BLELedController::handleLedInfoRequest(BLECharacteristic& characteristic) {
	if (characteristic.getDataLength() >= 1 && characteristic.getValue().data()[0] == 0x00) {
		NimBLEAttValue value = characteristic.getValue();

		std::string cmd(value.begin() + 1, value.end());

		if (cmd == "list") {
			writeLedInfoDataV1(characteristic);
		} else {
			Serial.printf("Unhandled led info request: '%s'\n", cmd.c_str());
		}
	}
}

void BLELedController::writeLedInfoDataV1(BLECharacteristic& characteristic) const {
	for (auto& i : uuidToCharacteristicMap) {
		uint8_t buffer[128];
		buffer[0] = 0x01;

		std::string channelString;

		if (i.second.colorChannels.r)
			channelString += "R";

		if (i.second.colorChannels.g)
			channelString += "G";

		if (i.second.colorChannels.b)
			channelString += "B";

		if (i.second.colorChannels.w)
			channelString += "W";

		char* charPtr = reinterpret_cast<char*>(buffer + 1);
		size_t length = 1 + snprintf(charPtr, sizeof(buffer) - 1, "%s:%s:%s", i.first.toString().c_str(), i.second.name.c_str(), channelString.c_str());

		characteristic.notify(buffer, length);
	}
}

void BLELedController::OnCharacteristicWritten(BLECharacteristic* characteristic) {
	if (instance) {
		instance->onCharacteristicWritten(characteristic);
	}
}

void BLELedController::OnConnect(const char* remoteAddr) {
	if (instance && instance->onConnectCallback) {
		instance->onConnectCallback(remoteAddr);
	}
}

void BLELedController::OnDisconnect(const char* remoteAddr) {
	if (instance && instance->onDisconnectCallback) {
		instance->onDisconnectCallback(remoteAddr);
	}
}

RGBW BLELedController::ExtractRGBW(const BLECharacteristic& characteristic) {
	// TODO: Pull request on author to fix this missing const
	NimBLEAttValue value = const_cast<BLECharacteristic&>(characteristic).getValue();

	if (value.length() < 4) {
		return RGBW();
	}

	const uint8_t* ptr = value.data();

	RGBW newColor;
	memcpy(&newColor, ptr, 4);
	return newColor;
}

BLELedController* BLELedController::GetInstance() {
	return instance;
}
