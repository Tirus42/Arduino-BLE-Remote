#pragma once

#include "DeviceType.h"

#include <RGBW.h>
#include <ColorChannels.h>

#include <UUID.h>

#include <functional>
#include <vector>
#include <string>

#include <NimBLEDevice.h>

namespace webgui {
	struct RootElement;
	struct AValueWrapper;
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

		Print* errorLogTarget;
		const DeviceType deviceType;

		void onCharacteristicWritten(NimBLECharacteristic* pCharacteristic);

		void handleLedInfoRequest(NimBLECharacteristic& characteristic);
		void writeLedInfoDataV1(NimBLECharacteristic& characteristic) const;

		static void OnCharacteristicWritten(NimBLECharacteristic* pCharacteristic);
		static void OnConnect(const char* remoteAddr);
		static void OnDisconnect(const char* remoteAddr);

		static RGBW ExtractRGBW(const NimBLECharacteristic& characteristic);

		static BLELedController* GetInstance();

		friend class WebGUIHandler;

	public:
		/**
		* Constructor.
		* Initializes the BLE server and starts advertising using the given deviceName.
		* Also sets the modelName of the internal characteristic (optional).
		* Defaults to a client limit of 1 client, then stops advertising.
		* The client limit can be increased, but more then 3 did not seem to work with the used library.
		*/
		BLELedController(const char* deviceName, const char* modelName = nullptr, uint8_t clientLimit = 1, DeviceType deviceType = DeviceType::Primary);
		~BLELedController();

		/// Set or remove error logging target.
		void setErrorLogTarget(Print* errorTarget);

		Print* getErrorLogTarget() const;

		void begin();

		/**
		* Adds a RGBW control with the given name.
		* The BLE-Characteristic-UUID will be derived from the given name and stay constant
		* as long as the name stays the same.
		*/
		void addRGBWCharacteristic(const std::string& name, std::function<void(RGBW newColor)> callback, const ColorChannels& channels = "RGBW");
		void setOnConnectCallback(std::function<void(const char*)> onConnectCallback);
		void setOnDisconnectCallback(std::function<void(const char*)> onDisconnectCallback);

		void setGUI(std::shared_ptr<webgui::RootElement> guiRoot);

		/**
		 * Sends a GUI value update to all connected clients with the current value of the field.
		 * \returns true on success, false when the path was not valid.
		 */
		bool notifyGUIValueChange(const std::vector<std::string>& path);

		[[deprecated("Not required anymore, will be removed in a future version.")]]
		void update();

		/// \returns the amount of open connections
		size_t getConnectedCount() const;

		/**
		 * Returns the maximum amount of bytes that can be written into a characteristic
		 * that all conneted clients can handle.
		 */
		std::optional<uint16_t> getClientsContentMtu() const;

		/**
		* Generates a specific UUID out of a name.
		* The same name will result in the same UUID.
		* As name any string can be supplied. Internally a hash function is used.
		*/
		static UUID GenerateUUIDByName(const std::string& name);

		/**
		 * \returns the service UUID for the specific device type
		 */
		static BLEUUID GetServiceUUID(DeviceType deviceType);
};
