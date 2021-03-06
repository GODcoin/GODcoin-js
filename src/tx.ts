import { Script, ScriptEvalError, ScriptEvalErrorKind } from './script';
import { KeyPair, PublicKey, SigPair, ScriptHash } from './crypto';
import { TypeSerializer, TypeDeserializer } from './serializer';
import { ByteBuffer } from './bytebuffer';
import { Asset } from './asset';
import Long from 'long';

export const MAX_MEMO_BYTE_SIZE = 1024;
export const MAX_TX_SIGNATURES = 8;

export enum TxType {
  OWNER = 0x00,
  MINT = 0x01,
  REWARD = 0x02,
  TRANSFER = 0x03,
}

export type TxVariantV0 = OwnerTxV0 | MintTxV0 | RewardTxV0 | TransferTxV0;

/**
 * This type can expose multiple versions of the transaction API.
 */
export type TxVariantVer = TxVariantV0;

export class TxVariant {
  public readonly tx: TxVariantVer;

  public constructor(tx: TxVariantVer) {
    this.tx = tx;
  }

  public sign(keyPair: KeyPair, append = true): SigPair {
    const buf = this.serialize(undefined, false);
    const sig = keyPair.sign(buf.sharedView());
    if (append) {
      /* istanbul ignore next */
      if (this.tx instanceof TxV0) {
        this.tx.signaturePairs.push(sig);
      } else {
        const _exhaustiveCheck: never = this.tx;
        throw new Error(_exhaustiveCheck);
      }
    }
    return sig;
  }

  public serialize(buf?: ByteBuffer, includeSigs?: boolean): ByteBuffer {
    if (!buf) buf = ByteBuffer.alloc(8192);

    /* istanbul ignore next */
    if (this.tx instanceof TxV0) {
      buf.writeUint16(0x00);
    } else {
      const _exhaustiveCheck: never = this.tx;
      throw new Error(_exhaustiveCheck);
    }

    this.tx.serialize(buf, includeSigs);
    return buf;
  }

  public static deserialize(buf: ByteBuffer): TxVariant {
    const ver = buf.readUint16();
    switch (ver) {
      case 0x00:
        return new TxVariant(TxV0.deserialize(buf));
      default:
        throw new Error('unknown tx version: ' + ver);
    }
  }
}

export interface TxData {
  timestamp: Long; // unsigned 64-bit integer, epoch time in ms
  fee: Asset;
  signaturePairs: SigPair[];
}

export abstract class TxV0 {
  public readonly type: TxType;
  public timestamp: Long;
  public fee: Asset;
  public signaturePairs: SigPair[];

  public constructor(type: TxType, data: TxData) {
    if (!data.timestamp.unsigned) {
      throw new Error('timestamp must be an unsigned long');
    }
    this.type = type;
    this.timestamp = data.timestamp;
    this.fee = data.fee;
    this.signaturePairs = data.signaturePairs;
  }

  public abstract serializeData(buf: ByteBuffer): void;

  public serialize(buf: ByteBuffer, includeSigs = true): void {
    this.serializeHeader(buf);
    this.serializeData(buf);

    if (includeSigs) {
      buf.writeUint8(this.signaturePairs.length);
      for (const sig of this.signaturePairs) {
        TypeSerializer.sigPair(buf, sig);
      }
    }
  }

  public serializeHeader(buf: ByteBuffer): void {
    buf.writeUint8(this.type);
    buf.writeUint64(this.timestamp);
    TypeSerializer.asset(buf, this.fee);
  }

  public static deserialize(buf: ByteBuffer): TxVariantV0 {
    const header = TxV0.deserializeHeader(buf);

    switch (header[0]) {
      case TxType.OWNER: {
        const data = OwnerTxV0.deserializeData(buf);
        header[1].signaturePairs = TxV0.deserializeSigs(buf);
        return new OwnerTxV0(header[1], data);
      }
      case TxType.MINT: {
        const data = MintTxV0.deserializeData(buf);
        header[1].signaturePairs = TxV0.deserializeSigs(buf);
        return new MintTxV0(header[1], data);
      }
      case TxType.REWARD: {
        const data = RewardTxV0.deserializeData(buf);
        header[1].signaturePairs = TxV0.deserializeSigs(buf);
        return new RewardTxV0(header[1], data);
      }
      case TxType.TRANSFER: {
        const data = TransferTxV0.deserializeData(buf);
        header[1].signaturePairs = TxV0.deserializeSigs(buf);
        return new TransferTxV0(header[1], data);
      }
      /* istanbul ignore next */
      default:
        const _exhaustiveCheck: never = header[0];
        throw new Error(_exhaustiveCheck);
    }
  }

  public static deserializeHeader(buf: ByteBuffer): [TxType, TxData] {
    const type = buf.readUint8() as TxType;
    if (!(type in TxType)) throw new Error('unknown tx type deserializing header: ' + type);

    const timestamp = buf.readUint64();
    const fee = TypeDeserializer.asset(buf);
    const signaturePairs: SigPair[] = [];

    return [type, { timestamp, fee, signaturePairs }];
  }

  private static deserializeSigs(buf: ByteBuffer): SigPair[] {
    const sigLen = buf.readUint8();
    const sigs = [];
    for (let i = 0; i < sigLen; ++i) {
      sigs.push(TypeDeserializer.sigPair(buf));
    }
    return sigs;
  }
}

export interface OwnerTxData {
  minter: PublicKey; // Key that signs blocks
  wallet: ScriptHash; // Hot wallet that receives rewards
  script: Script; // Hot wallet previous script
}

export class OwnerTxV0 extends TxV0 implements OwnerTxData {
  public minter: PublicKey;
  public wallet: ScriptHash;
  public script: Script;

  public constructor(base: TxData, data: OwnerTxData) {
    super(TxType.OWNER, base);
    this.minter = data.minter;
    this.wallet = data.wallet;
    this.script = data.script;
  }

  public serializeData(buf: ByteBuffer): void {
    TypeSerializer.publicKey(buf, this.minter);
    TypeSerializer.digest(buf, this.wallet.bytes);
    TypeSerializer.script(buf, this.script);
  }

  public static deserializeData(buf: ByteBuffer): OwnerTxData {
    const minter = TypeDeserializer.publicKey(buf);
    const wallet = new ScriptHash(TypeDeserializer.digest(buf));
    const script = TypeDeserializer.script(buf);

    return {
      minter,
      wallet,
      script,
    };
  }
}

export interface MintTxData {
  to: ScriptHash;
  amount: Asset;
  attachment: Uint8Array;
  attachmentName: string;
  script: Script;
}

export class MintTxV0 extends TxV0 implements MintTxData {
  public to: ScriptHash;
  public amount: Asset;
  public attachment: Uint8Array;
  public attachmentName: string;
  public script: Script;

  public constructor(base: TxData, data: MintTxData) {
    super(TxType.MINT, base);
    this.to = data.to;
    this.amount = data.amount;
    this.attachment = data.attachment;
    this.attachmentName = data.attachmentName;
    this.script = data.script;
  }

  public serializeData(buf: ByteBuffer): void {
    TypeSerializer.digest(buf, this.to.bytes);
    TypeSerializer.asset(buf, this.amount);
    TypeSerializer.buffer(buf, this.attachment);
    TypeSerializer.string(buf, this.attachmentName);
    TypeSerializer.script(buf, this.script);
  }

  public static deserializeData(buf: ByteBuffer): MintTxData {
    const to = new ScriptHash(TypeDeserializer.digest(buf));
    const amount = TypeDeserializer.asset(buf);
    const attachment = TypeDeserializer.buffer(buf);
    const attachmentName = TypeDeserializer.string(buf);
    const script = TypeDeserializer.script(buf);

    return {
      to,
      amount,
      attachment,
      attachmentName,
      script,
    };
  }
}

export interface RewardTxData {
  to: ScriptHash;
  rewards: Asset;
}

export class RewardTxV0 extends TxV0 implements RewardTxData {
  public to: ScriptHash;
  public rewards: Asset;

  public constructor(base: TxData, data: RewardTxData) {
    super(TxType.REWARD, base);
    this.to = data.to;
    this.rewards = data.rewards;
  }

  public serializeData(buf: ByteBuffer): void {
    TypeSerializer.digest(buf, this.to.bytes);
    TypeSerializer.asset(buf, this.rewards);
  }

  public static deserializeData(buf: ByteBuffer): RewardTxData {
    const to = new ScriptHash(TypeDeserializer.digest(buf));
    const rewards = TypeDeserializer.asset(buf);

    return {
      to,
      rewards,
    };
  }
}

export interface TransferTxData {
  from: ScriptHash;
  to: ScriptHash;
  script: Script;
  amount: Asset;
  memo: Uint8Array;
}

export class TransferTxV0 extends TxV0 implements TransferTxData {
  public from: ScriptHash;
  public to: ScriptHash;
  public script: Script;
  public amount: Asset;
  public memo: Uint8Array;

  public constructor(base: TxData, data: TransferTxData) {
    super(TxType.TRANSFER, base);
    this.from = data.from;
    this.to = data.to;
    this.script = data.script;
    this.amount = data.amount;
    this.memo = data.memo;
  }

  public serializeData(buf: ByteBuffer): void {
    TypeSerializer.digest(buf, this.from.bytes);
    TypeSerializer.digest(buf, this.to.bytes);
    TypeSerializer.script(buf, this.script);
    TypeSerializer.asset(buf, this.amount);
    TypeSerializer.buffer(buf, this.memo);
  }

  public static deserializeData(buf: ByteBuffer): TransferTxData {
    const from = new ScriptHash(TypeDeserializer.digest(buf));
    const to = new ScriptHash(TypeDeserializer.digest(buf));
    const script = TypeDeserializer.script(buf);
    const amount = TypeDeserializer.asset(buf);
    const memo = TypeDeserializer.buffer(buf);

    return {
      from,
      to,
      script,
      amount,
      memo,
    };
  }
}

export enum TxVerifyErrorKind {
  ScriptEval = 0x00,
  ScriptHashMismatch = 0x01,
  ScriptRetFalse = 0x02,
  Arithmetic = 0x03,
  InsufficientBalance = 0x04,
  InvalidFeeAmount = 0x05,
  TooManySignatures = 0x06,
  TxTooLarge = 0x07,
  TxProhibited = 0x08,
  TxExpired = 0x09,
  TxDupe = 0x0a,
}

export class TxVerifyError extends Error {
  public kind: TxVerifyErrorKind;
  public meta?: Error;

  public constructor(kind: TxVerifyErrorKind, meta?: Error) {
    super();
    Object.setPrototypeOf(this, TxVerifyError.prototype);
    this.kind = kind;
    /* istanbul ignore next */
    switch (this.kind) {
      case TxVerifyErrorKind.ScriptEval:
        if (!(meta instanceof ScriptEvalError)) throw new Error('invalid error type for ScriptEvalError');
        this.meta = meta;
        this.message = 'script eval: ' + this.meta.message;
        break;
      case TxVerifyErrorKind.ScriptHashMismatch:
        this.message = 'script hash mismatch';
        break;
      case TxVerifyErrorKind.ScriptRetFalse:
        this.message = 'script returned false';
        break;
      case TxVerifyErrorKind.Arithmetic:
        this.message = 'arithmetic error';
        break;
      case TxVerifyErrorKind.InsufficientBalance:
        this.message = 'insufficient balance';
        break;
      case TxVerifyErrorKind.InvalidFeeAmount:
        this.message = 'invalid fee amount';
        break;
      case TxVerifyErrorKind.TooManySignatures:
        this.message = 'too many signatures';
        break;
      case TxVerifyErrorKind.TxTooLarge:
        this.message = 'tx too large';
        break;
      case TxVerifyErrorKind.TxProhibited:
        this.message = 'tx prohibited';
        break;
      case TxVerifyErrorKind.TxExpired:
        this.message = 'tx expired';
        break;
      case TxVerifyErrorKind.TxDupe:
        this.message = 'tx dupe';
        break;
      default:
        const _exhaustiveCheck: never = this.kind;
        throw new Error(_exhaustiveCheck);
    }
  }

  public serialize(buf: ByteBuffer): void {
    buf.writeUint8(this.kind);
    if (this.kind === TxVerifyErrorKind.ScriptEval) {
      const err = this.meta as ScriptEvalError;
      buf.writeUint32(err.position);
      buf.writeUint8(err.kind);
    }
  }

  public static deserialize(buf: ByteBuffer): TxVerifyError {
    const kind = buf.readUint8() as TxVerifyErrorKind;
    if (!(kind in TxVerifyErrorKind)) throw new Error('invalid tx error kind');
    let meta: Error | undefined;
    if (kind === TxVerifyErrorKind.ScriptEval) {
      const pos = buf.readUint32();
      const evalErrKind = buf.readUint8() as ScriptEvalErrorKind;
      if (!(evalErrKind in ScriptEvalErrorKind)) throw new Error('invalid script eval error kind');
      meta = new ScriptEvalError(evalErrKind, pos);
    }
    return new TxVerifyError(kind, meta);
  }
}
