#pragma once

#include <NimBLEDevice.h>

#include <cstdint>

/**
 * Client implementation of the webgui BLE interface.
 * Provides functions to set values on another ESP via the defined gui path.
 */
class BLEGUIClient {
	private:
		BLEClient* pClient;
		BLERemoteCharacteristic* pRemoteCharacteristic = nullptr;

	public:
		BLEGUIClient(const BLEAddress& addr);
		~BLEGUIClient();

		bool isConnected() const;

		void setValue(const char* path, uint32_t newValue);
		void setValue(const char* path, const std::string& newValue);
};
