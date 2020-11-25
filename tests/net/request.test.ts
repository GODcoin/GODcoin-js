import { generateKeyPair, ByteBuffer, TxVariant, BodyType, MintTxV0, Asset, Msg, RpcType } from '../../src';
import Long from 'long';

test('fail to deserialize invalid request type id', (): void => {
  const buf = ByteBuffer.alloc(128).writeUint32(0).writeUint8(BodyType.Request).writeUint8(0xff).resetOffset();
  expect((): void => {
    Msg.deserialize(buf);
  }).toThrowError('unknown request id: 255');
});

test('serialize broadcast request', (): void => {
  const tx = new TxVariant(
    new MintTxV0(
      {
        timestamp: Long.fromNumber(12345, true),
        fee: Asset.fromString('1.00000 GRAEL'),
        signaturePairs: [],
      },
      {
        to: generateKeyPair().publicKey.toScript().hash(),
        amount: Asset.fromString('100.00000 GRAEL'),
        attachment: new Uint8Array([1, 2, 3, 4]),
        attachmentName: 'hello_world.txt',
        script: generateKeyPair().publicKey.toScript(),
      },
    ),
  );
  tx.sign(generateKeyPair());
  tx.sign(generateKeyPair());

  const req = new Msg(123, {
    type: BodyType.Request,
    req: {
      type: RpcType.Broadcast,
      tx,
    },
  });
  const buf = ByteBuffer.alloc(4096);
  req.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(req);
});

test('serialize set block filter request', (): void => {
  const addrs = [];
  for (let i = 0; i < 10; ++i) {
    const key = generateKeyPair();
    addrs.push(key.publicKey.toScript().hash());
  }

  const req = new Msg(123, {
    type: BodyType.Request,
    req: {
      type: RpcType.SetBlockFilter,
      addrs,
    },
  });

  const buf = ByteBuffer.alloc(4096);
  req.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(req);
});

test('serialize set block filter request with no addresses', (): void => {
  const req = new Msg(0, {
    type: BodyType.Request,
    req: {
      type: RpcType.SetBlockFilter,
      addrs: undefined,
    },
  });

  const buf = ByteBuffer.alloc(4096);
  req.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(req);
});

test('serialize clear block filter request', (): void => {
  const req = new Msg(0, {
    type: BodyType.Request,
    req: {
      type: RpcType.ClearBlockFilter,
    },
  });

  const buf = ByteBuffer.alloc(4096);
  req.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(req);
});

test('serialize subscribe request', (): void => {
  const req = new Msg(0, {
    type: BodyType.Request,
    req: {
      type: RpcType.Subscribe,
    },
  });

  const buf = ByteBuffer.alloc(4096);
  req.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(req);
});

test('serialize unsubscribe request', (): void => {
  const req = new Msg(0, {
    type: BodyType.Request,
    req: {
      type: RpcType.Unsubscribe,
    },
  });

  const buf = ByteBuffer.alloc(4096);
  req.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(req);
});

test('serialize get properties request', (): void => {
  const req = new Msg(0, {
    type: BodyType.Request,
    req: {
      type: RpcType.GetProperties,
    },
  });

  const buf = ByteBuffer.alloc(4096);
  req.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(req);
});

test('serialize get block request', (): void => {
  const req = new Msg(0, {
    type: BodyType.Request,
    req: {
      type: RpcType.GetBlock,
      height: Long.fromNumber(123, true),
    },
  });

  const buf = ByteBuffer.alloc(4096);
  req.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(req);
});

test('serialize get full block request', (): void => {
  const req = new Msg(0, {
    type: BodyType.Request,
    req: {
      type: RpcType.GetFullBlock,
      height: Long.fromNumber(123, true),
    },
  });

  const buf = ByteBuffer.alloc(4096);
  req.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(req);
});

test('serialize get block range request', (): void => {
  const req = new Msg(0, {
    type: BodyType.Request,
    req: {
      type: RpcType.GetBlockRange,
      minHeight: Long.fromNumber(123, true),
      maxHeight: Long.fromNumber(456, true),
    },
  });

  const buf = ByteBuffer.alloc(4096);
  req.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(req);
});

test('serialize get address info request', (): void => {
  const req = new Msg(0, {
    type: BodyType.Request,
    req: {
      type: RpcType.GetAddressInfo,
      addr: generateKeyPair().publicKey.toScript().hash(),
    },
  });

  const buf = ByteBuffer.alloc(4096);
  req.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(req);
});
