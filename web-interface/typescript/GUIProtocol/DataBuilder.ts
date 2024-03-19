class PacketBuilder {
	static CreatePacketHeader(headByte: GUIClientHeader, requestId: number) {
		return MergeUint8Arrays(PacketBuilder.CreateUInt8(headByte), PacketBuilder.CreateUInt32(requestId));
	}

	static CreateUInt8(number: number) : Uint8Array {
		const data = new Uint8Array(1);
		data[0] = number;
		return data;
	}

	static CreateUInt32(number: number) : Uint8Array {
		const data = new Uint8Array(4);
		new DataView(data.buffer).setUint32(0, number, false);
		return data;
	}

	static CreateLengthPrefixedString(str: string) : Uint8Array {
		const data = EncodeUTF8String(str);
		return MergeUint8Arrays(PacketBuilder.CreateUInt32(data.length), data);
	}

	static CreateDynamicValue(value: ValueWrapper) : Uint8Array {
		const prefix = PacketBuilder.CreateUInt8(value.type);

		switch (value.type) {
			case ValueType.Number:
				return MergeUint8Arrays(prefix, PacketBuilder.CreateUInt32(value.getNumberValue()));
			case ValueType.Boolean:
				return MergeUint8Arrays(prefix, PacketBuilder.CreateUInt8(value.getBooleanValue() ? 1 : 0));
			case ValueType.String:
				return MergeUint8Arrays(prefix, PacketBuilder.CreateLengthPrefixedString(value.getStringValue()));
			case ValueType.RGBWColor:
				const r = PacketBuilder.CreateUInt8(value.getRGBWValue().r);
				const g = PacketBuilder.CreateUInt8(value.getRGBWValue().g);
				const b = PacketBuilder.CreateUInt8(value.getRGBWValue().b);
				const w = PacketBuilder.CreateUInt8(value.getRGBWValue().w);

				return MergeUint8Arrays5(prefix, r, g, b, w);
		}
	}
}
