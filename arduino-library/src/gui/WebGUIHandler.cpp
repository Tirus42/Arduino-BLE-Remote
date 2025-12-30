#include "WebGUIHandler.h"

#include "Util.h"

#include "BLELedController.h"

#include <inttypes.h>

static const BLEUUID GUI_CHARACTERISTIC_UUID("013201e4-0873-4377-8bff-9a2389af3884");

WebGUIHandler::WebGUIHandler(std::shared_ptr<webgui::RootElement> guiRoot, BLEService* pService) :
	guiRoot(guiRoot),
	guiDataSendQueue(pService->createCharacteristic(GUI_CHARACTERISTIC_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY)) {

	guiDataSendQueue.getCharacteristic()->setCallbacks(this);
}

WebGUIHandler::~WebGUIHandler() {
	// TODO: Remove characteristic
}

bool WebGUIHandler::notifyGUIValueChange(const std::vector<std::string>& path) {
	std::unique_ptr<webgui::AValueWrapper> currentValue = guiRoot->getValue(path);

	if (!currentValue)
		return false;

	writeGUIUpdateValue(BROADCAST_REQUEST_ID, path, *currentValue);
	return true;
}

void WebGUIHandler::onWrite(BLECharacteristic* pCharacteristic/*, esp_ble_gatts_cb_param_t* param*/) {
	handleGUIRequest(*pCharacteristic);
}

void WebGUIHandler::onSubscribe(NimBLECharacteristic* pCharacteristic, ble_gap_conn_desc* desc, uint16_t subValue) {
	if (pCharacteristic != guiDataSendQueue.getCharacteristic())
		return;

	uint16_t conHandle = desc->conn_handle;

	if (subValue == 0) {
		guiDataSendQueue.removeSubscriber(conHandle);
	} else {
		guiDataSendQueue.addSubscriber(conHandle);
	}
}

/////////////////////
// Private methods //
/////////////////////

NimBLECharacteristic& WebGUIHandler::getCharacteristic() {
	return *guiDataSendQueue.getCharacteristic();
}

void WebGUIHandler::handleGUIRequest(BLECharacteristic& characteristic) {
	if (characteristic.getDataLength() == 0)
		return;

	NimBLEAttValue value = characteristic.getValue();

	uint8_t headByte = value[0];
	uint32_t requestId = ntohl(PeekUInt32(value.begin() + 1));

	if (headByte >= uint8_t(GUIClientHeader::COUNT))
		return;

	switch (GUIClientHeader(headByte)) {
		case GUIClientHeader::RequestGUI: {
			writeGUIInfoDataV1(requestId);
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

void WebGUIHandler::handleGUISetValueRequest(uint32_t requestId, const std::vector<uint8_t>& content) {
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
		case ValueType::Int32: {
			if (content.size() < offset + 5) {
				return;
			}

			uint32_t value = ntohl(PeekUInt32(content.data() + offset + 1));
			guiRoot->setValue(path, webgui::Int32ValueWrapper(value));
			writeGUIUpdateValue(requestId, name, webgui::Int32ValueWrapper(value));
			break;
		}

		case ValueType::Boolean: {
			if (content.size() < offset + 2) {
				return;
			}

			bool value = PeekUInt8(content.data() + offset + 1);
			guiRoot->setValue(path, webgui::BooleanValueWrapper(value));
			writeGUIUpdateValue(requestId, name, webgui::BooleanValueWrapper(value));
			break;
		}

		case ValueType::String: {
			if (content.size() < offset + 5) {
				return;
			}

			uint32_t strLength = ntohl(PeekUInt32(content.data() + offset + 1));
			offset += 5;

			if (content.size() < offset + strLength) {
				Serial.printf("Ignore string value, as the content is too small, data length: %u bytes, string length: %" PRIu32 " bytes\n", content.size(), strLength);
				return;
			}

			std::string value = {reinterpret_cast<const char*>(content.data() + offset), reinterpret_cast<const char*>(content.data() + offset + strLength)};
			guiRoot->setValue(path, webgui::StringValueWrapper(value));
			// TODO: Dont broadcast password fields
			writeGUIUpdateValue(requestId, name, webgui::StringValueWrapper(value));
			break;
		}

		case ValueType::RGBWColor: {
			if (content.size() < offset + 5) {
				return;
			}

			uint8_t wrgbBytes[4];
			memcpy(wrgbBytes, content.data() + offset + 1, 4);
			RGBW color(wrgbBytes[1], wrgbBytes[2], wrgbBytes[3], wrgbBytes[0]);

			guiRoot->setValue(path, webgui::RGBWValueWrapper(color));
			writeGUIUpdateValue(requestId, name, webgui::RGBWValueWrapper(color));
			break;
		}

		case ValueType::Float32: {
			if (content.size() < offset + 5) {
				return;
			}

			float value = ntohl(PeekFloat32(content.data() + offset + 1));
			guiRoot->setValue(path, webgui::Float32ValueWrapper(value));
			writeGUIUpdateValue(requestId, name, webgui::Float32ValueWrapper(value));
			break;
		}

		default:
			Serial.printf("Unhandled value data type: %" PRIu32 "\n", uint32_t(type));
			return;
	}
}

void WebGUIHandler::writeGUIInfoDataV1(uint32_t requestId) {
	std::string json = guiRoot->toJSON();

	writeCharacteristicData(GUIServerHeader::GUIData, requestId, reinterpret_cast<const uint8_t*>(json.data()), json.size());
}

void WebGUIHandler::writeGUIUpdateValue(uint32_t requestId, const std::vector<std::string>& path, const webgui::AValueWrapper& value) {
	writeGUIUpdateValue(requestId, ConcatPath(path), value);
}

void WebGUIHandler::writeGUIUpdateValue(uint32_t requestId, const std::string& name, const webgui::AValueWrapper& value) {
	std::vector<uint8_t> namePart = StringToLengthPrefixedVector(name);
	std::vector<uint8_t> valuePart(1);

	valuePart[0] = uint8_t(value.getType());

	using ValueType = webgui::ValueType;

	switch (value.getType()) {
		case ValueType::Int32: {
			valuePart.resize(5);
			PokeUInt32(valuePart.data() + 1, htonl(value.getAsInt32()));
			break;
		}

		case ValueType::Boolean: {
			valuePart.resize(2);
			valuePart[1] = value.getAsBool();
			break;
		}

		case ValueType::String: {
			valuePart = MergeVectors(valuePart, StringToLengthPrefixedVector(value.getAsString()));
			break;
		}

		case ValueType::RGBWColor: {
			// Note: Here should dynamic_cast be used. But we compile with -fno-rtti
			const webgui::RGBWValueWrapper& rgbwValue = static_cast<const webgui::RGBWValueWrapper&>(value);

			valuePart.resize(5);
			valuePart[1] = rgbwValue.value.w;
			valuePart[2] = rgbwValue.value.r;
			valuePart[3] = rgbwValue.value.g;
			valuePart[4] = rgbwValue.value.b;
			break;
		}

		case ValueType::Float32: {
			valuePart.resize(5);
			PokeFloat32(valuePart.data() + 1, htonf(value.getAsFloat32()));
			break;
		}
	}

	writeCharacteristicData(GUIServerHeader::UpdateValue, requestId, MergeVectors(namePart, valuePart));
}

void WebGUIHandler::writeCharacteristicData(GUIServerHeader headByte, uint32_t requestId, const std::vector<uint8_t>& data) {
	writeCharacteristicData(headByte, requestId, data.data(), data.size());
}

void WebGUIHandler::writeCharacteristicData(GUIServerHeader headByte, uint32_t requestId, const uint8_t* data, size_t length) {
	if (getCharacteristic().getSubscribedCount() == 0) {
		Serial.printf("No characteristic subscribers, ignoring\n");
		return;
	}

	std::optional<uint16_t> clientMtu = BLELedController::GetInstance()->getClientsContentMtu();

	if (!clientMtu) {
		// No clients connected? Ignore write request.
		return;
	}

	if (*clientMtu < 10) {
		Print* errorLogTarget = BLELedController::GetInstance()->getErrorLogTarget();

		if (errorLogTarget) {
			errorLogTarget->printf("Cannot send data, need at least 10 bytes MTU but reported client MTU is %u\n", *clientMtu);
		}

		return;
	}

	std::vector<uint8_t> sendBuffer(*clientMtu);

	sendBuffer[0] = static_cast<uint8_t>(headByte);
	PokeUInt32(sendBuffer.data() + 1, htonl(requestId));
	PokeUInt32(sendBuffer.data() + 5, htonl(length));

	size_t offset = std::min(sendBuffer.size() - 9, length);
	memcpy(sendBuffer.data() + 9, data, offset);

	// Write first chunk
	size_t firstChunkSize = 9 + offset;

	guiDataSendQueue.append(sendBuffer.data(), firstChunkSize);

	// Send remaining data
	while (length > offset) {
		size_t blockSize = std::min(length - offset, sendBuffer.size());

		guiDataSendQueue.append(data + offset, blockSize);
		offset += blockSize;
	}
}

std::string WebGUIHandler::ConcatPath(const std::vector<std::string>& path) {
	std::string result;

	for (size_t i = 0; i < path.size(); ++i) {
		result += path[i];

		if (i + 1 < path.size()) {
			result += ',';
		}
	}

	return result;
}
