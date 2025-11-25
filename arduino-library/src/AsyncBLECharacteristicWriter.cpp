#include "AsyncBLECharacteristicWriter.h"

AsyncBLECharacteristicWriter::AsyncBLECharacteristicWriter(BLECharacteristic* pCharacteristic) :
	sendQueue(),
	subscriberHandles(),
	threadShouldExit(false),
	pCharacteristic(pCharacteristic),
	mutex(),
	conditionVariable(),
	thread{&AsyncBLECharacteristicWriter::ThreadFunc, this} {}

AsyncBLECharacteristicWriter::~AsyncBLECharacteristicWriter() {
	{
		std::unique_lock<std::mutex> l(mutex);
		threadShouldExit = true;
		conditionVariable.notify_all();
	}

	thread.join();
}

void AsyncBLECharacteristicWriter::append(const uint8_t* ptr, size_t length) {
	std::unique_lock<std::mutex> lock(mutex);

	std::vector<uint8_t> buffer(length, 0);
	memcpy(buffer.data(), ptr, length);

	sendQueue.emplace(std::move(buffer));
	conditionVariable.notify_all();
}

void AsyncBLECharacteristicWriter::append(const std::vector<uint8_t>& buffer) {
	append(buffer.data(), buffer.size());
}

void AsyncBLECharacteristicWriter::addSubscriber(uint16_t conHandle) {
	std::unique_lock<std::mutex> lock(mutex);

	subscriberHandles.insert(conHandle);
}

void AsyncBLECharacteristicWriter::removeSubscriber(uint16_t conHandle) {
	std::unique_lock<std::mutex> lock(mutex);

	subscriberHandles.erase(conHandle);
}

void AsyncBLECharacteristicWriter::ThreadFunc() {
	std::unique_lock<std::mutex> lock(mutex);

	while (true) {
		conditionVariable.wait(lock, [&] {
			return (!sendQueue.empty()) || threadShouldExit;
		});

		if (threadShouldExit) {
			return;
		}

		if (!sendQueue.empty()) {
			const std::vector<uint8_t> buffer = sendQueue.front();
			sendQueue.pop();

			for (uint16_t conHandle : subscriberHandles) {
				bool sendSuccess = false;

				while (!sendSuccess) {
					os_mbuf* om;

					do {
						om = ble_hs_mbuf_from_flat(buffer.data(), buffer.size());

						if (!om) {
							// wait until BLE send queue get some space
							lock.unlock();
							delay(10);
							lock.lock();
						}
					} while (!om);

					int txRet = ble_gatts_notify_custom(conHandle, pCharacteristic->getHandle(), om);

					if (txRet == 0) {
						sendSuccess = true;
					} else {
						lock.unlock();
						// wait until BLE send queue get some space
						delay(10);
						lock.lock();;
					}
				}
			}
		}
	}
}
