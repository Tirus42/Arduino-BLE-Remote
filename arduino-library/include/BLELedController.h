#pragma once

#include <RGBW.h>
#include <ColorChannels.h>

#include <UUID.h>

#include <functional>
#include <string>

class NimBLECharacteristic;

namespace webgui {
	class RootElement;
}

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
		void writeLedInfoDataV1(NimBLECharacteristic& characteristic) const;

		void writeGUIInfoDataV1(NimBLECharacteristic& characteristic, uint32_t requestId) const;
		void handleGUIRequest(NimBLECharacteristic& characteristic);
		void handleGUISetValueRequest(const std::vector<uint8_t>& content);

		/**
		 * Writes a block of data to the characteristic. When the data is longer then the transmission size, it will be split
		 * into several parts. The receiver can handle this by the prefixed length information.
		 */
		void writeCharacteristicData(NimBLECharacteristic& characteristic, uint8_t headByte, uint32_t requestId, const uint8_t* data, uint32_t length) const;

		static void OnCharacteristicWritten(NimBLECharacteristic* pCharacteristic);
		static void OnConnect(const char* remoteAddr);
		static void OnDisconnect(const char* remoteAddr);

		static RGBW ExtractRGBW(const NimBLECharacteristic& characteristic);

	public:
		/**
		* Constructor.
		* Initializes the BLE server and starts advertising using the given deviceName.
		* Also sets the modelName of the internal characteristic (optional).
		* Defaults to a client limit of 1 client, then stops advertising.
		* The client limit can be increased, but more then 3 did not seem to work with the used library.
		*/
		BLELedController(const char* deviceName, const char* modelName = nullptr, uint8_t clientLimit = 1);
		~BLELedController();

		void begin();

		/**
		* Adds a RGBW control with the given name.
		* The BLE-Characteristic-UUID will be derived from the given name and stay constant
		* as long as the name stays the same.
		*/
		void addRGBWCharacteristic(const std::string& name, std::function<void(RGBW newColor)> callback, const ColorChannels& channels = "RGBW");
		void setOnConnectCallback(std::function<void(const char*)> onConnectCallback);
		void setOnDisconnectCallback(std::function<void(const char*)> onDisconnectCallback);

		void setGUI(std::shared_ptr<webgui::RootElement> guiData);

		[[deprecated("Not required anymore, will be removed in a future version.")]]
		void update();

		/// \returns the amount of open connections
		size_t getConnectedCount() const;

		/**
		* Generates a specific UUID out of a name.
		* The same name will result in the same UUID.
		* As name any string can be supplied. Internally a hash function is used.
		*/
		static UUID GenerateUUIDByName(const std::string& name);
};
