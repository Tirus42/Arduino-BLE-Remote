#pragma once

#include <NimBLEDevice.h>

#include <cstdint>
#include <queue>
#include <mutex>
#include <thread>
#include <condition_variable>
#include <set>

/**
 * Asynchronous BLE characteristic writer.
 * Uses its own thread to perform the async operations.
 *
 * Contains a sendQueue which can be filled with append().
 * Internally the thread will be waken and send the data to all
 * subscribed clients.
 */
class AsyncBLECharacteristicWriter final {
	private:
		std::queue<std::vector<uint8_t>> sendQueue;
		std::set<uint16_t> subscriberHandles;

		bool threadShouldExit;
		BLECharacteristic* pCharacteristic;

		std::mutex mutex;
		std::condition_variable conditionVariable;
		std::thread thread;

		void ThreadFunc();

	public:
		AsyncBLECharacteristicWriter(BLECharacteristic* pCharacteristic);
		~AsyncBLECharacteristicWriter();

		void append(const uint8_t* ptr, size_t length);
		void append(const std::vector<uint8_t>& buffer);

		void addSubscriber(uint16_t conHandle);
		void removeSubscriber(uint16_t conHandle);

		const BLECharacteristic* getCharacteristic() const {
			return pCharacteristic;
		}

		BLECharacteristic* getCharacteristic() {
			return pCharacteristic;
		}
};
