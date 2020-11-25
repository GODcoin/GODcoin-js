import {
  generateKeyPair,
  ByteBuffer,
  TxVariant,
  BodyType,
  Asset,
  OwnerTxV0,
  Block,
  BlockV0,
  BlockHeaderV0,
  doubleSha256,
  BlockHeader,
  Msg,
  RpcType,
} from '../../src';
import Long from 'long';

test('fail to deserialize invalid response type id', (): void => {
  const buf = ByteBuffer.alloc(128).writeUint32(0).writeUint8(BodyType.Response).writeUint8(0xff).resetOffset();
  expect((): void => {
    Msg.deserialize(buf);
  }).toThrowError('unknown response id: 255');
});

test('serialize broadcast response', (): void => {
  const res = new Msg(0, {
    type: BodyType.Response,
    res: {
      type: RpcType.Broadcast,
    },
  });
  const buf = ByteBuffer.alloc(128);
  res.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(res);
});

test('serialize set block filter response', (): void => {
  const res = new Msg(0, {
    type: BodyType.Response,
    res: {
      type: RpcType.SetBlockFilter,
    },
  });
  const buf = ByteBuffer.alloc(128);
  res.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(res);
});

test('serialize clear block filter response', (): void => {
  const res = new Msg(12345, {
    type: BodyType.Response,
    res: {
      type: RpcType.ClearBlockFilter,
    },
  });
  const buf = ByteBuffer.alloc(128);
  res.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(res);
});

test('serialize subscribe response', (): void => {
  const res = new Msg(0, {
    type: BodyType.Response,
    res: {
      type: RpcType.Subscribe,
    },
  });
  const buf = ByteBuffer.alloc(128);
  res.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(res);
});

test('serialize unsubscribe response', (): void => {
  const res = new Msg(0, {
    type: BodyType.Response,
    res: {
      type: RpcType.Unsubscribe,
    },
  });
  const buf = ByteBuffer.alloc(128);
  res.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(res);
});

test('serialize get properties response', (): void => {
  const minter = generateKeyPair();
  const wallet = generateKeyPair();

  const owner = new TxVariant(
    new OwnerTxV0(
      {
        timestamp: Long.fromNumber(12345, true),
        fee: Asset.fromString('1.00000 GRAEL'),
        signaturePairs: [],
      },
      {
        minter: minter.publicKey,
        wallet: wallet.publicKey.toScript().hash(),
        script: wallet.publicKey.toScript(),
      },
    ),
  );

  owner.sign(wallet);
  owner.sign(minter);

  const res = new Msg(0, {
    type: BodyType.Response,
    res: {
      type: RpcType.GetProperties,
      properties: {
        height: Long.fromNumber(123, true),
        owner,
        networkFee: Asset.fromString('1.12345 GRAEL'),
        tokenSupply: Asset.fromString('123456.00000 GRAEL'),
      },
    },
  });

  const buf = ByteBuffer.alloc(128);
  res.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(res);
});

test('serialize get block response', (): void => {
  const minter = generateKeyPair();
  const wallet = generateKeyPair();

  const tx = new TxVariant(
    new OwnerTxV0(
      {
        timestamp: Long.fromNumber(12345, true),
        fee: Asset.fromString('1.00000 GRAEL'),
        signaturePairs: [],
      },
      {
        minter: minter.publicKey,
        wallet: wallet.publicKey.toScript().hash(),
        script: wallet.publicKey.toScript(),
      },
    ),
  );

  tx.sign(wallet);
  tx.sign(minter);

  const block = new Block(
    new BlockV0(
      new BlockHeaderV0({
        timestamp: Long.fromNumber(12345, true),
        height: Long.fromNumber(12345, true),
        previousHash: doubleSha256(new Uint8Array([1, 2, 3])),
        txMerkleRoot: doubleSha256(new Uint8Array([4, 5, 6])),
      }),
      {
        signer: undefined,
        transactions: [tx],
      },
    ),
  );
  block.sign(minter);

  const res = new Msg(1, {
    type: BodyType.Response,
    res: {
      type: RpcType.GetBlock,
      block,
    },
  });

  const buf = ByteBuffer.alloc(4096);
  res.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(res);
});

test('serialize get block filtered response', (): void => {
  const minter = generateKeyPair();
  const wallet = generateKeyPair();

  const tx = new TxVariant(
    new OwnerTxV0(
      {
        timestamp: Long.fromNumber(12345, true),
        fee: Asset.fromString('1.00000 GRAEL'),
        signaturePairs: [],
      },
      {
        minter: minter.publicKey,
        wallet: wallet.publicKey.toScript().hash(),
        script: wallet.publicKey.toScript(),
      },
    ),
  );

  tx.sign(wallet);
  tx.sign(minter);

  const header = new BlockHeader(
    new BlockHeaderV0({
      timestamp: Long.fromNumber(12345, true),
      height: Long.fromNumber(12345, true),
      previousHash: doubleSha256(new Uint8Array([1, 2, 3])),
      txMerkleRoot: doubleSha256(new Uint8Array([4, 5, 6])),
    }),
  );
  const signer = minter.sign(header.calcHash());

  const res = new Msg(1, {
    type: BodyType.Response,
    res: {
      type: RpcType.GetBlock,
      block: [header, signer],
    },
  });

  const buf = ByteBuffer.alloc(4096);
  res.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(res);
});

test('serialize get full block response', (): void => {
  const minter = generateKeyPair();
  const wallet = generateKeyPair();

  const tx = new TxVariant(
    new OwnerTxV0(
      {
        timestamp: Long.fromNumber(12345, true),
        fee: Asset.fromString('1.00000 GRAEL'),
        signaturePairs: [],
      },
      {
        minter: minter.publicKey,
        wallet: wallet.publicKey.toScript().hash(),
        script: wallet.publicKey.toScript(),
      },
    ),
  );

  tx.sign(wallet);
  tx.sign(minter);

  const block = new Block(
    new BlockV0(
      new BlockHeaderV0({
        timestamp: Long.fromNumber(12345, true),
        height: Long.fromNumber(12345, true),
        previousHash: doubleSha256(new Uint8Array([1, 2, 3])),
        txMerkleRoot: doubleSha256(new Uint8Array([4, 5, 6])),
      }),
      {
        signer: undefined,
        transactions: [tx],
      },
    ),
  );
  block.sign(minter);

  const res = new Msg(1, {
    type: BodyType.Response,
    res: {
      type: RpcType.GetFullBlock,
      block,
    },
  });

  const buf = ByteBuffer.alloc(4096);
  res.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(res);
});

test('serialize get block range response', (): void => {
  const res = new Msg(0, {
    type: BodyType.Response,
    res: {
      type: RpcType.GetBlockRange,
    },
  });
  const buf = ByteBuffer.alloc(128);
  res.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(res);
});

test('serialize get address info response', (): void => {
  const res = new Msg(2, {
    type: BodyType.Response,
    res: {
      type: RpcType.GetAddressInfo,
      info: {
        netFee: Asset.fromString('1.00000 GRAEL'),
        addrFee: Asset.fromString('0.00010 GRAEL'),
        balance: Asset.fromString('100000000.00000 GRAEL'),
      },
    },
  });

  const buf = ByteBuffer.alloc(4096);
  res.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(res);
});
