#pragma once

#include <RGBW.h>

#include <UUID.h>

#include <functional>
#include <string>

class BLEDevice;
class BLECharacteristic;

class BLELedController {
	private:
		struct LedMappingData;

		std::function<void(const char* mac)> onConnectCallback;
		std::function<void(const char* mac)> onDisconnectCallback;

		std::map<UUID, LedMappingData> uuidToCharacteristicMap;

		void onCharacteristicWritten(BLEDevice device, BLECharacteristic characteristic);

		void handleLedInfoRequest(BLECharacteristic& characteristic);
		void writeLedInfoDataV1(BLECharacteristic& characteristic);

		static void OnCharacteristicWritten(BLEDevice device, BLECharacteristic characteristic);
		static void OnConnect(BLEDevice bleDevice);
		static void OnDisconnect(BLEDevice bleDevice);

		static RGBW ExtractRGBW(const BLECharacteristic& characteristic);

	public:
		BLELedController(const char* deviceName, const char* modelName = nullptr);
		~BLELedController();

		void begin();

		void addRGBWCharacteristic(const std::string& name, std::function<void(RGBW newColor)> callback);
		void setOnConnectCallback(std::function<void()> onConnectCallback);
		void setOnDisconnectCallback(std::function<void()> onDisconnectCallback);

		void update();
};
