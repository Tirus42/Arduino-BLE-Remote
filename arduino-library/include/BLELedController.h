#pragma once

#include <RGBW.h>

#include <UUID.h>

#include <functional>
#include <string>

class NimBLECharacteristic;

class BLELedController {
	private:
		struct LedMappingData;
		struct InternalData;
		struct CharacteristicCallbacks;

		std::function<void(const char* mac)> onConnectCallback;
		std::function<void(const char* mac)> onDisconnectCallback;

		std::map<UUID, LedMappingData> uuidToCharacteristicMap;
		std::unique_ptr<InternalData> internal;

		void onCharacteristicWritten(NimBLECharacteristic* pCharacteristic);

		void handleLedInfoRequest(NimBLECharacteristic& characteristic);
		void writeLedInfoDataV1(NimBLECharacteristic& characteristic);

		static void OnCharacteristicWritten(NimBLECharacteristic* pCharacteristic);
		static void OnConnect(const char* remoteAddr);
		static void OnDisconnect(const char* remoteAddr);

		static RGBW ExtractRGBW(const NimBLECharacteristic& characteristic);

	public:
		BLELedController(const char* deviceName, const char* modelName = nullptr);
		~BLELedController();

		void begin();

		void addRGBWCharacteristic(const std::string& name, std::function<void(RGBW newColor)> callback);
		void setOnConnectCallback(std::function<void(const char*)> onConnectCallback);
		void setOnDisconnectCallback(std::function<void(const char*)> onDisconnectCallback);

		[[deprecated("Not required anymore, will be removed in a future version.")]]
		void update();

		/// \returns the amount of open connections
		size_t getConnectedCount() const;
};
