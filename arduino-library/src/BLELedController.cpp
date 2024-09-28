#include "BLELedController.h"

#include <NimBLEDevice.h>
#include <mbedtls/md5.h>

#include "GUIDefinition.h"
#include "GUIProtocol.h"

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


static const BLEUUID SERVICE_UUID("a6a2fc07-815c-4262-97a9-1cef5181a1e4");

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
	BLECharacteristic* guiCharacteristic;
	std::shared_ptr<webgui::RootElement> guiData;
	uint8_t clientLimit;

	InternalData(uint8_t clientLimit) :
		pServer(BLEDevice::createServer()),
		pService(pServer->createService(SERVICE_UUID)),
		modelNameCharacteristic(pService->createCharacteristic(MODEL_NAME_CHARACTERISTIC_UUID, NIMBLE_PROPERTY::READ)),
		ledInfoCharacteristic(nullptr),
		guiCharacteristic(nullptr),
		clientLimit(clientLimit) {

		pServer->setCallbacks(this);
	}

	~InternalData() {
		// We must remove the callback-ptr or the server will try to delete this
		pServer->setCallbacks(nullptr);

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

	void addGUICharacteristicOnDemand() {
		if (!guiCharacteristic) {
			guiCharacteristic = pService->createCharacteristic(GUI_CHARACTERISTIC_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY);
			guiCharacteristic->setCallbacks(&callbackHandler);
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

BLELedController::BLELedController(const char* deviceName, const char* modelName, uint8_t clientLimit) :
	onConnectCallback(),
	onDisconnectCallback(),
	uuidToCharacteristicMap(),
	internal(),
	errorLogTarget(nullptr) {

	if (clientLimit == 0) {
		clientLimit = 1;
	}

	BLEDevice::init(deviceName);

	internal.reset(new InternalData(clientLimit));

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

void BLELedController::begin() {
	for (auto& iter : uuidToCharacteristicMap) {
		iter.second.characteristic->setCallbacks(&callbackHandler);
	}

	internal->pService->start();

	// Start advertising
	BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
	pAdvertising->addServiceUUID(SERVICE_UUID);
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

void BLELedController::setGUI(std::shared_ptr<webgui::RootElement> guiData) {
	internal->guiData = guiData;

	internal->addGUICharacteristicOnDemand();
}

bool BLELedController::notifyGUIValueChange(const std::vector<std::string>& path) {
	if (!internal->guiData)
		return false;

	std::unique_ptr<webgui::AValueWrapper> currentValue = internal->guiData->getValue(path);

	if (!currentValue)
		return false;

	writeGUIUpdateValue(*internal->guiCharacteristic, BROADCAST_REQUEST_ID, path, *currentValue);
	return true;
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
	} else if (characteristic->getUUID().equals(internal->guiCharacteristic->getUUID())) {
		handleGUIRequest(*characteristic);
	} else {
		Serial.printf("Unhandled characteristic with UUID: '%s'\n", characteristic->getUUID().toString().c_str());
	}
}

// TODO: Move to shared lib?
static std::vector<std::string> SplitString(const std::string& input, const std::string& delimiter) {
	std::vector<std::string> result;

	if (delimiter.empty()) {
		for (char c : input) {
			result.push_back(std::string() + c);
		}
	} else {
		size_t lastPos = 0;
		size_t pos = 0;

		while ((pos = input.find(delimiter, lastPos)) != std::string::npos) {
			result.push_back(input.substr(lastPos, pos - lastPos));

			lastPos = pos + std::max(size_t(1), delimiter.size());
		}

		result.push_back(input.substr(lastPos, pos));
	}

	return result;
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

void BLELedController::handleGUIRequest(BLECharacteristic& characteristic) {
	if (characteristic.getDataLength() == 0)
		return;

	NimBLEAttValue value = characteristic.getValue();

	uint8_t headByte = value[0];
	uint32_t requestId = ntohl(PeekUInt32(value.begin() + 1));

	if (headByte >= uint8_t(GUIClientHeader::COUNT))
		return;

	switch (GUIClientHeader(headByte)) {
		case GUIClientHeader::RequestGUI: {
			writeGUIInfoDataV1(characteristic, requestId);
			break;
		}
		case GUIClientHeader::SetValue: {
			std::vector<uint8_t> remainingData(value.begin() + 5, value.end());
			handleGUISetValueRequest(requestId, remainingData);
			break;
		}
		default: {
			Serial.printf("Unhandled client request with head byte: %u\n", headByte);
		}
	}
}

void BLELedController::handleGUISetValueRequest(uint32_t requestId, const std::vector<uint8_t>& content) {
	if (!internal->guiData) {
		return;
	}

	if (content.size() < 4) {
		return;
	}

	uint32_t keyLength = ntohl(PeekUInt32(content.data() + 0));

	if (content.size() < 4 + keyLength) {
		return;
	}

	std::string name = {reinterpret_cast<const char*>(content.data() + 4), reinterpret_cast<const char*>(content.data() + 4 + keyLength)};
	std::vector<std::string> path = SplitString(name, ",");

	size_t offset = 4 + keyLength;

	if (content.size() < offset + 1) {
		return;
	}

	using ValueType = webgui::ValueType;

	ValueType type = static_cast<ValueType>(content[offset]);

	switch (type) {
		case ValueType::Number: {
			if (content.size() < offset + 5) {
				return;
			}

			uint32_t value = ntohl(PeekUInt32(content.data() + offset + 1));
			internal->guiData->setValue(path, webgui::Int32ValueWrapper(value));
			writeGUIUpdateValue(*internal->guiCharacteristic, requestId, name, webgui::Int32ValueWrapper(value));
			break;
		}
		case ValueType::Boolean: {
			if (content.size() < offset + 2) {
				return;
			}

			bool value = PeekUInt8(content.data() + offset + 1);
			internal->guiData->setValue(path, webgui::BooleanValueWrapper(value));
			writeGUIUpdateValue(*internal->guiCharacteristic, requestId, name, webgui::BooleanValueWrapper(value));
			break;
		}
		case ValueType::String: {
			if (content.size() < offset + 5) {
				return;
			}

			uint32_t strLength = ntohl(PeekUInt32(content.data() + offset + 1));
			offset += 5;

			if (content.size() < offset + strLength) {
				Serial.printf("Ignore string value, as the content is too small, data length: %u bytes, string length: %u bytes\n", content.size(), strLength);
				return;
			}

			std::string value = {reinterpret_cast<const char*>(content.data() + offset), reinterpret_cast<const char*>(content.data() + offset + strLength)};
			internal->guiData->setValue(path, webgui::StringValueWrapper(value));
			// TODO: Dont broadcast password fields
			writeGUIUpdateValue(*internal->guiCharacteristic, requestId, name, webgui::StringValueWrapper(value));
			break;
		}

		default:
			Serial.printf("Unhandled value data type: %u\n", uint32_t(type));
			return;
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

void BLELedController::writeGUIInfoDataV1(NimBLECharacteristic& characteristic, uint32_t requestId) const {
    std::string json = internal->guiData ? internal->guiData->toJSON() : "{}";

    writeCharacteristicData(characteristic, uint8_t(GUIServerHeader::GUIData), requestId, reinterpret_cast<const uint8_t*>(json.data()), json.size());
}

void BLELedController::writeGUIUpdateValue(NimBLECharacteristic& characteristic, uint32_t requestId, const std::vector<std::string>& path, const webgui::AValueWrapper& value) const {
	std::string concat;

	for (size_t i = 0; i < path.size(); ++i) {
		concat += path[i];

		if (i + 1 < path.size()) {
			concat += ',';
		}
	}

	writeGUIUpdateValue(characteristic, requestId, concat, value);
}

static std::vector<uint8_t> MergeVectors(const std::vector<uint8_t>& vector0, const std::vector<uint8_t>& vector1) {
	std::vector<uint8_t> result(vector0.size() + vector1.size());
	memcpy(result.data() + 0, vector0.data(), vector0.size());
	memcpy(result.data() + vector0.size(), vector1.data(), vector1.size());
	return result;
}

void BLELedController::writeGUIUpdateValue(NimBLECharacteristic& characteristic, uint32_t requestId, const std::string& name, const webgui::AValueWrapper& value) const {
	std::vector<uint8_t> namePart = StringToLengthPrefixedVector(name);
	std::vector<uint8_t> valuePart(1);

	valuePart[0] = uint8_t(value.getType());

	using ValueType = webgui::ValueType;

	switch (value.getType()) {
		case ValueType::Number: {
			valuePart.resize(5);
			PokeUInt32(valuePart.data() + 1, htonl(value.getAsInt32()));
			break;
		}
		case ValueType::Boolean: {
			valuePart.resize(2);
			valuePart[1] = value.getAsBool();
			break;
		}
	}

	std::vector<uint8_t> content = MergeVectors(namePart, valuePart);

	writeCharacteristicData(characteristic, uint8_t(GUIServerHeader::UpdateValue), requestId, content.data(), content.size());
}

void BLELedController::writeCharacteristicData(NimBLECharacteristic& characteristic, uint8_t headByte, uint32_t requestId, const uint8_t* data, size_t length) const {
	std::optional<uint16_t> clientMtu = internal->getClientsContentMtu();

	if (!clientMtu) {
		// No clients connected? Ignore write request.
		return;
	}

	if (*clientMtu < 10) {
		if (errorLogTarget) {
			errorLogTarget->printf("Cannot send data, need at least 10 bytes MTU but reported client MTU is %u\n", *clientMtu);
		}
		return;
	}

	std::vector<uint8_t> sendBuffer(*clientMtu);

    sendBuffer[0] = headByte;
	PokeUInt32(sendBuffer.data() + 1, htonl(requestId));
	PokeUInt32(sendBuffer.data() + 5, htonl(length));

    size_t offset = std::min(sendBuffer.size() - 9, length);
    memcpy(sendBuffer.data() + 9, data, offset);

    // Write first chunk
    size_t firstChunkSize = 9 + offset;
    characteristic.notify(sendBuffer.data(), firstChunkSize);

    // Send remaining data
    while (length > offset) {
        size_t blockSize = std::min(length - offset, sendBuffer.size());

        characteristic.notify(data + offset, blockSize);
        offset += blockSize;
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
