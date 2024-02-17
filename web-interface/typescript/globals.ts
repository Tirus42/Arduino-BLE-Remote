const PendingCharacteristicPromises = new Map();

const ConnectedDevices : Set<BluetoothDevice> = new Set();

const SERVICE_UUID = "a6a2fc07-815c-4262-97a9-1cef5181a1e4";
const LED_CHARACTERISTICS = new Map<string, string>([
    ["cd7ce55d-019d-4204-ad2e-a4d1464e3840", "Warp"],
    ["45864431-5197-4c89-9c52-30e8ec7ac523", "Impulse"],
    ["e38f4a08-6b53-4826-937d-d62183f02d1b", "Deflector"],
    ["529d6059-5633-4868-84a5-bfdef04296dd", "Bussard"],

    ["1dd3cff4-ee45-452c-a8c6-d3bd3a7986b3", "Mind Stone"],
    ["13e55e6a-1663-4272-ac08-e12617b2c822", "Soul Stone"],
    ["46c628e6-4a1d-48c3-ba76-412eff75ad6f", "Reality Stone"],
    ["269e55e4-0daf-47a9-86cc-ea8a5c680dd5", "Space Stone"],
    ["492a89d2-bcb8-4a3e-9b96-31000df7a3aa", "Power Stone"],
    ["03c7757e-be1c-42ef-9b58-c4be71fd3a7d", "Time Stone"],
]);

const CHARACTERISTIC_MODEL_NAME_UUID = "928ec7e1-b867-4b7d-904b-d3b8769a7299";
const CHARACTERISTIC_LEDINFO_UUID = "013201e4-0873-4377-8bff-9a2389af3883";

