#pragma once

#include "GUIDefinition.h"
#include "GUIProtocol.h"

#include "AsyncBLECharacteristicWriter.h"

class WebGUIHandler : public BLECharacteristicCallbacks {
	private:
		std::shared_ptr<webgui::RootElement> guiRoot;

		AsyncBLECharacteristicWriter guiDataSendQueue;

		NimBLECharacteristic& getCharacteristic();

		void handleGUIRequest(BLECharacteristic& characteristic);
		void handleGUISetValueRequest(uint32_t requestId, const std::vector<uint8_t>& content);

		void writeGUIInfoDataV1(uint32_t requestId);
		void writeGUIUpdateValue(uint32_t requestId, const std::vector<std::string>& path, const webgui::AValueWrapper& value);
		void writeGUIUpdateValue(uint32_t requestId, const std::string& name, const webgui::AValueWrapper& value);

		/**
		 * Writes a block of data to the characteristic. When the data is longer then the transmission size, it will be split
		 * into several parts. The receiver can handle this by the prefixed length information.
		 */
		void writeCharacteristicData(GUIServerHeader headByte, uint32_t requestId, const std::vector<uint8_t>& data);
		void writeCharacteristicData(GUIServerHeader headByte, uint32_t requestId, const uint8_t* data, size_t length);

		/**
		 * Concats the given path into the string representation.
		 */
		static std::string ConcatPath(const std::vector<std::string>& path);

	public:
		WebGUIHandler(std::shared_ptr<webgui::RootElement> guiRoot, BLEService* pService);
		~WebGUIHandler();

		bool notifyGUIValueChange(const std::vector<std::string>& path);

		virtual void onWrite(BLECharacteristic* pCharacteristic/*, esp_ble_gatts_cb_param_t* param*/) override;
		virtual void onSubscribe(NimBLECharacteristic* pCharacteristic, ble_gap_conn_desc* desc, uint16_t subValue) override;
};
