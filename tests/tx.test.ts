import {
  OwnerTxV0,
  ByteBuffer,
  MintTxV0,
  RewardTxV0,
  TransferTxV0,
  Asset,
  generateKeyPair,
  TxVariant,
  TxVerifyError,
  TxVerifyErrorKind,
  ScriptEvalError,
  ScriptEvalErrorKind,
} from '../src';
import { sign } from 'tweetnacl';
import Long from 'long';

test('serialize owner tx v0', (): void => {
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

  const buf = tx.serialize().resetOffset();
  const decTx = TxVariant.deserialize(buf);
  expect(decTx).toEqual(tx);
});

test('serialize mint tx v0', (): void => {
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

  const buf = tx.serialize().resetOffset();
  const decTx = TxVariant.deserialize(buf);
  expect(decTx).toEqual(tx);
});

test('serialize mint tx v0 with empty attachment name', (): void => {
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
        attachmentName: '',
        script: generateKeyPair().publicKey.toScript(),
      },
    ),
  );

  tx.sign(generateKeyPair());
  tx.sign(generateKeyPair());

  const buf = tx.serialize().resetOffset();
  const decTx = TxVariant.deserialize(buf);
  expect(decTx).toEqual(tx);
});

test('serialize reward tx v0', (): void => {
  const tx = new TxVariant(
    new RewardTxV0(
      {
        timestamp: Long.fromNumber(12345, true),
        fee: Asset.fromString('1.00000 GRAEL'),
        signaturePairs: [],
      },
      {
        to: generateKeyPair().publicKey.toScript().hash(),
        rewards: Asset.fromString('123.45678 GRAEL'),
      },
    ),
  );

  const buf = tx.serialize().resetOffset();
  const decTx = TxVariant.deserialize(buf);
  expect(decTx).toEqual(tx);
});

test('serialize transfer tx v0', (): void => {
  const tx = new TxVariant(
    new TransferTxV0(
      {
        timestamp: Long.fromNumber(12345, true),
        fee: Asset.fromString('1.00000 GRAEL'),
        signaturePairs: [],
      },
      {
        from: generateKeyPair().publicKey.toScript().hash(),
        to: generateKeyPair().publicKey.toScript().hash(),
        amount: Asset.fromString('100000.00000 GRAEL'),
        script: generateKeyPair().publicKey.toScript(),
        memo: new Uint8Array([0x00, 0x10, 0x20, 0x30, 0x50, 0xaa, 0xff]),
      },
    ),
  );

  const buf = tx.serialize().resetOffset();
  const decTx = TxVariant.deserialize(buf);
  expect(decTx).toEqual(tx);
});

test('serialize transfer tx v0 with custom buffer', (): void => {
  const tx = new TxVariant(
    new TransferTxV0(
      {
        timestamp: Long.fromNumber(12345, true),
        fee: Asset.fromString('1.00000 GRAEL'),
        signaturePairs: [],
      },
      {
        from: generateKeyPair().publicKey.toScript().hash(),
        to: generateKeyPair().publicKey.toScript().hash(),
        amount: Asset.fromString('100000.00000 GRAEL'),
        script: generateKeyPair().publicKey.toScript(),
        memo: new Uint8Array([0x00, 0x10, 0x20, 0x30, 0x50, 0xaa, 0xff]),
      },
    ),
  );

  const buf = ByteBuffer.alloc(0);
  tx.serialize(buf);
  buf.offset = 0;
  const decTx = TxVariant.deserialize(buf);
  expect(decTx).toEqual(tx);
});

test('serialize transfer tx v0 with empty memo', (): void => {
  const tx = new TxVariant(
    new TransferTxV0(
      {
        timestamp: Long.fromNumber(12345, true),
        fee: Asset.fromString('1.00000 GRAEL'),
        signaturePairs: [],
      },
      {
        from: generateKeyPair().publicKey.toScript().hash(),
        to: generateKeyPair().publicKey.toScript().hash(),
        amount: Asset.fromString('100000.00000 GRAEL'),
        script: generateKeyPair().publicKey.toScript(),
        memo: new Uint8Array(0),
      },
    ),
  );

  const buf = tx.serialize().resetOffset();
  const decTx = TxVariant.deserialize(buf);
  expect(decTx).toEqual(tx);
});

test('sign and verify transfer tx v0', (): void => {
  const tx = new TxVariant(
    new TransferTxV0(
      {
        timestamp: Long.fromNumber(12345, true),
        fee: Asset.fromString('1.00000 GRAEL'),
        signaturePairs: [],
      },
      {
        from: generateKeyPair().publicKey.toScript().hash(),
        to: generateKeyPair().publicKey.toScript().hash(),
        amount: Asset.fromString('100000.00000 GRAEL'),
        script: generateKeyPair().publicKey.toScript(),
        memo: new Uint8Array([0x00, 0x10, 0x20, 0x30, 0x50, 0xaa, 0xff]),
      },
    ),
  );

  const keyPair = generateKeyPair();
  const sig = tx.sign(keyPair, false);

  const buf = tx.serialize(undefined, false).sharedView();
  expect(sign.detached.verify(buf, sig.signature, sig.publicKey.buffer)).toBe(true);
  expect(sig.publicKey.buffer).toEqual(keyPair.publicKey.buffer);
});

test('fail to create tx with signed timestamp', (): void => {
  expect((): void => {
    const minter = generateKeyPair();
    const wallet = generateKeyPair();
    new TxVariant(
      new OwnerTxV0(
        {
          timestamp: Long.fromNumber(12345, false),
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
  }).toThrowError('timestamp must be an unsigned long');
});

test('fail to deserialize unknown tx version', (): void => {
  expect((): void => {
    TxVariant.deserialize(ByteBuffer.from(new Uint8Array([0xff, 0xff])));
  }).toThrowError('unknown tx version: ' + 0xffff);
});

test('fail to deserialize unknown tx type', (): void => {
  expect((): void => {
    TxVariant.deserialize(ByteBuffer.from(new Uint8Array([0x00, 0x00, 0xff])));
  }).toThrowError('unknown tx type deserializing header: ' + 0xff);
});

test('tx script eval error message', (): void => {
  const err = new TxVerifyError(
    TxVerifyErrorKind.ScriptEval,
    new ScriptEvalError(ScriptEvalErrorKind.StackUnderflow, 10),
  );
  expect(err.message).toBe('script eval: stack underflow (pos: 10)');
});

test('tx script eval error requires meta', (): void => {
  expect((): void => {
    new TxVerifyError(TxVerifyErrorKind.ScriptEval);
  }).toThrowError('invalid error type for ScriptEvalError');
});
